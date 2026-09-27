"""이미지 저장소. 배포는 Supabase Storage, 로컬은 폴더.

요청 제한의 `RateLimitStore`와 같은 방식이다. 설정값이 비어 있으면 가벼운 쪽(로컬
폴더)으로 떨어지고, 채워져 있으면 Supabase로 간다. 이미지를 검사·정리하는 복잡한
부분(`images.py`)은 어느 쪽이든 똑같이 돌고, 여기서 갈리는 건 "바이트를 어디에 두고
어떤 주소를 돌려주나" 한 단계뿐이다.

DB는 로컬에서도 Docker Postgres를 띄우는데 이미지는 그러지 않은 이유: DB는 SQL이
로컬과 배포에서 똑같이 동작해야 해서 같은 엔진이 필요하지만, 저장소의 계약은
"넣고 주소를 받는다"뿐이라 구현이 달라도 어긋날 여지가 거의 없다.
"""

import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# 파일 이름이 매번 새로 만들어지는 무작위 값이라 같은 주소의 내용이 바뀔 일이 없다.
# 그래서 1년 동안 캐시해도 된다. 캐시된 전송은 Supabase 무료 한도에서 따로 세서
# (캐시 5GB / 비캐시 5GB), 캐시를 길게 줄수록 비캐시 한도가 오래 간다.
CACHE_CONTROL = "max-age=31536000"

# 방명록처럼 회원이 올린 이미지는 1시간만 캐시한다. 부적절한 사진을 내려야 할 때,
# 파일을 지워도 중간 서버(CDN)에 남은 복사본이 캐시 기간 동안 계속 나갈 수 있어서다.
# 무료 플랜에서 삭제가 CDN에 바로 반영되는지 확실하지 않으므로 캐시를 짧게 둔다.
SHORT_CACHE_CONTROL = "max-age=3600"


class StorageError(Exception):
    pass


class ImageStorage(Protocol):
    def save(
        self,
        key: str,
        data: bytes,
        content_type: str,
        cache_control: str = CACHE_CONTROL,
    ) -> str:
        """바이트를 저장하고 누구나 볼 수 있는 주소를 돌려준다."""

    def delete(self, key: str) -> None:
        """파일을 지운다. 이미 없으면 조용히 넘어간다."""

    def public_url(self, key: str) -> str:
        """저장된 파일을 누구나 볼 수 있는 주소."""


def new_image_key(prefix: str = "posts") -> str:
    """저장 경로. 올린 사람이 붙인 파일 이름은 쓰지 않는다.

    원래 이름을 쓰면 `../../` 같은 경로 조작을 막아야 하고, "내 주민등록증 스캔.jpg"
    처럼 이름 자체가 정보를 흘리기도 한다. 무작위 이름이면 둘 다 신경 쓸 필요가 없다.
    """
    now = datetime.now(UTC)
    return f"{prefix}/{now:%Y}/{now:%m}/{uuid.uuid4().hex}.webp"


class LocalImageStorage:
    def __init__(self, directory: Path, public_base_url: str) -> None:
        self.directory = directory
        self.public_base_url = public_base_url.rstrip("/")

    def save(
        self,
        key: str,
        data: bytes,
        content_type: str,
        cache_control: str = CACHE_CONTROL,
    ) -> str:
        path = self.directory / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return self.public_url(key)

    def delete(self, key: str) -> None:
        (self.directory / key).unlink(missing_ok=True)

    def public_url(self, key: str) -> str:
        return f"{self.public_base_url}/uploads/{key}"


