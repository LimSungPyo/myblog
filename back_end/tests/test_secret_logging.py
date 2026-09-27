"""외부 서비스 연결 오류를 로그에 남길 때 비밀 키가 섞여 나가지 않는지.

실제로 겪은 일: Render에 넣은 Supabase 비밀 키 중간에 줄바꿈이 섞였고, httpx가
"Illegal header value b'<키>'" 오류를 냈다. 그 오류 메시지를 그대로 로그에 적어서
비밀 키가 Render 로그에 통째로 찍혔다. 헤더에 키를 싣는 곳은 모두 같은 위험이 있다.
"""

import logging

import httpx
import pytest

from app.core import mailer
from app.core import storage as storage_module
from app.core.config import settings
from app.core.oauth import OAuthProvider
from app.core.security import create_state_token
from app.core.storage import StorageError, SupabaseImageStorage

LEAKY_KEY = "sb_secret_LEAKED\nFRAGMENT_9f3a"


def header_error(*args, **kwargs):
    # httpx가 실제로 내는 것과 같은 모양: 오류 메시지 안에 헤더 값이 그대로 들어 있다
    raise httpx.LocalProtocolError(f"Illegal header value {LEAKY_KEY.encode()!r}")


def assert_no_secret(text: str):
    assert "LEAKED" not in text
    assert "FRAGMENT_9f3a" not in text


def test_storage_upload_error_does_not_log_the_key(monkeypatch, caplog):
    monkeypatch.setattr(storage_module.httpx, "post", header_error)
    supa = SupabaseImageStorage("https://p.supabase.co", LEAKY_KEY, "b")
    with caplog.at_level(logging.ERROR), pytest.raises(StorageError):
        supa.save("k.webp", b"d", "image/webp")
    assert_no_secret(caplog.text)
    # 대신 무엇이 문제인지는 알 수 있어야 한다
    assert "LocalProtocolError" in caplog.text


def test_storage_delete_error_does_not_log_the_key(monkeypatch, caplog):
    monkeypatch.setattr(storage_module.httpx, "delete", header_error)
    supa = SupabaseImageStorage("https://p.supabase.co", LEAKY_KEY, "b")
    with caplog.at_level(logging.ERROR), pytest.raises(StorageError):
        supa.delete("k.webp")
    assert_no_secret(caplog.text)
    assert "LocalProtocolError" in caplog.text


def test_mail_error_does_not_log_the_key(monkeypatch, caplog):
    monkeypatch.setattr(settings, "BREVO_API_KEY", LEAKY_KEY)
    monkeypatch.setattr(mailer.httpx, "post", header_error)
    with caplog.at_level(logging.ERROR):
        mailer.send_email("to@example.com", "제목", "본문")
    assert_no_secret(caplog.text)
    assert "LocalProtocolError" in caplog.text


def test_oauth_error_does_not_log_the_token(client, monkeypatch, caplog):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "secret")
    monkeypatch.setattr(OAuthProvider, "fetch_user_info", header_error)
    state = create_state_token("/")
    with caplog.at_level(logging.ERROR):
        r = client.get(
            f"/auth/google/callback?code=abc&state={state}", follow_redirects=False
        )
    assert r.status_code == 302
    assert_no_secret(caplog.text)
    assert "LocalProtocolError" in caplog.text
