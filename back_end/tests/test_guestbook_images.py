"""방명록 사진 — 회원이 올리는 이미지의 안전장치."""

import io

import pytest
from PIL import ExifTags, Image

from app.core import ratelimit
from app.core import storage as storage_module
from app.core.ratelimit import IMAGE_BY_USER
from app.models import GuestbookEntry
from tests.test_uploads import encode, phone_photo


class FakeStorage:
    def __init__(self) -> None:
        self.saved: dict[str, tuple[bytes, str, str]] = {}
        self.deleted: list[str] = []

    def save(self, key, data, content_type, cache_control=storage_module.CACHE_CONTROL):
        self.saved[key] = (data, content_type, cache_control)
        return self.public_url(key)

    def delete(self, key):
        self.deleted.append(key)

    def public_url(self, key):
        return f"https://cdn.test/{key}"


@pytest.fixture
def fake_storage(monkeypatch):
    fake = FakeStorage()
    monkeypatch.setattr(storage_module, "_storage", fake)
    return fake


def png(size=(300, 200)) -> bytes:
    return encode(Image.new("RGB", size, "blue"), "PNG")


def post(client, headers, content="", image: bytes | None = None, **extra):
    files = {"image": ("photo.png", image, "image/png")} if image is not None else None
    return client.post(
        "/guestbook", data={"content": content, **extra}, files=files, headers=headers
    )


def only_saved(fake: FakeStorage) -> tuple[str, bytes, str, str]:
    assert len(fake.saved) == 1
    key, (data, content_type, cache) = next(iter(fake.saved.items()))
    return key, data, content_type, cache


# ─────────────── 올리기 ───────────────
def test_post_with_text_and_image(client, user_headers, fake_storage):
    r = post(client, user_headers, "사진과 함께 인사", png())
    assert r.status_code == 201
    key, data, content_type, _ = only_saved(fake_storage)
    assert key.startswith("guestbook/") and key.endswith(".webp")
    assert content_type == "image/webp"
    assert r.json()["imageUrl"] == f"https://cdn.test/{key}"
    assert r.json()["content"] == "사진과 함께 인사"
    # 저장 경로(키)는 응답에 싣지 않는다
    assert "imageKey" not in r.json()


def test_image_only_post_is_allowed(client, user_headers, fake_storage):
    r = post(client, user_headers, "", png())
    assert r.status_code == 201
    assert r.json()["content"] == ""
    assert r.json()["imageUrl"]


def test_text_only_post_still_works(client, user_headers, fake_storage):
    r = post(client, user_headers, "글만")
    assert r.status_code == 201
    assert r.json()["imageUrl"] is None
    assert fake_storage.saved == {}


def test_empty_post_is_rejected(client, user_headers, fake_storage):
    """글도 사진도 없는 방명록은 받지 않는다. 공백만 있어도 빈 글이다."""
    r = post(client, user_headers, "   ")
    assert r.status_code == 422
    assert r.json()["detail"] == "글이나 사진 중 하나는 남겨주세요."


def test_image_is_shrunk_to_guestbook_width(client, user_headers, fake_storage):
    """방명록 카드는 본문보다 좁아서 1000px로 줄인다. 글 이미지(1600px)보다 작게 저장된다."""
    post(client, user_headers, "넓은 사진", png(size=(3000, 1000)))
    _, data, _, _ = only_saved(fake_storage)
    assert Image.open(io.BytesIO(data)).size == (1000, 333)


def test_location_is_removed_from_member_photos(client, user_headers, fake_storage):
    """회원이 집에서 찍은 사진이면 GPS가 곧 집 주소다."""
    post(client, user_headers, "폰 사진", phone_photo())
    _, data, _, _ = only_saved(fake_storage)
    assert not Image.open(io.BytesIO(data)).getexif().get_ifd(ExifTags.IFD.GPSInfo)


def test_member_images_use_short_cache(client, user_headers, fake_storage):
    """내려야 할 때 CDN에 남은 복사본이 오래 나가지 않도록 캐시를 짧게 준다."""
    post(client, user_headers, "사진", png())
    _, _, _, cache = only_saved(fake_storage)
    assert cache == storage_module.SHORT_CACHE_CONTROL


def test_non_image_is_rejected_and_nothing_is_saved(
    client, db_session, user_headers, fake_storage
):
    r = post(client, user_headers, "가짜 사진", b"<script>alert(1)</script>")
    assert r.status_code == 415
    assert fake_storage.saved == {}
    assert db_session.query(GuestbookEntry).count() == 0


