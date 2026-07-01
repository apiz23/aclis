"""
Wire aclis_app_user.leader_id for a non-admin user.

Usage:
  py scripts/wire_user_leader.py <user_email_or_id> <leader_name_or_ic>

Examples:
  py scripts/wire_user_leader.py ketua@example.com "AHMAD BIN ALI"
  py scripts/wire_user_leader.py ketua@example.com 650310036782

The script:
1. Finds the auth user by email (or use UUID directly as user_id)
2. Finds the leader by partial name match or IC
3. Updates aclis_app_user.leader_id
"""
from __future__ import annotations
import os, sys, re
from pathlib import Path

_backend = Path(__file__).parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from dotenv import load_dotenv
load_dotenv(_backend / ".env")
from supabase import create_client

def main():
    if len(sys.argv) < 3:
        print("Usage: py scripts/wire_user_leader.py <user_email_or_id> <leader_name_or_ic>")
        sys.exit(1)

    user_ref   = sys.argv[1].strip()
    leader_ref = sys.argv[2].strip()

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    # --- resolve user ID ---
    if re.match(r"^[0-9a-f-]{36}$", user_ref, re.I):
        user_id = user_ref
        print(f"Using user ID: {user_id}")
    else:
        auth_users = sb.auth.admin.list_users()
        matched = [u for u in auth_users if getattr(u, "email", "") == user_ref]
        if not matched:
            print(f"No auth user found with email: {user_ref}")
            sys.exit(1)
        user_id = matched[0].id
        print(f"Found user: {user_ref} -> {user_id}")

    # --- resolve leader ---
    ic_digits = re.sub(r"[^0-9]", "", leader_ref)
    if len(ic_digits) == 12:
        lrows = sb.table("aclis_leader").select("id, name, ic_no").eq("ic_no", ic_digits).execute().data
    else:
        lrows = sb.table("aclis_leader").select("id, name, ic_no").ilike("name", f"%{leader_ref}%").execute().data

    if not lrows:
        print(f"No leader found matching: {leader_ref}")
        sys.exit(1)
    if len(lrows) > 1:
        print(f"Multiple leaders matched '{leader_ref}' — be more specific:")
        for r in lrows:
            print(f"  {r['id']}  {r['name']}  {r['ic_no']}")
        sys.exit(1)

    leader = lrows[0]
    print(f"Found leader: {leader['name']} ({leader['id']})")

    # --- update aclis_app_user ---
    existing = sb.table("aclis_app_user").select("id").eq("id", user_id).execute().data
    if existing:
        sb.table("aclis_app_user").update({"leader_id": leader["id"]}).eq("id", user_id).execute()
        print(f"Updated aclis_app_user.leader_id = {leader['id']}")
    else:
        sb.table("aclis_app_user").insert({"id": user_id, "leader_id": leader["id"]}).execute()
        print(f"Inserted aclis_app_user row with leader_id = {leader['id']}")

    print("Done.")

if __name__ == "__main__":
    main()
