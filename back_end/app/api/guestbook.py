import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.images import (
    GUESTBOOK_MAX_WIDTH,
    MAX_UPLOAD_BYTES,
    ImageRejected,
    process_image,
)
from app.core.ratelimit import IMAGE_BY_USER, WRITE_BY_USER, guard, record
from app.core.storage import (
    SHORT_CACHE_CONTROL,
    StorageError,
    current_storage,
    delete_image_quietly,
    new_image_key,
)
from app.crud import guestbook as crud
from app.db.session import get_db
from app.models import User
from app.schemas.guestbook import GuestbookOut, PaginatedGuestbook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/guestbook", tags=["guestbook"])


@router.get("", response_model=PaginatedGuestbook)
def list_guestbook(
    page: int = Query(1, ge=1),
    page_size: int = Query(4, ge=1, le=50, alias="pageSize"),
    db: Session = Depends(get_db),
) -> PaginatedGuestbook:
    items, total = crud.list_entries(db, page=page, page_size=page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedGuestbook(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _store_image(image: UploadFile) -> str:
    """사진을 검사·정리해서 저장하고 저장 경로(키)를 돌려준다."""
    storage = current_storage()
    if storage is None:
        # 배포에서 저장소 설정이 빠진 경우. 사진 없는 글쓰기는 막지 않고 사진만 막는다.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="지금은 사진을 올릴 수 없어요.",
        )
    try:
        processed = process_image(
            image.file.read(MAX_UPLOAD_BYTES + 1), max_width=GUESTBOOK_MAX_WIDTH
        )
    except ImageRejected as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    key = new_image_key("guestbook")
    try:
        storage.save(
            key,
            processed.data,
            processed.content_type,
            cache_control=SHORT_CACHE_CONTROL,
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.",
        ) from exc
    return key


@router.post("", response_model=GuestbookOut, status_code=status.HTTP_201_CREATED)
def create_guestbook(
    content: Annotated[str, Form(max_length=1000)] = "",
    image: UploadFile | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GuestbookOut:
    """방명록 쓰기. 글과 사진을 한 요청에 같이 받는다(multipart).

    사진을 먼저 올려 주소를 받고 나중에 글에 붙이는 방식을 쓰지 않은 이유: 사진만 올리고
    글은 안 쓰면 "주인 없는 파일"이 쌓이고, 남이 올린 사진 주소를 자기 글에 붙이는 걸
    막는 장치도 따로 필요해진다. 한 요청으로 받으면 둘 다 생기지 않는다.

    사진은 회원이 주소를 적는 게 아니라 서버가 직접 올린 파일만 붙는다. 외부 이미지
    주소를 허용하면 방명록을 여는 방문자의 IP가 그 서버에 찍히고(추적 픽셀), 검사를
    거치지 않은 이미지가 사이트에 뜨게 된다.

    `async def`가 아닌 이유: 이미지 디코딩은 CPU를 오래 쓰는 동기 작업이라, async 안에서
    돌리면 그동안 서버의 다른 요청이 전부 멈춘다.
    """
    text = content.strip()
    has_image = image is not None and bool(image.filename)
    if not text and not has_image:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="글이나 사진 중 하나는 남겨주세요.",
        )

    # 계정 기준으로만 센다. 여기는 로그인해야 쓸 수 있어서 "누가 썼나"가 확실하다.
    write_key = f"write:guestbook:{user.id}"
    image_quota_key = f"image:guestbook:{user.id}"
    guard(write_key, WRITE_BY_USER)
    if has_image:
        guard(image_quota_key, IMAGE_BY_USER)

    image_key = _store_image(image) if has_image else None
    try:
        entry = crud.create(db, content=text, author=user, image_key=image_key)
    except Exception:
        # 사진은 올렸는데 글 저장이 실패하면, 그 사진은 아무도 가리키지 않는 파일이 된다
        db.rollback()
        delete_image_quietly(image_key)
        raise

    # 실제로 글이 만들어졌을 때만 센다. 404나 검증 실패는 도배가 아니다.
    record(write_key, WRITE_BY_USER)
    if has_image:
        record(image_quota_key, IMAGE_BY_USER)
    return entry
