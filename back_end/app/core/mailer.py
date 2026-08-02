"""SMTP 메일 발송.

발송은 FastAPI BackgroundTasks에서 호출되어 API 응답을 막지 않는다.
그래서 실패해도 요청은 이미 성공한 뒤 → 예외를 올리지 않고 로그만 남긴다.
"""

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_mail_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.MAIL_FROM_NAME, settings.SMTP_USER))
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError):
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
