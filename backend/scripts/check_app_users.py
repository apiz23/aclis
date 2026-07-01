"""
Show aclis_app_user rows + their linked leader/kampung.
Use to find which users need leader_id wired.
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
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    users = sb.table("aclis_app_user").select("id, leader_id").execute().data or []
    print(f"{'USER ID':<38} {'LEADER_ID':<38} {'LEADER NAME':<40} {'KAMPUNG'}")
    print("-" * 130)

    for u in users:
        uid = u["id"]
        lid = u.get("leader_id")
        if lid:
            lrows = sb.table("aclis_leader").select("name, kampung_id, aclis_kampung(name)").eq("id", lid).execute().data
            if lrows:
                r = lrows[0]
                kname = (r.get("aclis_kampung") or {}).get("name") or "(no kampung)"
                print(f"{uid:<38} {lid:<38} {r['name']:<40} {kname}")
            else:
                print(f"{uid:<38} {lid:<38} (leader not found)")
        else:
            print(f"{uid:<38} {'(not set)':<38}")

    print(f"\n{len(users)} app user(s) total.")

if __name__ == "__main__":
    main()
