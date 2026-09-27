"""이미지 업로드 — 검사, 위치정보 제거, 회전 반영, 크기 줄이기, 저장소."""

import io

import httpx
import pytest
from PIL import ExifTags, Image

from app.core import storage as storage_module
from app.core.images import MAX_UPLOAD_BYTES
from app.core.storage import (
    LocalImageStorage,
    StorageError,
    SupabaseImageStorage,
    get_image_storage,
    new_image_key,
)
from app.main import app


class FakeStorage:
    def __init__(self) -> None:
        self.saved: list[tuple[str, bytes, str]] = []
        self.fail = False

    def save(self, key: str, data: bytes, content_type: str) -> str:
        if self.fail:
            raise StorageError
        self.saved.append((key, data, content_type))
        return f"https://cdn.test/{key}"


@pytest.fixture
def fake_storage(client):
    fake = FakeStorage()
    app.dependency_overrides[get_image_storage] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_image_storage, None)


def encode(img: Image.Image, fmt: str, **kwargs) -> bytes:
    buf = io.BytesIO()
    img.save(buf, fmt, **kwargs)
    return buf.getvalue()


def phone_photo(size=(200, 100)) -> bytes:
    """폰 사진 흉내: 픽셀은 눕혀 저장하고 회전 정보와 GPS 좌표를 EXIF에 넣는다."""
    exif = Image.Exif()
    exif[ExifTags.Base.Orientation] = 6  # 보여줄 때 시계 방향 90도 회전
    exif[ExifTags.Base.Make] = "TestPhone"
    gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
    gps[ExifTags.GPS.GPSLatitudeRef] = "N"
    gps[ExifTags.GPS.GPSLatitude] = (37.0, 33.0, 12.0)
    return encode(Image.new("RGB", size, "red"), "JPEG", exif=exif)


def upload(client, headers, data: bytes, name: str = "photo.jpg"):
    return client.post(
        "/admin/uploads/images",
        files={"file": (name, data, "application/octet-stream")},
        headers=headers,
    )


def saved_image(fake: FakeStorage) -> Image.Image:
    assert len(fake.saved) == 1
    return Image.open(io.BytesIO(fake.saved[0][1]))


# ─────────────── 정상 업로드 ───────────────
def test_upload_returns_url_and_stores_webp(client, admin_headers, fake_storage):
    r = upload(client, admin_headers, encode(Image.new("RGB", (300, 200)), "PNG"))
    assert r.status_code == 201
    body = r.json()
    key, _, content_type = fake_storage.saved[0]
    assert body == {"url": f"https://cdn.test/{key}", "width": 300, "height": 200}
    assert content_type == "image/webp"
    assert saved_image(fake_storage).format == "WEBP"


def test_gps_location_is_removed(client, admin_headers, fake_storage):
    """폰 사진의 위치정보가 그대로 올라가면 독자가 찍은 곳을 꺼내볼 수 있다."""
    photo = phone_photo()
    # 준비한 사진에 정말 GPS가 들어 있는지부터 확인해둔다 (없으면 이 테스트는 의미가 없다)
    assert Image.open(io.BytesIO(photo)).getexif().get_ifd(ExifTags.IFD.GPSInfo)

    assert upload(client, admin_headers, photo).status_code == 201
    out = saved_image(fake_storage)
    assert not out.getexif().get_ifd(ExifTags.IFD.GPSInfo)
    assert len(out.getexif()) == 0


def test_rotation_is_applied_before_metadata_is_dropped(
    client, admin_headers, fake_storage
):
    """회전 정보를 픽셀에 반영하지 않고 EXIF만 지우면 사진이 누워서 올라간다."""
    r = upload(client, admin_headers, phone_photo(size=(200, 100)))
    assert (r.json()["width"], r.json()["height"]) == (100, 200)
    assert saved_image(fake_storage).size == (100, 200)


def test_wide_image_is_shrunk_to_max_width(client, admin_headers, fake_storage):
    r = upload(client, admin_headers, encode(Image.new("RGB", (3200, 1000)), "PNG"))
    assert (r.json()["width"], r.json()["height"]) == (1600, 500)


def test_small_image_is_not_enlarged(client, admin_headers, fake_storage):
    r = upload(client, admin_headers, encode(Image.new("RGB", (300, 200)), "JPEG"))
    assert (r.json()["width"], r.json()["height"]) == (300, 200)


