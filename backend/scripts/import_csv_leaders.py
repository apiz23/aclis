"""
Import leaders from Gemini-extracted CSV (no IC numbers).

CSV columns: Name, Title/Kampung, Address, Phone, Mukim, Kampung Rangkaian

Usage (dry run):
    py -3.12 backend/scripts/import_csv_leaders.py --file leaders.csv --dry-run

Usage (real import):
    py -3.12 backend/scripts/import_csv_leaders.py --file leaders.csv
"""
from __future__ import annotations
import argparse
import csv
import re
import sys
from pathlib import Path

_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from scripts.models import MukimRow, KampungRow, LeaderRow, RejectRow
from scripts.supabase_writer import make_writer, SupabaseWriter


# --- Title parsing ---

_TITLE_PREFIXES = [
    ("ketua masyarakat", "ketua_masyarakat"),
    ("ketua kampung",    "ketua_kampung"),
    ("penghulu",         "penghulu"),
]


def _parse_title(title: str) -> tuple[str, str]:
    """
    Parse 'Title/Kampung' field.
    Returns (type, kampung_name).

    Examples:
      "Ketua Kampung Sawah Batu 4"                         → ('ketua_kampung', 'Sawah Batu 4')
      "Penghulu Mukim Benut"                               → ('penghulu', '')
      "Ketua Masyarakat Cina Kampung Baru Bagan Ayer Baloi"→ ('ketua_masyarakat', 'Cina Kampung Baru Bagan Ayer Baloi')
    """
    t = title.strip()
    lower = t.lower()
    for prefix, role in _TITLE_PREFIXES:
        if lower.startswith(prefix):
            remainder = t[len(prefix):].strip()
            if role == "penghulu":
                # e.g. "Penghulu Mukim Benut" — kampung not applicable
                return role, ""
            return role, remainder
    # Fallback: treat whole string as kampung name
    return "ketua_kampung", t


# --- CSV parsing ---

def _read_rows(csv_path: str) -> tuple[list[str], list[list[str]]]:
    """
    Return (headers, data_rows) handling both normal and double-encoded CSV.

    Double-encoded: Gemini exports each row as a single quoted field whose
    value is itself a CSV row. Detected when the header line parses to 1 field
    containing commas (e.g. "Name,Title/Kampung,...").
    """
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        raw_reader = csv.reader(f)
        header_raw = next(raw_reader, [])
        data_raw = list(raw_reader)

    if len(header_raw) == 1 and "," in header_raw[0]:
        # Double-encoded: unwrap each field through a second csv.reader pass
        headers = next(csv.reader([header_raw[0]]))
        rows = []
        for raw in data_raw:
            if not raw:
                continue
            inner = next(csv.reader([raw[0]]), [])
            if inner:
                rows.append(inner)
        return headers, rows
    else:
        return header_raw, data_raw


def _clean(val: str) -> str:
    v = val.strip()
    return "" if v.lower() in ("n/a", "na", "-", "") else v


def _primary_phone(phone: str) -> str:
    """Keep only the first number when multiple separated by ' / '."""
    return phone.split("/")[0].strip()


def parse_csv_leaders(csv_path: str) -> tuple[list[LeaderRow], list[RejectRow]]:
    headers, rows = _read_rows(csv_path)
    leaders: list[LeaderRow] = []
    rejects: list[RejectRow] = []

    for row_num, cells in enumerate(rows, start=2):
        row = dict(zip(headers, cells))

        name  = _clean(row.get("Name", ""))
        title = _clean(row.get("Title/Kampung", ""))
        address = _clean(row.get("Address", ""))
        phone_raw = _clean(row.get("Phone", ""))
        mukim_raw = _clean(row.get("Mukim", ""))
        rangkaian = _clean(row.get("Kampung Rangkaian", ""))

        if not name:
            continue

        phone = _primary_phone(phone_raw) if phone_raw else ""
        mukim_name = re.sub(r"^[Mm]ukim\s+", "", mukim_raw).strip() or mukim_raw

        if not title:
            rejects.append(RejectRow(csv_path, "CSV", row_num,
                                     "missing Title/Kampung", f"name={name}"))
            continue

        leader_type, kampung_name = _parse_title(title)

        leaders.append(LeaderRow(
            name=name,
            type=leader_type,
            kampung_name=kampung_name,
            mukim_name=mukim_name,
            phone=phone,
            address=address,
            kampung_rangkaian=rangkaian,
        ))

    return leaders, rejects


# --- Import ---

def import_csv_leaders(csv_path: str, writer: SupabaseWriter) -> dict:
    leaders, rejects = parse_csv_leaders(csv_path)
    print(f"Parsed {len(leaders)} leaders, {len(rejects)} rejects")

    # Collect unique mukims
    mukim_id_map: dict[str, str] = {}
    for l in leaders:
        if l.mukim_name and l.mukim_name not in mukim_id_map:
            mid = writer.upsert_mukim(MukimRow(name=l.mukim_name))
            mukim_id_map[l.mukim_name] = mid

    # Collect unique kampungs (skip empty — penghulu has no kampung)
    kampung_id_map: dict[str, str] = {}
    for l in leaders:
        if l.kampung_name and l.kampung_name not in kampung_id_map:
            mukim_id = mukim_id_map.get(l.mukim_name, "")
            kid = writer.upsert_kampung(
                KampungRow(name=l.kampung_name, mukim_name=l.mukim_name),
                mukim_id=mukim_id,
            )
            kampung_id_map[l.kampung_name] = kid

    print(f"Upserted {len(mukim_id_map)} mukims, {len(kampung_id_map)} kampungs")

    # Insert leaders (no IC → INSERT not upsert; re-runs should truncate first)
    inserted = 0
    skipped = 0
    for l in leaders:
        kampung_id = kampung_id_map.get(l.kampung_name)
        payload = {
            "name":               l.name,
            "type":               l.type,
            "kampung_id":         kampung_id,
            "phone":              l.phone or None,
            "address":            l.address or None,
            "kampung_rangkaian":  l.kampung_rangkaian or None,
        }
        if writer._dry_run:
            print(f"  [dry-run] INSERT aclis_leader name={l.name!r} type={l.type} mukim={l.mukim_name!r}")
            inserted += 1
        else:
            try:
                writer._client.table("aclis_leader").insert(payload).execute()
                inserted += 1
            except Exception as e:
                rejects.append(RejectRow(csv_path, "CSV", 0,
                                         f"insert failed: {e}", l.name))
                skipped += 1

    print(f"Leaders: {inserted} inserted, {skipped} failed")
    return {"leaders": inserted, "mukims": len(mukim_id_map),
            "kampungs": len(kampung_id_map), "rejects": rejects}


# --- CLI ---

def main() -> int:
    parser = argparse.ArgumentParser(description="Import leaders from CSV")
    parser.add_argument("--file", required=True, help="Path to leaders CSV")
    parser.add_argument("--dry-run", action="store_true", help="No DB writes")
    args = parser.parse_args()

    writer = make_writer(dry_run=args.dry_run)
    result = import_csv_leaders(args.file, writer)

    if result["rejects"]:
        print(f"\n{len(result['rejects'])} rejects (see import_rejects.csv)")
        import csv as _csv
        with open("import_rejects.csv", "w", newline="", encoding="utf-8") as f:
            w = _csv.writer(f)
            w.writerow(["source_file", "sheet", "row_num", "reason", "raw_data"])
            for r in result["rejects"]:
                w.writerow([r.source_file, r.sheet, r.row_num, r.reason, r.raw_data])

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
