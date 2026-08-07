"""메일 발송 (Brevo HTTP API).

SMTP가 아니라 HTTPS(443)로 보낸다. Render 무료 플랜이 2025년 9월부터 아웃바운드
SMTP 포트(25·465·587)를 차단해서, 배포 환경에서는 smtplib이 아예 나가지 못한다.
포트 25는 유료 플랜에서도 막혀 있어 HTTP API가 플랜과 무관한 유일한 경로다.

발송은 FastAPI BackgroundTasks에서 호출되어 API 응답을 막지 않는다.
그래서 실패해도 요청은 이미 성공한 뒤 → 예외를 올리지 않고 로그만 남긴다.
대신 거절 응답의 본문까지 남긴다. 조용히 실패하면 "메일을 보냈습니다" 화면만
뜨고 원인을 추적할 단서가 하나도 없기 때문이다.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT_SECONDS = 10


def is_mail_configured() -> bool:
    return bool(settings.BREVO_API_KEY and settings.MAIL_FROM_EMAIL)


def send_email(to: str, subject: str, body: str) -> None:
    payload = {
        "sender": {"name": settings.MAIL_FROM_NAME, "email": settings.MAIL_FROM_EMAIL},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }
    try:
        res = httpx.post(
            BREVO_SEND_URL,
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            json=payload,
            timeout=TIMEOUT_SECONDS,
        )
        res.raise_for_status()
    except httpx.HTTPStatusError as exc:
        # 401=키 오류, 400=발신자 미인증 등. 이유가 응답 본문에만 담겨 온다.
        logger.error(
            "mail: send rejected (to=%s, subject=%s, status=%s, body=%s)",
            to,
            subject,
            exc.response.status_code,
            exc.response.text,
        )
    except httpx.HTTPError:
        logger.exception("mail: send failed (to=%s, subject=%s)", to, subject)


def send_verification_email(to: str, link: str) -> None:
    send_email(
        to,
        "[myblog] 이메일 인증을 완료해주세요",
        f"""안녕하세요, myblog입니다.

아래 링크를 열면 이메일 인증이 완료되고 바로 로그인됩니다.

{link}

링크는 24시간 동안 유효합니다.
직접 가입한 적이 없다면 이 메일은 무시하셔도 됩니다.""",
    )


def send_password_reset_email(to: str, link: str) -> None:
    send_email(
        to,
        "[myblog] 비밀번호 재설정 안내",
        f"""안녕하세요, myblog입니다.

아래 링크에서 새 비밀번호를 설정할 수 있습니다.

{link}

링크는 30분 동안 유효하며 한 번만 사용할 수 있습니다.
비밀번호 재설정을 요청한 적이 없다면 이 메일은 무시하셔도 됩니다.""",
    )