def test_transparency_is_kept(client, admin_headers, fake_storage):
    """로고·다이어그램 같은 투명 PNG가 검은 배경으로 바뀌면 안 된다."""
    png = encode(Image.new("RGBA", (50, 50), (0, 0, 0, 0)), "PNG")
    assert upload(client, admin_headers, png).status_code == 201
    assert saved_image(fake_storage).mode == "RGBA"


# ─────────────── 거절 ───────────────
def test_non_image_is_rejected(client, admin_headers, fake_storage):
    """확장자·Content-Type은 보내는 쪽이 마음대로 적는다. 실제로 열어봐야 안다."""
    r = upload(client, admin_headers, b"<script>alert(1)</script>", name="evil.jpg")
    assert r.status_code == 415
    assert fake_storage.saved == []


def test_gif_is_rejected(client, admin_headers, fake_storage):
    r = upload(client, admin_headers, encode(Image.new("P", (10, 10)), "GIF"))
    assert r.status_code == 415


def test_animated_image_is_rejected(client, admin_headers, fake_storage):
    """첫 장면만 남기고 조용히 멈추면 올린 사람이 모르고 지나간다."""
    frames = [Image.new("RGB", (10, 10), c) for c in ("red", "blue")]
    data = encode(frames[0], "WEBP", save_all=True, append_images=frames[1:])
    assert upload(client, admin_headers, data).status_code == 415


def test_file_over_size_limit_is_rejected(client, admin_headers, fake_storage):
    r = upload(client, admin_headers, b"x" * (MAX_UPLOAD_BYTES + 1))
    assert r.status_code == 413
    assert fake_storage.saved == []


def test_decompression_bomb_is_rejected_before_decoding(
    client, admin_headers, fake_storage
):
    """파일은 작은데 풀면 거대한 이미지. 파일 크기 검사로는 안 잡히고 헤더로 잡아야 한다."""
    bomb = encode(Image.new("1", (8000, 7000)), "PNG")
    assert len(bomb) < MAX_UPLOAD_BYTES
    assert upload(client, admin_headers, bomb).status_code == 413


def test_storage_failure_returns_503(client, admin_headers, fake_storage):
    fake_storage.fail = True
    r = upload(client, admin_headers, encode(Image.new("RGB", (10, 10)), "PNG"))
    assert r.status_code == 503


# ─────────────── 권한 ───────────────
def test_upload_requires_login(client, fake_storage):
    r = upload(client, {}, encode(Image.new("RGB", (10, 10)), "PNG"))
    assert r.status_code == 401


def test_upload_is_admin_only(client, user_headers, fake_storage):
    r = upload(client, user_headers, encode(Image.new("RGB", (10, 10)), "PNG"))
    assert r.status_code == 403
    assert fake_storage.saved == []


# ─────────────── 저장소 ───────────────
def test_image_key_ignores_original_file_name():
    """원래 이름을 쓰면 경로 조작을 막아야 하고, 이름 자체가 정보를 흘리기도 한다."""
    key = new_image_key()
    assert key.startswith("posts/") and key.endswith(".webp")
    assert ".." not in key


def test_local_storage_writes_file_and_returns_backend_url(tmp_path):
    local = LocalImageStorage(tmp_path, "http://localhost:8000/")
    url = local.save("posts/2026/09/abc.webp", b"data", "image/webp")
    assert (tmp_path / "posts/2026/09/abc.webp").read_bytes() == b"data"
    assert url == "http://localhost:8000/uploads/posts/2026/09/abc.webp"


def capture_httpx(monkeypatch, status_code: int = 200):
    calls = []

    def fake_post(url, *, content, headers, timeout):
        calls.append({"url": url, "headers": headers, "content": content})
        return httpx.Response(
            status_code, request=httpx.Request("POST", url), text="error body"
        )

    monkeypatch.setattr(storage_module.httpx, "post", fake_post)
    return calls


def test_supabase_storage_sends_secret_key_as_apikey_header(monkeypatch):
    """새 형식 키는 JWT가 아니라 apikey 헤더로만 보내야 한다. Bearer로 보내면 인증이 안 된다."""
    calls = capture_httpx(monkeypatch)
    supa = SupabaseImageStorage("https://proj.supabase.co/", "sb_secret_abc", "imgs")
    url = supa.save("posts/a.webp", b"data", "image/webp")

    call = calls[0]
    assert call["url"] == "https://proj.supabase.co/storage/v1/object/imgs/posts/a.webp"
    assert call["headers"]["apikey"] == "sb_secret_abc"
    assert "authorization" not in call["headers"]
    assert "max-age" in call["headers"]["cache-control"]
    assert url == "https://proj.supabase.co/storage/v1/object/public/imgs/posts/a.webp"


