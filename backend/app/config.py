from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "App Web Reserva Zona de Parrilla"
    debug: bool = False

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # PostgreSQL directo (Supabase connection string)
    database_url: str

    # JWT Auth
    jwt_secret: str = "changeme-super-secret-key-at-least-32-chars"
    jwt_expire_hours: int = 24

    # Admin credentials (hash con bcrypt: python -c "from passlib.hash import bcrypt; print(bcrypt.hash('tu_password'))")
    admin_username: str = "admin"
    admin_password_hash: str = "$2b$12$placeholder.replace.this.with.real.bcrypt.hash"

    # Microsoft Graph / OneDrive
    azure_client_id: str = ""
    azure_tenant_id: str = ""
    azure_client_secret: str = ""
    onedrive_user_id: str = "me"          # UPN o ID del usuario propietario del OneDrive
    onedrive_folder: str = "Comprobantes/ReservasParrilla"

    # Supabase Storage (recomendado — bucket público "vouchers")
    use_supabase_storage: bool = True
    supabase_storage_bucket: str = "vouchers"

    # Habilitar OneDrive (False = fallback a almacenamiento local en /tmp)
    use_onedrive: bool = False


settings = Settings()  # type: ignore[call-arg]
