"""OAuth 제공자 레지스트리.

제공자 추가 시: normalize 함수를 만들고 PROVIDERS에 OAuthProvider를 등록한 뒤
config.py에 {NAME}_CLIENT_ID/{NAME}_CLIENT_SECRET 설정을 추가하면 된다.
라우트(/auth/{provider}/login·callback)는 레지스트리를 순회하므로 수정 불필요.
"""

from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class OAuthUserInfo:
    """제공자별 응답을 공통 형태로 정규화한 사용자 정보."""

    provider: str
    provider_user_id: str
    email: str | None
    email_verified: bool
    name: str | None
    picture: str | None


@dataclass(frozen=True)
class OAuthProvider:
    name: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scopes: str
    normalize: Callable[[dict], OAuthUserInfo]

    @property
    def client_id(self) -> str:
        return getattr(settings, f"{self.name.upper()}_CLIENT_ID", "")

    @property
    def client_secret(self) -> str:
        return getattr(settings, f"{self.name.upper()}_CLIENT_SECRET", "")

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    @property
    def redirect_uri(self) -> str:
        return f"{settings.BACKEND_BASE_URL}/auth/{self.name}/callback"

    def authorize_redirect_url(self, state: str) -> str:
        params = urlencode(
            {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "response_type": "code",
                "scope": self.scopes,
                "state": state,
                "prompt": "select_account",
            }
        )
        return f"{self.authorize_url}?{params}"

    def fetch_user_info(self, code: str) -> OAuthUserInfo:
        """authorization code → 액세스 토큰 교환 → 사용자 프로필 조회.

        외부 통신이 모두 여기에 모여 있어 테스트에서 이 메서드만 목킹하면 된다.
        """
        with httpx.Client(timeout=10) as client:
            token_res = client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]
            info_res = client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info_res.raise_for_status()
            return self.normalize(info_res.json())


def _normalize_google(raw: dict) -> OAuthUserInfo:
    return OAuthUserInfo(
        provider="google",
        provider_user_id=raw["sub"],
        email=raw.get("email") or None,
        email_verified=bool(raw.get("email_verified")),
        name=raw.get("name"),
        picture=raw.get("picture"),
    )


PROVIDERS: dict[str, OAuthProvider] = {
    "google": OAuthProvider(
        name="google",
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        # id_token JWKS 검증 대신 TLS로 직접 userinfo를 조회 (더 단순, 동등한 신뢰)
        userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
        scopes="openid email profile",
        normalize=_normalize_google,
    ),
}
