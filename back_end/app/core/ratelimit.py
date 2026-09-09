"""요청 제한(rate limit) — 고정 윈도우 + 인메모리 카운터.

## 왜 필요한가

지금 백엔드에는 호출 횟수를 세는 코드가 하나도 없어서 세 곳이 열려 있다.

| 엔드포인트           | 공격자의 목적          | 보호 대상        |
|----------------------|------------------------|------------------|
| `POST /posts/{slug}/view` | 조회수 조작       | 데이터 무결성    |
| 비밀번호 재설정 메일      | 메일 폭격, 한도 소진 | 유한한 외부 자원 |
| 로그인                    | 비밀번호 대입      | 인증 경계        |

셋 다 코드는 `카운터[키] += 1` 한 줄로 같고, **키에 뭘 넣느냐가 정책의 전부**다.
그래서 알고리즘이 아니라 키를 만드는 쪽에 이름을 붙여 뒀다(`Rule`, `guard`, `record`).

## 왜 인메모리부터인가

카운터는 프로세스 밖에 있어야 정확하고(Redis), 그게 이 문제의 표준 답이다.
그런데도 딕셔너리로 시작하는 이유는 지금 배포 형태가 그걸 허용하기 때문이다.
Dockerfile의 uvicorn은 워커 1개로 뜨고 Render 인스턴스도 1대라, 카운터가 쪼개져
제한이 배수로 헐거워지는 문제(딕셔너리 방식의 가장 큰 결함)가 아직 없다.

대신 남는 결함은 둘이고, 알고 감수한다.

1. **재시작하면 초기화된다.** Render 무료 플랜은 15분 유휴면 슬립하고, 배포할 때도
   프로세스가 새로 뜬다. 카운터가 날아가면 그 순간 제한이 리셋된다.
2. **워커를 늘리는 순간 깨진다.** `--workers 2`면 딕셔너리도 2개가 되고 제한이 2배로
   헐거워진다. 그래서 워커를 늘릴 거면 그 전에 저장소부터 Redis로 옮겨야 한다.

나머지 둘(메모리 누수·원자성)은 여기서 막아 뒀다. 만료된 항목은 주기적으로 쓸어내고,
읽고-고치고-쓰기는 락으로 감쌌다. 락이 필요한 이유는 GIL이 있어도 `async` 함수의
`await` 지점에서 컨텍스트가 넘어가면 읽기와 쓰기 사이가 갈라지기 때문이다.

옮길 때를 대비해 저장소는 `RateLimitStore` 프로토콜 뒤에 숨겨 놨다. Redis로 갈아끼울 때
호출하는 쪽 코드는 손대지 않아도 된다.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Protocol

from fastapi import HTTPException, Request, status

from app.core.config import settings


@dataclass(frozen=True)
class Rule:
    """`window`초 동안 `limit`회까지 허용."""

    limit: int
    window: int


# ── 기본 정책 ────────────────────────────────────────────────────────────
# 한 엔드포인트에 여러 축을 동시에 거는 이유: 한 축만 걸면 항상 우회로가 남는다.
# IP만 걸면 IP를 돌려서 빠져나가고, 계정만 걸면 로그인 자체는 못 막는다.

# 로그인 — 실패했을 때만 센다. 성공하면 계정 축 카운터는 지운다.
LOGIN_BY_IDENTITY = Rule(limit=5, window=10 * 60)
LOGIN_BY_IP = Rule(limit=20, window=10 * 60)


class RateLimitStore(Protocol):
    """카운터 저장소. 인메모리 → Redis 교체 지점."""

    def peek(self, key: str, rule: Rule) -> int | None:
        """이미 한도를 넘었으면 남은 대기 초, 아니면 None. 카운터를 올리지 않는다."""

    def hit(self, key: str, rule: Rule) -> int | None:
        """카운터를 1 올리고, 그 결과 한도를 넘었으면 남은 대기 초를 반환."""

    def clear(self, key: str) -> None:
        """카운터 삭제."""

    def mark_once(self, key: str, ttl: int) -> bool:
        """처음 보는 키면 True(그리고 ttl초 동안 기억), 이미 봤으면 False.

        Redis의 `SET key 1 NX EX ttl`과 같은 의미다. 검사와 기록이 한 동작이라
        "이 방문을 이미 셌나"를 경쟁 상태 없이 물을 수 있다.
        """


class InMemoryFixedWindowStore:
    """프로세스 메모리에 두는 고정 윈도우 카운터.

    윈도우의 시작점을 시계(`14:06:00`)가 아니라 **그 키의 첫 요청 시점**에 둔다.
    시계에 맞추면 만료된 버킷을 따로 지워야 하는데, 첫 요청에 맞추면 항목 하나가
    자기 만료 시각을 들고 있어서 청소가 단순해진다.

    경계에서 한도의 두 배가 새는 고정 윈도우의 결함은 그대로 남아 있다.
    (윈도우 끝에 몰아 쓰고 다음 윈도우 시작에 또 몰아 쓰는 경우)
    그건 슬라이딩 윈도우로 넘어갈 때 고칠 문제다.
    """

    # 이만큼 호출될 때마다 만료 항목을 쓸어낸다. 청소 전용 스레드를 두지 않는 이유는
    # 스레드 수명 관리(서버 종료 시 정리)가 청소 자체보다 복잡해지기 때문이다.
    _SWEEP_EVERY = 256

    def __init__(self) -> None:
        # key -> (지금까지 센 횟수, 이 카운터가 만료되는 시각)
        self._counters: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()
        self._calls = 0

    def _sweep(self, now: float) -> None:
        """만료된 항목 제거. 호출자가 락을 잡은 상태여야 한다."""
        self._calls += 1
        if self._calls < self._SWEEP_EVERY:
            return
        self._calls = 0
        expired = [k for k, (_, exp) in self._counters.items() if exp <= now]
        for k in expired:
            del self._counters[k]

    def peek(self, key: str, rule: Rule) -> int | None:
        now = time.monotonic()
        with self._lock:
            entry = self._counters.get(key)
            if entry is None:
                return None
            count, expires_at = entry
            if expires_at <= now:
                del self._counters[key]
                return None
            if count >= rule.limit:
                return _retry_after(expires_at - now)
            return None

    def hit(self, key: str, rule: Rule) -> int | None:
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            entry = self._counters.get(key)
            if entry is None or entry[1] <= now:
                count, expires_at = 1, now + rule.window
            else:
                count, expires_at = entry[0] + 1, entry[1]
            self._counters[key] = (count, expires_at)
            if count > rule.limit:
                return _retry_after(expires_at - now)
            return None

    def clear(self, key: str) -> None:
        with self._lock:
            self._counters.pop(key, None)

    def mark_once(self, key: str, ttl: int) -> bool:
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            entry = self._counters.get(key)
            if entry is not None and entry[1] > now:
                return False
            self._counters[key] = (1, now + ttl)
            return True

    def reset(self) -> None:
        """전체 삭제. 테스트에서 테스트 간 오염을 끊는 용도."""
        with self._lock:
            self._counters.clear()
            self._calls = 0


def _retry_after(seconds: float) -> int:
    """`Retry-After`는 정수 초다. 0을 주면 즉시 재시도를 유발하므로 최소 1."""
    return max(1, int(seconds) + 1)


store: RateLimitStore = InMemoryFixedWindowStore()


# ── 호출자 식별 ──────────────────────────────────────────────────────────
def client_ip(request: Request) -> str:
    """요청을 보낸 실제 클라이언트 IP.

    프록시 뒤에 있으면 TCP 연결 상대는 프록시라서 `request.client.host`는 전부
    같은 값이 된다. 그래서 `X-Forwarded-For`를 봐야 하는데, 이 헤더는 클라이언트가
    마음대로 채워 보낼 수 있다. 공격자가 `X-Forwarded-For: 1.2.3.4`를 넣어도
    프록시는 그 뒤에 진짜 주소를 **덧붙이기만** 한다.

        X-Forwarded-For: 1.2.3.4(위조), 203.0.113.9(프록시가 붙인 진짜)

    그래서 왼쪽이 아니라 **오른쪽에서** 신뢰하는 프록시 수만큼 들어와야 한다.
    왼쪽 끝을 쓰면 헤더 한 줄로 제한을 무한히 우회할 수 있다.

    `TRUSTED_PROXY_COUNT`가 실제 홉 수보다 크면 프록시 IP를 클라이언트로 오인해
    모든 사용자가 같은 키를 쓰게 되고(= 다 같이 차단), 작으면 위조가 통한다.
    로컬처럼 프록시가 없으면 0으로 두고 헤더를 아예 무시한다.
    """
    hops = settings.TRUSTED_PROXY_COUNT
    if hops > 0:
        forwarded = request.headers.get("x-forwarded-for", "")
        chain = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if len(chain) >= hops:
            return chain[-hops]
    return request.client.host if request.client else "unknown"


# ── 적용 ────────────────────────────────────────────────────────────────
def _too_many(retry_after: int) -> HTTPException:
    """429여야 하는 이유: 403은 "권한 없음"(영구)이고 429는 "지금은 안 됨"(일시적)이라
    클라이언트가 취할 행동이 다르다. `Retry-After`를 안 주면 언제 다시 될지 몰라
    재시도 폭풍을 유발한다."""
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"요청이 너무 잦습니다. {retry_after}초 후에 다시 시도해주세요.",
        headers={"Retry-After": str(retry_after)},
    )


def guard(key: str, rule: Rule) -> None:
    """이미 한도를 넘었으면 429. 카운터는 올리지 않는다.

    올리지 않는 이유는 두 가지다. 차단된 뒤에도 계속 두들기면 카운터가 계속 갱신돼
    영영 안 풀리는 걸 막고, 본 작업(DB 조회·메일 발송) 전에 먼저 끊어내기 위해서다.
    """
    retry_after = store.peek(key, rule)
    if retry_after is not None:
        raise _too_many(retry_after)


def record(key: str, rule: Rule) -> None:
    """카운터를 1 올린다. 이번 호출로 한도를 넘었으면 429."""
    retry_after = store.hit(key, rule)
    if retry_after is not None:
        raise _too_many(retry_after)


def clear(key: str) -> None:
    store.clear(key)
