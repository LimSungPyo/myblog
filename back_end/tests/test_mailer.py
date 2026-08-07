"""메일 발송(Brevo HTTP API) 테스트.

발송은 BackgroundTasks에서 도는 뒷단이라 실패해도 사용자 화면은 성공으로 보인다.
그래서 "예외를 올리지 않는다"와 "실패 이유를 로그에 남긴다"를 둘 다 고정해둔다.
실제로 발송이 조용히 죽었을 때 단서가 로그밖에 없었던 적이 있다.
"""

import httpx
import pytest

from app.core import mailer
from app.core.config import settings


@pytest.fixture
def mail_configured(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "test-api-key")
    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "sender@test.local")
    monkeypatch.setattr(settings, "MAIL_FROM_NAME", "myblog")


def test_is_mail_configured_requires_both(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "sender@test.local")
    assert mailer.is_mail_configured() is False

    monkeypatch.setattr(settings, "BREVO_API_KEY", "key")
    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "")
    assert mailer.is_mail_configured() is False

    monkeypatch.setattr(settings, "MAIL_FROM_EMAIL", "sender@test.local")
    assert mailer.is_mail_configured() is True


def test_send_email_posts_expected_payload(monkeypatch, mail_configured):
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return httpx.Response(
            201,
            json={"messageId": "<abc@relay>"},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(mailer.httpx, "post", fake_post)
    mailer.send_email("to@example.com", "제목", "본문")

    assert captured["url"] == mailer.BREVO_SEND_URL
    assert captured["headers"]["api-key"] == "test-api-key"
    assert captured["json"] == {
        "sender": {"name": "myblog", "email": "sender@test.local"},
        "to": [{"email": "to@example.com"}],
        "subject": "제목",
        "textContent": "본문",
    }


def test_send_email_rejected_logs_body_without_raising(
    monkeypatch, mail_configured, caplog
):
    # 발신자 미인증(400) 같은 거절은 본문에만 이유가 담겨 온다
    def fake_post(url, **kwargs):
        return httpx.Response(
            400,
            json={"code": "invalid_parameter", "message": "sender not valid"},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(mailer.httpx, "post", fake_post)
    with caplog.at_level("ERROR"):
        mailer.send_email("to@example.com", "제목", "본문")

    assert "sender not valid" in caplog.text


def test_send_email_network_error_does_not_raise(monkeypatch, mail_configured, caplog):
    def fake_post(url, **kwargs):
        raise httpx.ConnectTimeout("timed out")

    monkeypatch.setattr(mailer.httpx, "post", fake_post)
    with caplog.at_level("ERROR"):
        mailer.send_email("to@example.com", "제목", "본문")

    assert "mail: send failed" in caplog.text


def test_verification_email_contains_link(monkeypatch, mail_configured):
    sent = {}

    def fake_send_email(to, subject, body):
        sent.update(to=to, subject=subject, body=body)

    monkeypatch.setattr(mailer, "send_email", fake_send_email)
    mailer.send_verification_email("to@example.com", "https://blog.test/verify?token=t")

    assert "https://blog.test/verify?token=t" in sent["body"]
