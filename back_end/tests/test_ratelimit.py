"""요청 제한 코어 — 저장소 자체의 동작과 호출자 식별."""

import pytest
from fastapi import HTTPException, Request

from app.core.config import settings
from app.core.ratelimit import (
    InMemoryFixedWindowStore,
    Rule,
    client_ip,
)

RULE = Rule(limit=3, window=60)


def make_request(client_host: str | None, forwarded: str | None = None) -> Request:
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    scope = {
        "type": "http",
        "headers": headers,
        "client": (client_host, 12345) if client_host else None,
    }
    return Request(scope)


# ─────────────── 고정 윈도우 카운터 ───────────────
def test_hit_allows_up_to_limit():
    store = InMemoryFixedWindowStore()
    for _ in range(RULE.limit):
        assert store.hit("k", RULE) is None


def test_peek_blocks_once_limit_reached():
    store = InMemoryFixedWindowStore()
    for _ in range(RULE.limit):
        store.hit("k", RULE)
    retry_after = store.peek("k", RULE)
    assert retry_after is not None
    assert 0 < retry_after <= RULE.window + 1


def test_peek_does_not_count():
    """peek이 카운터를 올리면 차단된 뒤 계속 두들기는 것만으로 영영 안 풀린다."""
    store = InMemoryFixedWindowStore()
    for _ in range(100):
        assert store.peek("k", RULE) is None
    assert store.hit("k", RULE) is None


def test_keys_are_independent():
    store = InMemoryFixedWindowStore()
    for _ in range(RULE.limit):
        store.hit("a", RULE)
    assert store.peek("a", RULE) is not None
    assert store.peek("b", RULE) is None


def test_clear_releases_key():
    store = InMemoryFixedWindowStore()
    for _ in range(RULE.limit):
        store.hit("k", RULE)
    store.clear("k")
    assert store.peek("k", RULE) is None


def test_window_expiry_releases_key():
    store = InMemoryFixedWindowStore()
    zero_window = Rule(limit=1, window=0)
    store.hit("k", zero_window)
    assert store.peek("k", zero_window) is None


def test_expired_entries_are_swept():
    """만료 항목을 안 지우면 키가 다양할수록 메모리가 계속 자란다."""
    store = InMemoryFixedWindowStore()
    expiring = Rule(limit=1, window=0)
    for i in range(InMemoryFixedWindowStore._SWEEP_EVERY + 1):
        store.hit(f"k{i}", expiring)
    assert len(store._counters) < InMemoryFixedWindowStore._SWEEP_EVERY


# ─────────────── SET NX EX 대응 ───────────────
def test_mark_once_is_true_only_the_first_time():
    store = InMemoryFixedWindowStore()
    assert store.mark_once("visit", 60) is True
    assert store.mark_once("visit", 60) is False


def test_mark_once_true_again_after_ttl():
    store = InMemoryFixedWindowStore()
    assert store.mark_once("visit", 0) is True
    assert store.mark_once("visit", 0) is True


# ─────────────── 호출자 식별 ───────────────
def test_client_ip_ignores_forwarded_header_without_proxy(monkeypatch):
    """프록시가 없으면 X-Forwarded-For는 순수 사용자 입력이라 믿으면 안 된다."""
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 0)
    request = make_request("10.0.0.1", forwarded="1.2.3.4")
    assert client_ip(request) == "10.0.0.1"


def test_client_ip_takes_rightmost_hop_behind_proxy(monkeypatch):
    """공격자가 앞에 위조 값을 넣어도 프록시가 붙인 오른쪽 값을 쓴다."""
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 1)
    request = make_request("10.0.0.1", forwarded="1.2.3.4, 203.0.113.9")
    assert client_ip(request) == "203.0.113.9"


def test_client_ip_falls_back_when_header_missing(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 1)
    request = make_request("10.0.0.1")
    assert client_ip(request) == "10.0.0.1"


def test_client_ip_without_client_info(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 0)
    assert client_ip(make_request(None)) == "unknown"


# ─────────────── 429 응답 규약 ───────────────
def test_guard_raises_429_with_retry_after(monkeypatch):
    from app.core import ratelimit

    store = InMemoryFixedWindowStore()
    monkeypatch.setattr(ratelimit, "store", store)
    for _ in range(RULE.limit):
        ratelimit.record("k", RULE)
    with pytest.raises(HTTPException) as exc:
        ratelimit.guard("k", RULE)
    # 403이 아니라 429여야 한다. 403은 영구적 거부라 클라이언트가 재시도하지 않는다.
    assert exc.value.status_code == 429
    assert int(exc.value.headers["Retry-After"]) >= 1
