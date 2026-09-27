"""외부 서비스 연결 오류를 로그에 남길 때 쓰는 안전한 설명.

httpx 오류 메시지에는 요청 내용이 섞일 수 있다. 헤더 값이 잘못되면
`Illegal header value b'<헤더 값>'`처럼 헤더를 통째로 담는데, 그 헤더가 API 키면
키가 로그에 그대로 찍힌다. 실제로 Render에 넣은 Supabase 비밀 키에 줄바꿈이 섞였을 때
비밀 키 전체가 로그에 남았다. 로그는 대시보드에 접근하는 누구나 보고, 오래 보관되고,
캡처해서 공유되기도 한다. 비밀이 남아도 되는 곳이 아니다.

그래서 오류 메시지 본문은 쓰지 않고 오류 종류(클래스 이름)와 원인 힌트만 남긴다.
종류만으로도 어디를 봐야 할지는 충분히 알 수 있다.
"""

import httpx

_HINTS: dict[type[httpx.HTTPError], str] = {
    # 요청을 만드는 단계의 문제. 대개 설정값(API 키 등)에 줄바꿈·공백이 섞인 경우다.
    httpx.LocalProtocolError: "요청 헤더 형식 오류 - API 키에 줄바꿈이나 공백이 섞였는지 확인",
    httpx.TimeoutException: "시간 초과 - 상대 서비스가 느리거나 멈춤",
    httpx.ConnectError: "연결 실패 - 주소가 틀렸거나 상대 서비스가 꺼짐",
}


def describe_http_error(exc: httpx.HTTPError) -> str:
    name = type(exc).__name__
    for kind, hint in _HINTS.items():
        if isinstance(exc, kind):
            return f"{name} ({hint})"
    return name
