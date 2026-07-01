"""
Upload extracted leader photos to Supabase Storage and link to aclis_leader.

Flow:
  1. Read extracted/data/image_map.csv → each photo's sheet + row position
  2. Read each mukim *_clean.csv to get IC number + name for that row
  3. Upload photo to 'leader-photos' bucket as '{ic_no}.{ext}'
  4. Get public URL
  5. UPDATE aclis_leader SET photo_url=? WHERE ic_no=?
     Fallback: WHERE LOWER(name) LIKE ? (name match within mukim)

Usage:
    # Preview what will be matched — no uploads, no DB writes
    py -3.12 backend/scripts/upload_leader_photos.py --dry-run

    # Real run
    py -3.12 backend/scripts/upload_leader_photos.py
"""
from __future__ import annotations
import argparse
import csv
import os
import re
import sys
from pathlib import Path

import pandas as pd

_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from dotenv import load_dotenv
load_dotenv(_backend / ".env")

from supabase import create_client, Client

EXTRACTED   = Path(__file__).parent.parent.parent / "extracted"
IMAGE_MAP   = EXTRACTED / "data" / "image_map.csv"
PHOTO_DIR   = EXTRACTED / "photos"
BUCKET      = "aclis-leader-photos"

# IC column name varies per sheet
IC_COL_CANDIDATES = ["NO. KAD PENGENALAN", "NO. K/P ", "NO. K/P", "IC"]


# ── helpers ──────────────────────────────────────────────────────────────────

def _supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env")
        sys.exit(1)
    return create_client(url, key)


def _ic_col(df: pd.DataFrame) -> str | None:
    for c in IC_COL_CANDIDATES:
        if c in df.columns:
            return c
    # Try case-insensitive
    for col in df.columns:
        if "pengenalan" in col.lower() or "k/p" in col.lower():
            return col
    return None


def _normalise_ic(raw: str) -> str:
    """Strip to digits only — DB stores IC without hyphens."""
    return re.sub(r"[^0-9]", "", str(raw).strip())


def _clean_sheet_name(name: str) -> str:
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip()


def _ext_to_mime(ext: str) -> str:
    return {".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg"}.get(
        ext.lower(), "application/octet-stream"
    )


def _ensure_bucket(sb: Client, dry_run: bool):
    try:
        sb.storage.get_bucket(BUCKET)
        print(f"  Bucket '{BUCKET}' exists.")
    except Exception:
        if dry_run:
            print(f"  [dry-run] Would create public bucket '{BUCKET}'")
        else:
            sb.storage.create_bucket(BUCKET, options={"public": True})
            print(f"  Created public bucket '{BUCKET}'")


# ── core ─────────────────────────────────────────────────────────────────────

