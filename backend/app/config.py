from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "App Web Reserva Zona de Parrilla"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_key: str

    # PostgreSQL directo (Supabase connection string)
    database_url: str


settings = Settings()  # type: ignore[call-arg]
