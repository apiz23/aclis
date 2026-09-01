from __future__ import annotations
import os
from supabase import create_client, Client
from scripts.models import MukimRow, KampungRow, LeaderRow


class SupabaseWriter:
    def __init__(self, client: Client, supabase_url: str, dry_run: bool = False):
        self._client = client
        self._url = supabase_url.rstrip("/")
        self._dry_run = dry_run

    def upsert_mukim(self, row: MukimRow) -> str:
        """Upsert aclis_mukim by name; return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_mukim name={row.name!r}")
            return "dry-run"
        result = (
            self._client.table("aclis_mukim")
            .upsert({"name": row.name, "parlimen": row.parlimen, "dun": row.dun},
                    on_conflict="name")
            .execute()
        )
        return result.data[0]["id"]

    def upsert_kampung(self, row: KampungRow, mukim_id: str) -> str:
        """Upsert aclis_kampung (name+mukim_id unique); return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_kampung name={row.name!r} mukim={mukim_id}")
            return "dry-run"
        result = (
            self._client.table("aclis_kampung")
            .upsert(
                {"name": row.name, "mukim_id": mukim_id,
                 "profile": row.profile, "b40_count": row.b40_count},
                on_conflict="name,mukim_id",
            )
            .execute()
        )
        return result.data[0]["id"]

    def upsert_leader(self, row: LeaderRow, kampung_id: str) -> str:
        """Upsert aclis_leader by ic_no; return id."""
        if self._dry_run:
            print(f"  [dry-run] upsert aclis_leader ic=<redacted>")
            return "dry-run"
        payload: dict = {
            "name": row.name,
            "ic_no": row.ic_no,
            "type": row.type,
            "kampung_id": kampung_id,
            "parti_lantikan": row.parti_lantikan,
            "parti_terkini": row.parti_terkini,
        }
        if row.tarikh_lantikan:
            payload["tarikh_lantikan"] = row.tarikh_lantikan
        if row.photo_url:
            payload["photo_url"] = row.photo_url
        result = (
            self._client.table("aclis_leader")
            .upsert(payload, on_conflict="ic_no")
            .execute()
        )
        return result.data[0]["id"]

    def upload_leader_photo(self, ic_no: str, photo_bytes: bytes,
                            content_type: str = "image/jpeg") -> str:
        """Upload photo to Storage; return public URL."""
        filename = f"{ic_no}.jpg"
        if self._dry_run:
            print(f"  [dry-run] upload photo {filename}")
            return self.get_public_url(filename)
        (
            self._client.storage.from_("aclis_leader_photos")
            .upload(
                path=filename,
                file=photo_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        )
        return self.get_public_url(filename)

    def get_public_url(self, filename: str) -> str:
        return f"{self._url}/storage/v1/object/public/aclis_leader_photos/{filename}"


def make_writer(dry_run: bool = False) -> SupabaseWriter:
    """Build SupabaseWriter from environment. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(url, key)
    return SupabaseWriter(client=client, supabase_url=url, dry_run=dry_run)