def build_photo_leader_map() -> list[dict]:
    """
    Returns a list of dicts:
      {image_file, sheet, bil_estimate, ic_no, name, mukim, photo_path}
    """
    # Load clean CSVs once per sheet
    sheet_dfs: dict[str, pd.DataFrame] = {}

    results = []
    with open(IMAGE_MAP, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sheet = row["sheet"]
            bil   = row["bil_estimate"]
            fname = row["image_file"]

            photo_path = PHOTO_DIR / fname
            if not photo_path.exists() or photo_path.stat().st_size == 0:
                print(f"  [skip] {fname} — file missing or empty (WMF/corrupt)")
                continue

            ext = photo_path.suffix.lower()
            if ext not in (".png", ".jpeg", ".jpg"):
                print(f"  [skip] {fname} — unsupported format {ext}")
                continue

            # Load clean CSV for this sheet (cached)
            if sheet not in sheet_dfs:
                safe = _clean_sheet_name(sheet)
                csv_path = EXTRACTED / "data" / f"{safe}_clean.csv"
                if not csv_path.exists():
                    print(f"  [warn] No clean CSV for sheet '{sheet}' at {csv_path}")
                    sheet_dfs[sheet] = pd.DataFrame()
                else:
                    sheet_dfs[sheet] = pd.read_csv(csv_path, encoding="utf-8-sig", dtype=str)

            df = sheet_dfs[sheet]
            if df.empty:
                continue

            # bil_estimate is 1-based row position in the data section
            try:
                row_idx = int(bil) - 1
            except (ValueError, TypeError):
                print(f"  [skip] {fname} — invalid bil_estimate '{bil}'")
                continue

            if row_idx < 0 or row_idx >= len(df):
                print(f"  [skip] {fname} — bil_estimate {bil} out of range (sheet has {len(df)} rows)")
                continue

            leader_row = df.iloc[row_idx]
            ic_col = _ic_col(df)
            ic_raw = leader_row[ic_col].strip() if ic_col else ""
            ic_no  = _normalise_ic(ic_raw)
            name   = str(leader_row.get("NAMA KETUA KAMPUNG", "")).strip()
            mukim  = str(leader_row.get("MUKIM", sheet)).strip()

            if not ic_no:
                print(f"  [warn] {fname} → {name!r} — no IC number in CSV")

            results.append({
                "image_file":   fname,
                "sheet":        sheet,
                "bil_estimate": bil,
                "ic_no":        ic_no,
                "name":         name,
                "mukim":        mukim,
                "photo_path":   photo_path,
                "ext":          ext,
            })

    return results


def upload_and_link(entries: list[dict], sb: Client, dry_run: bool) -> dict:
    matched = unmatched = uploaded = skipped = failed = 0

    for e in entries:
        ic_no = e["ic_no"]
        name  = e["name"]
        fname = e["image_file"]
        path  = e["photo_path"]
        ext   = e["ext"]

        # Storage key: use IC number as filename for uniqueness
        storage_key = f"{ic_no or name.replace(' ', '_')}{ext}"

        # -- Find leader in DB --
        leader_id = None
        match_method = None

        if ic_no:
            rows = sb.table("aclis_leader").select("id, name, ic_no") \
                     .eq("ic_no", ic_no).execute().data
            if not rows and len(ic_no) == 12:
                # Try hyphenated format in case DB stores with hyphens
                ic_hyphen = f"{ic_no[:6]}-{ic_no[6:8]}-{ic_no[8:]}"
                rows = sb.table("aclis_leader").select("id, name, ic_no") \
                         .eq("ic_no", ic_hyphen).execute().data
            if rows:
                leader_id = rows[0]["id"]
                match_method = f"ic_no={ic_no}"

        if not leader_id and name:
            # Fallback: name match (case-insensitive, strip titles)
            name_core = re.sub(
                r"^(ENCIK|TUAN HAJI|PUAN|TUAN|HAJJAH|ENCIK HAJI)\s+",
                "", name, flags=re.IGNORECASE
            ).strip()
            rows = sb.table("aclis_leader").select("id, name, ic_no") \
                     .ilike("name", f"%{name_core}%").execute().data
            if rows:
                leader_id = rows[0]["id"]
                match_method = f"name~{name_core!r}"

        if not leader_id:
            print(f"  [no match] {fname} → {name!r} (IC={ic_no or 'none'})")
            unmatched += 1
            continue

        matched += 1

        # -- Upload to storage --
        if dry_run:
            print(f"  [dry-run] UPLOAD {fname} → {BUCKET}/{storage_key}  (match: {match_method})")
            print(f"           UPDATE aclis_leader id={leader_id} SET photo_url=<url>")
            uploaded += 1
            continue

        try:
            with open(path, "rb") as f:
                data = f.read()

            sb.storage.from_(BUCKET).upload(
                path=storage_key,
                file=data,
                file_options={"content-type": _ext_to_mime(ext), "upsert": "true"},
            )

            public_url = sb.storage.from_(BUCKET).get_public_url(storage_key)

            # Update leader record
            update_payload: dict = {"photo_url": public_url}
            if ic_no and not rows[0].get("ic_no"):   # type: ignore[index]
                update_payload["ic_no"] = ic_no

            sb.table("aclis_leader").update(update_payload) \
              .eq("id", leader_id).execute()

            print(f"  [ok] {fname} → {name!r}  ({match_method})")
            uploaded += 1

        except Exception as ex:
            print(f"  [error] {fname} → {name!r}: {ex}")
            failed += 1

    return {
        "total":     len(entries),
        "matched":   matched,
        "unmatched": unmatched,
        "uploaded":  uploaded,
        "failed":    failed,
    }


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Upload leader photos to Supabase Storage")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen — no uploads, no DB writes")
    args = parser.parse_args()

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Upload leader photos to Supabase Storage\n")

    # 1. Build photo→leader map from extracted CSVs
    print("-- Building photo-to-leader mapping --")
    entries = build_photo_leader_map()
    print(f"  {len(entries)} photos mapped to leaders\n")

    if not entries:
        print("Nothing to do.")
        return

    # 2. Connect to Supabase
    sb = _supabase()
    _ensure_bucket(sb, args.dry_run)

    # 3. Upload + link
    print(f"\n-- {'Preview' if args.dry_run else 'Uploading'} ({len(entries)} photos) --")
    stats = upload_and_link(entries, sb, args.dry_run)

    # 4. Summary
    print(f"""
-- Summary --
  Total photos   : {stats['total']}
  Matched in DB  : {stats['matched']}
  No DB match    : {stats['unmatched']}  (leaders not in DB yet — import leaders first)
  Uploaded/done  : {stats['uploaded']}
  Failed         : {stats['failed']}
""")

    if stats["unmatched"] > 0:
        print("Tip: run import_csv_leaders.py first to populate aclis_leader,")
        print("     then re-run this script to link photos.")


if __name__ == "__main__":
    main()
