from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    ai_provider: str = "mock"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
