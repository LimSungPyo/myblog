import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.mailer import (
    is_mail_configured,
    send_password_reset_email,
    send_verification_email,
)
from app.core.ratelimit import (
    LOGIN_BY_IDENTITY,
    LOGIN_BY_IP,
    clear,
    client_ip,
    guard,
    record,
)
from app.core.security import (
    create_access_token,
    create_email_verify_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    password_fingerprint,
    verify_email_verify_token,
    verify_password,
)
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    EmailRequest,
    LoginRequest,
    MessageOut,
    ResetPasswordRequest,
    SignupRequest,
    TokenOut,
    UserOut,
    VerifyEmailRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _require_mail_configured() -> None:
    if not is_mail_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="메일 발송이 설정되지 않았습니다.",
        )


def _frontend_origin() -> str:
    # 다중 오리진 설정 시 첫 항목이 대표(공개) 오리진이라는 관례를 따른다
    return settings.cors_origins[0]


def _queue_verification_mail(background_tasks: BackgroundTasks, user: User) -> None:
    token = create_email_verify_token(str(user.id))
    link = f"{_frontend_origin()}/verify-email?token={token}"
    background_tasks.add_task(send_verification_email, user.email, link)


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


@router.post("/login", response_model=TokenOut)
def login(
    payload: LoginRequest, request: Request, db: Session = Depends(get_db)
) -> TokenOut:
    # 두 축을 동시에 건다. 계정 축만 걸면 공격자가 계정을 바꿔가며 계속 두들길 수 있고,
    # IP 축만 걸면 IP를 돌려서 한 계정을 노리는 걸 못 막는다.
    identity_key = f"login:identity:{payload.username.strip().lower()}"
    ip_key = f"login:ip:{client_ip(request)}"
    # 카운터는 계정이 있든 없든 똑같이 오른다. 존재하는 계정에서만 429가 나오면
    # 제한 자체가 "이 계정은 있다"를 알려주는 계정 열거 오라클이 된다.
    guard(identity_key, LOGIN_BY_IDENTITY)
    guard(ip_key, LOGIN_BY_IP)

    # 관리자는 username, 일반 회원은 이메일로 로그인 (한 필드로 둘 다 조회)
    user = db.scalar(
        select(User).where(
            or_(
                User.username == payload.username,
                User.email == payload.username.lower(),
            )
        )
    )
    if user is None or not verify_password(payload.password, user.hashed_password):
        # 성공까지 세면 기기 여러 대에서 정상 로그인만 해도 막힌다. 막으려는 건
        # "맞을 때까지 찍어보는 것"이라 실패만 센다.
        record(identity_key, LOGIN_BY_IDENTITY)
        record(ip_key, LOGIN_BY_IP)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    # 비밀번호를 아는 게 증명됐으니 이 계정의 실패 기록은 지운다.
    # IP 축은 남긴다. 자기 계정에 로그인하는 것만으로 IP 카운터를 지울 수 있으면
    # 공격자가 계정 하나를 갖고 제한을 무한히 리셋할 수 있다.
    clear(identity_key)
    # 이메일 가입자는 메일 인증을 마쳐야 로그인 완료.
    # 관리자는 email 없이 username으로 로그인하는 계정이라 검사 대상이 아니다.
    if user.email is not None and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이메일 인증이 필요합니다. 메일함을 확인해주세요.",
        )
    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, is_admin=user.is_admin)


@router.post("/signup", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageOut:
    _require_mail_configured()
    email = payload.email.lower()
    existing = _find_user_by_email(db, email)
    if existing is not None:
        # 소셜 전용 계정은 이미 email_verified=True다. 여기서 비밀번호를 받아 심으면
        # 인증 게이트를 그냥 통과해 남의 계정으로 로그인할 수 있게 된다.
        # 비밀번호가 필요하면 메일 소유를 증명하는 재설정 흐름으로 가야 한다.
        if existing.hashed_password is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="소셜 로그인으로 가입된 이메일입니다. "
                "소셜 로그인을 이용하시거나, 비밀번호 찾기로 비밀번호를 설정해주세요.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 가입된 이메일입니다.",
        )
    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _queue_verification_mail(background_tasks, user)
    return MessageOut(message="인증 메일을 보냈습니다. 메일함을 확인해주세요.")


@router.post("/resend-verification", response_model=MessageOut)
def resend_verification(
    payload: EmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageOut:
    _require_mail_configured()
    user = _find_user_by_email(db, payload.email)
    # 계정 존재 여부가 응답으로 새어 나가지 않게, 어떤 경우든 같은 메시지를 돌려준다
    if user is not None and not user.email_verified:
        _queue_verification_mail(background_tasks, user)
    return MessageOut(message="가입된 이메일이면 인증 메일을 보냈습니다.")


@router.post("/verify-email", response_model=TokenOut)
def verify_email(
    payload: VerifyEmailRequest, db: Session = Depends(get_db)
) -> TokenOut:
    sub = verify_email_verify_token(payload.token)
    user = None
    if sub is not None:
        try:
            user = db.get(User, uuid.UUID(sub))
        except ValueError:
            user = None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 링크가 유효하지 않거나 만료되었습니다.",
        )
    # 이미 인증된 계정이 링크를 다시 열어도 그대로 로그인시킨다 (멱등)
    if not user.email_verified:
        user.email_verified = True
        db.commit()
    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, is_admin=user.is_admin)


@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(
    payload: EmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageOut:
    _require_mail_configured()
    user = _find_user_by_email(db, payload.email)
    # 소셜 전용 계정(비밀번호 없음)도 허용 — 메일 수신이 곧 이메일 소유 증명이므로
    # 이 흐름으로 비밀번호를 새로 만들어 이메일 로그인을 열어줄 수 있다
    if user is not None:
        token = create_password_reset_token(str(user.id), user.hashed_password)
        link = f"{_frontend_origin()}/reset-password?token={token}"
        background_tasks.add_task(send_password_reset_email, user.email, link)
    return MessageOut(message="가입된 이메일이면 재설정 메일을 보냈습니다.")


@router.post("/reset-password", response_model=TokenOut)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> TokenOut:
    decoded = decode_password_reset_token(payload.token)
    user = None
    if decoded is not None:
        try:
            user = db.get(User, uuid.UUID(decoded[0]))
        except ValueError:
            user = None
    # 지문 불일치 = 발급 후 비밀번호가 이미 바뀜(사용된 링크 포함) → 재사용 차단
    if user is None or decoded[1] != password_fingerprint(user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="재설정 링크가 유효하지 않거나 이미 사용되었습니다.",
        )
    user.hashed_password = hash_password(payload.password)
    # 재설정 메일을 받았다는 것 자체가 이메일 소유 증명이므로 인증도 함께 처리
    user.email_verified = True
    db.commit()
    logger.info("password reset for user %s", user.id)
    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, is_admin=user.is_admin)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