def test_client_cannot_attach_an_image_by_address(client, user_headers, fake_storage):
    """사진 주소나 저장 경로를 직접 적어 보내도 무시된다. 서버가 올린 파일만 붙는다."""
    r = post(
        client,
        user_headers,
        "주소로 붙여보기",
        imageUrl="https://tracker.example/pixel.png",
        image_key="posts/2026/09/someone-elses.webp",
    )
    assert r.status_code == 201
    assert r.json()["imageUrl"] is None


# ─────────────── 한도 ───────────────
def test_daily_image_quota_blocks_images_but_not_text(
    client, user_headers, regular_user, fake_storage
):
    """하루 사진 한도를 다 쓰면 사진은 막히지만, 글만 쓰는 건 계속 된다."""
    for _ in range(IMAGE_BY_USER.limit):
        ratelimit.record(f"image:guestbook:{regular_user.id}", IMAGE_BY_USER)

    assert post(client, user_headers, "사진 하나 더", png()).status_code == 429
    assert fake_storage.saved == {}
    assert post(client, user_headers, "글은 괜찮아요").status_code == 201


def test_text_posts_do_not_use_image_quota(client, user_headers, regular_user):
    post(client, user_headers, "글만")
    assert (
        ratelimit.store.peek(f"image:guestbook:{regular_user.id}", IMAGE_BY_USER)
        is None
    )


# ─────────────── 저장소 설정이 없을 때 ───────────────
def test_missing_storage_blocks_only_images(client, user_headers, monkeypatch):
    monkeypatch.setattr(storage_module, "_storage", None)
    assert post(client, user_headers, "사진", png()).status_code == 503
    assert post(client, user_headers, "글만").status_code == 201


# ─────────────── 지우면 파일도 ───────────────
def test_owner_delete_removes_image_file(client, user_headers, fake_storage):
    entry = post(client, user_headers, "지울 사진", png()).json()
    key = next(iter(fake_storage.saved))
    assert (
        client.delete(f"/me/guestbook/{entry['id']}", headers=user_headers).status_code
        == 204
    )
    assert fake_storage.deleted == [key]


def test_admin_delete_removes_image_file(
    client, user_headers, admin_headers, fake_storage
):
    """부적절한 사진을 관리자가 내리면 주소로도 더는 볼 수 없어야 한다."""
    entry = post(client, user_headers, "문제 사진", png()).json()
    key = next(iter(fake_storage.saved))
    r = client.delete(f"/admin/guestbook/{entry['id']}", headers=admin_headers)
    assert r.status_code == 204
    assert fake_storage.deleted == [key]


def test_withdraw_removes_only_my_image_files(
    client, user_headers, admin_headers, fake_storage
):
    post(client, user_headers, "내 사진", png())
    my_key = next(iter(fake_storage.saved))
    post(client, admin_headers, "관리자 사진", png())

    r = client.post(
        "/me/withdraw", json={"confirmation": "탈퇴합니다"}, headers=user_headers
    )
    assert r.status_code == 204
    assert fake_storage.deleted == [my_key]


def test_saved_file_is_removed_if_entry_cannot_be_saved(
    client, user_headers, fake_storage, monkeypatch
):
    """사진은 올렸는데 글 저장이 실패하면, 그 사진은 아무도 가리키지 않는 파일이 된다."""

    def broken_create(*args, **kwargs):
        raise RuntimeError("DB가 잠깐 죽었다")

    monkeypatch.setattr("app.crud.guestbook.create", broken_create)
    with pytest.raises(RuntimeError):
        post(client, user_headers, "실패할 글", png())
    key = next(iter(fake_storage.saved))
    assert fake_storage.deleted == [key]


# ─────────────── 보여주기 ───────────────
def test_list_and_mypage_include_image_url(client, user_headers, fake_storage):
    post(client, user_headers, "사진 글", png())
    post(client, user_headers, "글만")
    items = client.get("/guestbook").json()["items"]
    assert {i["content"]: bool(i["imageUrl"]) for i in items} == {
        "사진 글": True,
        "글만": False,
    }

    mine = client.get("/me/activity", headers=user_headers).json()["guestbook"]
    assert {g["content"]: bool(g["imageUrl"]) for g in mine} == {
        "사진 글": True,
        "글만": False,
    }
