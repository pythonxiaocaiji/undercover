from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from urllib.parse import quote_plus


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    app_name: str = "undercover-backend"

    cors_origins: str = "http://localhost:3000"

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_db: str = "undercover"

    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None

    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24 * 7

    admin_phones: str = ""

    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.cors_origins
        if not v:
            return ["http://localhost:3000"]
        parts = [p.strip() for p in v.split(",")]
        return [p for p in parts if p]

    @property
    def mysql_dsn(self) -> str:
        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        return (
            f"mysql+asyncmy://{user}:{password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}?charset=utf8mb4"
        )

    @property
    def admin_phones_list(self) -> list[str]:
        raw = (self.admin_phones or "").strip()
        if not raw:
            return []
        parts = [p.strip() for p in raw.split(",")]
        return [p for p in parts if p]


settings = Settings()
