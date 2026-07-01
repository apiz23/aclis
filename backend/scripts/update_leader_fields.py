"""
One-off update script:
  1. Set tarikh_lantikan = 2025-06-01 for ALL aclis_leader rows (current term cycle)
  2. Set address for 6 KMC leaders from extracted/data/KMC_clean.csv

Usage:
    py -3.12 backend/scripts/update_leader_fields.py --dry-run
    py -3.12 backend/scripts/update_leader_fields.py
"""
from __future__ import annotations
import argparse
import csv
import os
import re
import sys
from pathlib import Path

_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from dotenv import load_dotenv
load_dotenv(_backend / ".env")

from supabase import create_client, Client

KMC_CSV = Path(__file__).parent.parent.parent / "extracted" / "data" / "KMC_clean.csv"
NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env")
        sys.exit(1)
    return create_client(url, key)


def _norm_ic(raw: str) -> str:
    return re.sub(r"[^0-9]", "", str(raw).strip())


def _strip_title(name: str) -> str:
    return re.sub(
        r"^(ENCIK|TUAN HAJI|PUAN|TUAN|HAJJAH|ENCIK HAJI)\s+",
        "", name.strip(), flags=re.IGNORECASE
    ).strip()


# ── Step 1: update tarikh_lantikan for ALL leaders ──────────────────────────

def update_all_tarikh(sb: Client, dry_run: bool) -> int:
    if dry_run:
        rows = sb.table("aclis_leader").select("id").execute().data or []
        print(f"  [dry-run] Would UPDATE {len(rows)} leaders SET tarikh_lantikan = '2025-06-01'")
        return len(rows)

    result = (
        sb.table("aclis_leader")
        .update({"tarikh_lantikan": "2025-06-01"})
        .gte("id", NIL_UUID)
        .execute()
    )
    count = len(result.data) if result.data else 0
    print(f"  Updated {count} leaders -> tarikh_lantikan = 2025-06-01")
    return count


# ── Step 2: update address for KMC leaders ──────────────────────────────────

def update_kmc_addresses(sb: Client, dry_run: bool):
    if not KMC_CSV.exists():
        print(f"  ERROR: {KMC_CSV} not found")
        return

    matched = unmatched = 0
    with open(KMC_CSV, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            name_raw = row.get("NAMA KETUA KAMPUNG", "").strip()
            ic_raw   = row.get("NO. K/P ", row.get("NO. K/P", "")).strip()
            address  = row.get("ALAMAT", "").strip()

            if not address:
                continue

            ic_no = _norm_ic(ic_raw)

            # Match by IC first
            leader_id = None
            match_info = ""
            if ic_no:
                rows = sb.table("aclis_leader").select("id, name").eq("ic_no", ic_no).execute().data
                if not rows and len(ic_no) == 12:
                    ic_h = f"{ic_no[:6]}-{ic_no[6:8]}-{ic_no[8:]}"
                    rows = sb.table("aclis_leader").select("id, name").eq("ic_no", ic_h).execute().data
                if rows:
                    leader_id = rows[0]["id"]
                    match_info = f"ic={ic_no}"

            # Fallback: name
            if not leader_id:
                core = _strip_title(name_raw)
                rows = sb.table("aclis_leader").select("id, name").ilike("name", f"%{core}%").execute().data
                if rows:
                    leader_id = rows[0]["id"]
                    match_info = f"name~{core!r}"

            if not leader_id:
                print(f"  [no match] {name_raw!r} (IC={ic_no or 'none'})")
                unmatched += 1
                continue

            matched += 1
            if dry_run:
                print(f"  [dry-run] UPDATE {name_raw!r} ({match_info}) SET address = {address!r}")
            else:
                sb.table("aclis_leader").update({"address": address}).eq("id", leader_id).execute()
                print(f"  [ok] {name_raw!r} ({match_info}) -> address set")

    print(f"  KMC address: {matched} updated, {unmatched} no match")


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tag = "[DRY RUN] " if args.dry_run else ""
    print(f"{tag}Update leader fields\n")

    sb = _supabase()

    print("-- Step 1: tarikh_lantikan -> 2025-06-01 (all leaders) --")
    update_all_tarikh(sb, args.dry_run)

    print("\n-- Step 2: address for KMC leaders --")
    update_kmc_addresses(sb, args.dry_run)

    print("\nDone.")


if __name__ == "__main__":
    main()
