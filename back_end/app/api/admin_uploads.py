from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.deps import get_current_admin
from app.core.images import MAX_UPLOAD_BYTES, ImageRejected, process_image
from app.core.storage import (
    ImageStorage,
    StorageError,
    get_image_storage,
    new_image_key,
)
from app.schemas.upload import ImageUploadOut

router = APIRouter(
    prefix="/admin/uploads",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "/images", response_model=ImageUploadOut, status_code=status.HTTP_201_CREATED
)
def upload_image(
    file: UploadFile,
    storage: ImageStorage = Depends(get_image_storage),
) -> ImageUploadOut:
    """글에 넣을 이미지를 올린다. 관리자 전용.

    `async def`가 아니라 일반 함수로 둔 이유: 이미지 디코딩·리사이즈는 CPU를 오래 쓰는
    동기 작업이라, async 함수 안에서 돌리면 그동안 서버의 다른 요청이 전부 멈춘다.
    일반 함수로 두면 FastAPI가 별도 스레드에서 돌려준다.
    """
    # 한도보다 1바이트 더 읽어서 넘었는지만 판단한다. 전부 읽고 재면 거대한 파일을
    # 메모리에 통째로 올린 뒤에야 거절하게 된다.
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    try:
        image = process_image(raw)
    except ImageRejected as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    try:
        url = storage.save(new_image_key(), image.data, image.content_type)
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이미지 저장소에 올리지 못했어요. 잠시 후 다시 시도해주세요.",
        ) from exc
    return ImageUploadOut(url=url, width=image.width, height=image.height)
