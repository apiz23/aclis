"""
Insert 2 leaders missing from DB (not matched during photo upload).
  - ZULKEFLEE BIN SAIERI    (AIR BALOI mukim, AB-01)
  - HISHAMUDDIN BIN HAJI AJIB (PONTIAN mukim, PTN-04)

kampung_id left null — set via leader edit form once admin knows the kampung.
After running, re-run upload_leader_photos.py to link their photos.
"""
from __future__ import annotations
import os, sys
from pathlib import Path

_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from dotenv import load_dotenv
load_dotenv(_backend / ".env")

from supabase import create_client

def main():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb  = create_client(url, key)

    leaders = [
        {
            "name":            "ZULKEFLEE BIN SAIERI",
            "ic_no":           "641119015745",
            "type":            "ketua_kampung",
            "tarikh_lantikan": "2025-06-01",
            "kampung_id":      None,
        },
        {
            "name":            "HISHAMUDDIN BIN HAJI AJIB",
            "ic_no":           "640501016533",
            "type":            "ketua_kampung",
            "tarikh_lantikan": "2025-06-01",
            "kampung_id":      None,
        },
    ]

    for l in leaders:
        # Skip if already exists
        existing = sb.table("aclis_leader").select("id").eq("ic_no", l["ic_no"]).execute().data
        if existing:
            print(f"  [skip] {l['name']} already in DB (id={existing[0]['id']})")
            continue
        payload = {k: v for k, v in l.items() if v is not None}
        result  = sb.table("aclis_leader").insert(payload).execute()
        if result.data:
            print(f"  [ok] Inserted {l['name']} -> id={result.data[0]['id']}")
        else:
            print(f"  [err] Failed to insert {l['name']}")

if __name__ == "__main__":
    main()