class SupabaseImageStorage:
    def __init__(self, url: str, secret_key: str, bucket: str) -> None:
        self.url = url.rstrip("/")
        self.secret_key = secret_key
        self.bucket = bucket

    def _auth_headers(self) -> dict[str, str]:
        # 새 형식 키(sb_secret_...)는 JWT가 아니라서 apikey 헤더로만 보내야 한다.
        # 흔히 보이는 `Authorization: Bearer`에 실으면 JWT로 검증하려다 실패한다.
        # 예전 service_role 키(JWT)는 Bearer도 필요했는데 2026년 말 폐기 예정이라,
        # 그 키를 쓰는 동안만 Bearer를 같이 붙인다.
        headers = {"apikey": self.secret_key}
        if not self.secret_key.startswith("sb_"):
            headers["authorization"] = f"Bearer {self.secret_key}"
        return headers

    def save(
        self,
        key: str,
        data: bytes,
        content_type: str,
        cache_control: str = CACHE_CONTROL,
    ) -> str:
        try:
            res = httpx.post(
                f"{self.url}/storage/v1/object/{self.bucket}/{key}",
                content=data,
                headers={
                    **self._auth_headers(),
                    "content-type": content_type,
                    "cache-control": cache_control,
                    "x-upsert": "false",
                },
                timeout=30,
            )
            res.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # 버킷이 없거나(404), 키가 틀리거나(401/403), 한도를 넘었을 때 이유가 본문에만 온다
            logger.error(
                "이미지 업로드 거절: %s %s",
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise StorageError from exc
        except httpx.HTTPError as exc:
            logger.error("이미지 업로드 실패: %s", exc)
            raise StorageError from exc
        return self.public_url(key)

    def delete(self, key: str) -> None:
        try:
            res = httpx.delete(
                f"{self.url}/storage/v1/object/{self.bucket}/{key}",
                headers=self._auth_headers(),
                timeout=30,
            )
            # 이미 지워진 파일이면 목적은 달성된 것이라 실패로 보지 않는다
            if res.status_code != 404:
                res.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "이미지 삭제 거절: %s %s",
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise StorageError from exc
        except httpx.HTTPError as exc:
            logger.error("이미지 삭제 실패: %s", exc)
            raise StorageError from exc

    def public_url(self, key: str) -> str:
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{key}"


def upload_dir() -> Path:
    # back_end 폴더 기준. 실행 위치(cwd)에 따라 엉뚱한 곳에 쌓이지 않게 고정한다.
    return Path(__file__).resolve().parents[2] / settings.UPLOAD_DIR


def uses_supabase() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY)


def uses_local_folder() -> bool:
    return not uses_supabase() and settings.ALLOW_LOCAL_UPLOADS


def _build_storage() -> ImageStorage | None:
    if uses_supabase():
        return SupabaseImageStorage(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
            settings.SUPABASE_STORAGE_BUCKET,
        )
    if uses_local_folder():
        return LocalImageStorage(upload_dir(), settings.BACKEND_BASE_URL)
    return None


_storage = _build_storage()


def current_storage() -> ImageStorage | None:
    """지금 설정된 저장소. 배포에서 설정이 빠졌으면 None."""
    return _storage


def public_image_url(key: str | None) -> str | None:
    if not key or _storage is None:
        return None
    return _storage.public_url(key)


def delete_image_quietly(key: str | None) -> None:
    """글을 지운 뒤 붙어 있던 이미지 파일을 지운다. 실패해도 예외를 올리지 않는다.

    순서는 "DB에서 글 삭제 → 파일 삭제"다. 반대로 파일부터 지우면, 그다음 DB 삭제가
    실패했을 때 깨진 이미지가 달린 글이 화면에 남는다. 이 순서면 최악의 경우가
    "아무도 가리키지 않는 파일 하나"라서 로그로 남기고 넘어간다.
    """
    if not key:
        return
    if _storage is None:
        logger.warning("이미지 저장소가 설정되지 않아 파일을 지우지 못했다: %s", key)
        return
    try:
        _storage.delete(key)
    except StorageError:
        logger.error("글은 지웠지만 이미지 파일은 남았다 (나중에 정리 필요): %s", key)


def get_image_storage() -> ImageStorage:
    """FastAPI 의존성. 테스트에서는 가짜 저장소로 갈아끼운다."""
    if _storage is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이미지 저장소가 설정되지 않았어요.",
        )
    return _storage
