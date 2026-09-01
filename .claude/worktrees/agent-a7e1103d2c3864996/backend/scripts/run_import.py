"""
ACLIS data import orchestrator.

Usage:
  py -3.12 scripts/run_import.py --discover --leaders path/to/xlsx
  py -3.12 scripts/run_import.py --leaders L.xlsx --issues I.xlsx --evals E.xlsx --dry-run
  py -3.12 scripts/run_import.py --leaders L.xlsx --issues I.xlsx --evals E.xlsx
"""
from __future__ import annotations
import argparse
import csv
import openpyxl
import sys
from pathlib import Path

# Add backend/ to sys.path so `scripts.*` imports work when run directly
_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from scripts.models import MukimRow, KampungRow, RejectRow
from scripts.parse_xlsx import list_sheets, parse_leaders_file, PONTIAN_MUKIM_SHEETS
from scripts.extract_photos import attach_photos
from scripts.supabase_writer import make_writer, SupabaseWriter
from scripts.import_issues import import_issues
from scripts.import_evaluations import import_evaluations


def _write_rejects(rejects: list[RejectRow], out_path: str = "import_rejects.csv") -> None:
    if not rejects:
        return
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source_file", "sheet", "row_num", "reason", "raw_data"])
        for r in rejects:
            w.writerow([r.source_file, r.sheet, r.row_num, r.reason, r.raw_data])
    print(f"Rejects written to {out_path} ({len(rejects)} rows)")


def _import_leaders(
    xlsx_path: str,
    writer: SupabaseWriter,
) -> tuple[dict[str, str], dict[str, str], list[RejectRow]]:
    """
    Full leaders import: parse → extract photos → upsert mukim/kampung/leader.
    Returns (kampung_id_map, leader_id_map, rejects).
    """
    print(f"Parsing leaders from {xlsx_path!r} ...")
    leaders, rejects = parse_leaders_file(xlsx_path)
    print(f"  {len(leaders)} valid rows, {len(rejects)} rejects")

    # Extract and attach photos per sheet
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheets_in_file = wb.sheetnames
    wb.close()

    for sheet_name in sheets_in_file:
        normalized = sheet_name.strip().upper()
        if normalized not in {s.upper() for s in PONTIAN_MUKIM_SHEETS}:
            continue
        sheet_leaders = [l for l in leaders if l.mukim_name == normalized]
        attach_photos(sheet_leaders, xlsx_path, sheet_name)

    # Collect unique mukims and kampungs
    seen_mukims: dict[str, None] = {}
    seen_kampungs: dict[tuple[str, str], None] = {}
    for l in leaders:
        seen_mukims[l.mukim_name] = None
        seen_kampungs[(l.kampung_name, l.mukim_name)] = None

    # Upsert mukims
    mukim_id_map: dict[str, str] = {}
    for mukim_name in seen_mukims:
        mid = writer.upsert_mukim(MukimRow(name=mukim_name))
        mukim_id_map[mukim_name] = mid

    # Upsert kampungs
    kampung_id_map: dict[str, str] = {}
    for (kampung_name, mukim_name) in seen_kampungs:
        mid = mukim_id_map[mukim_name]
        kid = writer.upsert_kampung(KampungRow(name=kampung_name, mukim_name=mukim_name), mukim_id=mid)
        kampung_id_map[kampung_name] = kid

    # Upsert leaders (with photo upload)
    leader_id_map: dict[str, str] = {}
    for l in leaders:
        if l.photo_bytes:
            l.photo_url = writer.upload_leader_photo(l.ic_no, l.photo_bytes)
        kid = kampung_id_map.get(l.kampung_name, "")
        lid = writer.upsert_leader(l, kampung_id=kid)
        leader_id_map[l.ic_no] = lid

    print(f"  Upserted: {len(mukim_id_map)} mukims, "
          f"{len(kampung_id_map)} kampungs, {len(leaders)} leaders")
    return kampung_id_map, leader_id_map, rejects


def main() -> int:
    parser = argparse.ArgumentParser(description="ACLIS data import")
    parser.add_argument("--leaders", help="Path to leaders xlsx (ID KKG UBAH BETUL .xlsx)")
    parser.add_argument("--issues",  help="Path to issues xlsx")
    parser.add_argument("--evals",   help="Path to evaluations xlsx")
    parser.add_argument("--dry-run", action="store_true",
                        help="Log actions without writing to Supabase")
    parser.add_argument("--discover", action="store_true",
                        help="List sheet names in --leaders file and exit")
    args = parser.parse_args()

    if args.discover:
        if not args.leaders:
            print("ERROR: --discover requires --leaders", file=sys.stderr)
            return 1
        sheets = list_sheets(args.leaders)
        print("Sheets found:")
        for s in sheets:
            in_whitelist = s.strip().upper() in {x.upper() for x in PONTIAN_MUKIM_SHEETS}
            flag = " [OK]" if in_whitelist else " (skipped)"
            print(f"  {s}{flag}")
        return 0

    if not args.leaders:
        print("ERROR: --leaders is required", file=sys.stderr)
        return 1

    writer = make_writer(dry_run=args.dry_run)
    all_rejects: list[RejectRow] = []

    kampung_id_map, leader_id_map, rejects = _import_leaders(args.leaders, writer)
    all_rejects.extend(rejects)

    if args.issues:
        print(f"Importing issues from {args.issues!r} ...")
        n = import_issues(args.issues, writer, kampung_id_map)
        print(f"  {n} issues imported")

    if args.evals:
        print(f"Importing evaluations from {args.evals!r} ...")
        n = import_evaluations(args.evals, writer, leader_id_map)
        print(f"  {n} evaluations imported")

    _write_rejects(all_rejects)
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
