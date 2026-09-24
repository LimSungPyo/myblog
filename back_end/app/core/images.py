"""업로드된 이미지를 블로그에 올려도 되는 모양으로 정리한다.

올라온 파일을 그대로 저장하지 않고 한 번 다시 그리는 이유는 세 가지다.

1. **진짜 이미지인지 확인한다.** 확장자나 Content-Type은 보내는 쪽이 마음대로 적을 수
   있다. 실제로 이미지로 열리는지 봐야 안다.
2. **위치정보를 지운다.** 폰 사진에는 찍은 곳의 GPS 좌표가 EXIF로 숨어 있는 경우가 많다.
   그대로 올리면 독자가 그 좌표를 꺼내볼 수 있다.
3. **크기를 줄인다.** 폰 사진 한 장이 5~10MB인데 블로그 본문 폭에서는 가로 1600px이면
   충분하다. Supabase 무료 플랜은 저장 1GB, 캐시 안 된 전송량 월 5GB라서 원본을
   그대로 쌓으면 금방 찬다. WebP로 바꾸면 수백 KB 수준으로 줄어든다.
"""

import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_WIDTH = 1600
# 압축 폭탄 방지. 파일은 몇 KB인데 풀면 수십억 픽셀이 되는 이미지가 있다. 파일 크기
# 검사로는 못 잡고, 헤더에 적힌 가로·세로를 디코딩 전에 봐야 잡힌다.
# 5천만 픽셀은 4800만 화소 폰 사진(8064×6048)까지 받는 선이다. 이걸 풀면 메모리를
# 150MB 가까이 쓰는데, Render 무료 인스턴스(512MB)가 버틸 수 있는 범위로 잡았다.
MAX_PIXELS = 50_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
WEBP_QUALITY = 80


class ImageRejected(Exception):
    """사용자에게 그대로 보여줄 수 있는 거절 사유."""

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    width: int
    height: int
    content_type: str = "image/webp"


def _has_alpha(img: Image.Image) -> bool:
    return img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info
    )


def process_image(raw: bytes) -> ProcessedImage:
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ImageRejected("이미지는 10MB 이하만 올릴 수 있어요.", 413)

    try:
        # open은 헤더만 읽는다. 픽셀을 풀기(load) 전에 크기부터 확인해야 폭탄을 막는다.
        img = Image.open(io.BytesIO(raw))
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageRejected(
            "이미지 파일이 아니에요. JPG, PNG, WebP만 올릴 수 있어요.", 415
        ) from exc

    if img.format not in ALLOWED_FORMATS:
        raise ImageRejected("JPG, PNG, WebP만 올릴 수 있어요.", 415)
    if getattr(img, "is_animated", False):
        # 첫 장면만 남기고 조용히 멈춰버리면 올린 사람이 모르고 지나간다. 차라리 알린다.
        raise ImageRejected("움직이는 이미지는 올릴 수 없어요.", 415)
    if img.width * img.height > MAX_PIXELS:
        raise ImageRejected("이미지 해상도가 너무 커요.", 413)

    try:
        img.load()
    except (OSError, Image.DecompressionBombError) as exc:
        raise ImageRejected("이미지가 손상돼 있어서 열 수 없어요.", 415) from exc

    # 색 정보(ICC 프로파일)는 남긴다. 위치 같은 개인정보가 없고, 지우면 넓은 색역으로
    # 찍힌 사진(아이폰 등)의 색이 칙칙하게 바뀐다.
    icc_profile = img.info.get("icc_profile")

    # 폰 사진은 픽셀을 눕혀 저장하고 "90도 돌려서 보여줘"를 EXIF에 적어두는 경우가 많다.
    # EXIF를 지우기 전에 그 회전을 픽셀에 반영해야 한다. 순서가 바뀌면 사진이 누워버린다.
    img = ImageOps.exif_transpose(img)

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if _has_alpha(img) else "RGB")

    if img.width > MAX_WIDTH:
        height = round(img.height * MAX_WIDTH / img.width)
        img = img.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)

    out = io.BytesIO()
    # exif를 넘기지 않으면 새 파일에는 EXIF가 아예 안 들어간다. 이게 위치정보 제거다.
    save_kwargs = {"quality": WEBP_QUALITY}
    if icc_profile:
        save_kwargs["icc_profile"] = icc_profile
    img.save(out, "WEBP", **save_kwargs)
    return ProcessedImage(data=out.getvalue(), width=img.width, height=img.height)
