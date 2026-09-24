"""익명 방문자 식별 — IP 원문을 남기지 않으면서 같은 사람을 하루 동안 알아보기."""

from datetime import date

from app.core.config import settings
from app.core.visitor import visitor_id
from tests.test_ratelimit import make_request

DAY = date(2026, 9, 24)


def with_user_agent(request, ua: str):
    request.scope["headers"] = [(b"user-agent", ua.encode())]
    return request


def test_visitor_id_hides_the_raw_ip():
    """식별자에 IP 원문이 남으면 개인정보를 그대로 들고 있는 셈이 된다."""
    ip = "203.0.113.9"
    identifier = visitor_id(make_request(ip), DAY)
    assert ip not in identifier
    # 같은 방문자는 같은 값으로, 다른 방문자는 다른 값으로 떨어져야 한다
    assert identifier == visitor_id(make_request(ip), DAY)
    assert identifier != visitor_id(make_request("203.0.113.10"), DAY)


def test_visitor_id_changes_every_day():
    """솔트를 날마다 갈아치우는 이유는 어제 해시와 오늘 해시가 안 이어지게 하려는 것이다.
    같은 사람을 오래 추적하는 게 구조적으로 불가능해진다."""
    request = make_request("203.0.113.9")
    assert visitor_id(request, DAY) != visitor_id(request, date(2026, 9, 25))


def test_visitor_id_separates_user_agents(monkeypatch):
    """IP만 쓰면 같은 공유기 뒤의 사람들이 한 명으로 뭉친다."""
    monkeypatch.setattr(settings, "TRUSTED_PROXY_COUNT", 0)
    chrome = with_user_agent(make_request("203.0.113.9"), "chrome")
    safari = with_user_agent(make_request("203.0.113.9"), "safari")
    assert visitor_id(chrome, DAY) != visitor_id(safari, DAY)
