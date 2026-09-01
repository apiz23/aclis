from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""
    ai_provider: str = "mock"
    cors_origins: str = "http://localhost:3000"
    jamai_token: str = ""
    jamai_project_id: str = ""
    jamai_model: str = "openai/gpt-4o-mini"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