def test_supabase_storage_adds_bearer_for_legacy_jwt_key(monkeypatch):
    calls = capture_httpx(monkeypatch)
    SupabaseImageStorage("https://p.supabase.co", "eyJhbGciOi.legacy", "b").save(
        "k.webp", b"d", "image/webp"
    )
    assert calls[0]["headers"]["authorization"] == "Bearer eyJhbGciOi.legacy"


def test_supabase_rejection_raises_storage_error(monkeypatch):
    capture_httpx(monkeypatch, status_code=403)
    supa = SupabaseImageStorage("https://p.supabase.co", "sb_secret_x", "b")
    with pytest.raises(StorageError):
        supa.save("k.webp", b"d", "image/webp")


def test_locally_saved_image_is_served_by_backend(client, admin_headers):
    """로컬 모드는 백엔드가 /uploads 경로로 이미지를 직접 내준다. 올리고 받아와 본다."""
    from urllib.parse import urlparse

    r = upload(client, admin_headers, encode(Image.new("RGB", (40, 30)), "PNG"))
    assert r.status_code == 201
    path = urlparse(r.json()["url"]).path
    assert path.startswith("/uploads/posts/")

    try:
        served = client.get(path)
        assert served.status_code == 200
        assert served.headers["content-type"] == "image/webp"
        assert Image.open(io.BytesIO(served.content)).size == (40, 30)
    finally:
        (storage_module.upload_dir() / path.removeprefix("/uploads/")).unlink()


def test_upload_fails_loudly_when_storage_is_not_configured(
    client, admin_headers, monkeypatch
):
    """배포에서 Supabase 설정을 깜빡했을 때, 사라질 디스크에 조용히 저장하면 안 된다."""
    monkeypatch.setattr(storage_module, "_storage", None)
    r = upload(client, admin_headers, encode(Image.new("RGB", (10, 10)), "PNG"))
    assert r.status_code == 503


def test_local_folder_is_disabled_when_not_allowed(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(settings, "ALLOW_LOCAL_UPLOADS", False)
    assert storage_module._build_storage() is None

    monkeypatch.setattr(settings, "SUPABASE_URL", "https://p.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SECRET_KEY", "sb_secret_x")
    assert isinstance(storage_module._build_storage(), SupabaseImageStorage)


# ─────────────── 저장소 삭제 ───────────────
def test_local_storage_delete_removes_file_and_ignores_missing(tmp_path):
    local = LocalImageStorage(tmp_path, "http://localhost:8000")
    local.save("guestbook/a.webp", b"data", "image/webp")
    local.delete("guestbook/a.webp")
    assert not (tmp_path / "guestbook/a.webp").exists()
    local.delete("guestbook/a.webp")  # 이미 없어도 에러가 아니다


def capture_httpx_delete(monkeypatch, status_code: int = 200):
    calls = []

    def fake_delete(url, *, headers, timeout):
        calls.append({"url": url, "headers": headers})
        return httpx.Response(
            status_code, request=httpx.Request("DELETE", url), text="body"
        )

    monkeypatch.setattr(storage_module.httpx, "delete", fake_delete)
    return calls


def test_supabase_delete_sends_apikey(monkeypatch):
    calls = capture_httpx_delete(monkeypatch)
    SupabaseImageStorage("https://p.supabase.co", "sb_secret_x", "b").delete(
        "guestbook/a.webp"
    )
    assert (
        calls[0]["url"] == "https://p.supabase.co/storage/v1/object/b/guestbook/a.webp"
    )
    assert calls[0]["headers"] == {"apikey": "sb_secret_x"}


def test_supabase_delete_treats_missing_file_as_done(monkeypatch):
    """이미 지워진 파일이면 목적은 달성된 것이다."""
    capture_httpx_delete(monkeypatch, status_code=404)
    SupabaseImageStorage("https://p.supabase.co", "sb_secret_x", "b").delete("k.webp")


def test_supabase_delete_failure_raises(monkeypatch):
    capture_httpx_delete(monkeypatch, status_code=403)
    with pytest.raises(StorageError):
        SupabaseImageStorage("https://p.supabase.co", "sb_secret_x", "b").delete("k")


def test_quiet_delete_never_raises(monkeypatch):
    """글은 이미 지워졌으니, 파일 삭제 실패 때문에 요청 전체를 실패시키지 않는다."""

    class Broken:
        def delete(self, key):
            raise StorageError

    monkeypatch.setattr(storage_module, "_storage", Broken())
    storage_module.delete_image_quietly("guestbook/a.webp")
    storage_module.delete_image_quietly(None)
