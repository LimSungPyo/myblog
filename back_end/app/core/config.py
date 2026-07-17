from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DB: PostgreSQL 전용. 기본값은 로컬 docker-compose Postgres(localhost, 비민감)라 그대로 둠.
    # 배포용 진짜 URL(Supabase 비번 포함)은 코드에 없고 대시보드에서만 주입.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/myblog"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        # Render/Heroku/Supabase 등은 postgres:// 로 주는데 SQLAlchemy 2.0은 미인식 → 정규화
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+psycopg2://", 1)
        if not v.startswith("postgresql"):
            raise ValueError(
                "이 프로젝트는 PostgreSQL 전용입니다. DATABASE_URL은 postgresql:// 형식이어야 합니다."
            )
        return v

    # JWT — 기본값 없음(필수). 값은 .env(로컬)/대시보드(배포)에서만 주입.
    # 미설정 시 서버가 아예 안 켜짐(fail-closed) → 약한 키로 배포되는 사고 방지.
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7일

    # 관리자 시드 계정 — 기본값 없음(필수). .env/대시보드에서만 주입.
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str

    # CORS: 프론트(Vercel) 오리진. 콤마로 여러 개 지정 가능.
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]


settings = Settings()
