from unittest.mock import MagicMock, patch
from scripts.supabase_writer import SupabaseWriter
from scripts.models import MukimRow, KampungRow, LeaderRow


def _make_writer() -> tuple[SupabaseWriter, MagicMock]:
    """Return (writer, mock_client) for inspection."""
    mock_client = MagicMock()
    # Simulate upsert().execute() returning a row with an id
    mock_client.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": "test-uuid-1234"}
    ]
    writer = SupabaseWriter(client=mock_client, supabase_url="https://test.supabase.co",
                            dry_run=False)
    return writer, mock_client


def test_upsert_mukim_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    mukim_id = writer.upsert_mukim(MukimRow(name="Benut", parlimen="P148", dun="N37"))
    mock_client.table.assert_called_with("aclis_mukim")
    assert mukim_id == "test-uuid-1234"


def test_upsert_kampung_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    kampung_id = writer.upsert_kampung(
        KampungRow(name="Kg. Bukit", mukim_name="Benut"), mukim_id="mukim-uuid"
    )
    mock_client.table.assert_called_with("aclis_kampung")
    assert kampung_id == "test-uuid-1234"


def test_upsert_leader_calls_table(leaders_xlsx):
    writer, mock_client = _make_writer()
    leader_id = writer.upsert_leader(
        LeaderRow(name="Ahmad", ic_no="800101011234", type="ketua_kampung",
                  kampung_name="Kg. Bukit", mukim_name="Benut"),
        kampung_id="kampung-uuid",
    )
    mock_client.table.assert_called_with("aclis_leader")
    assert leader_id == "test-uuid-1234"


def test_dry_run_skips_writes():
    mock_client = MagicMock()
    writer = SupabaseWriter(client=mock_client, supabase_url="https://test.supabase.co",
                            dry_run=True)
    result = writer.upsert_mukim(MukimRow(name="Benut"))
    mock_client.table.assert_not_called()
    assert result == "dry-run"


def test_upload_photo_calls_storage():
    writer, mock_client = _make_writer()
    mock_client.storage.from_.return_value.upload.return_value = MagicMock()
    writer.upload_leader_photo(ic_no="800101011234", photo_bytes=b"\x89PNG")
    mock_client.storage.from_.assert_called_with("aclis_leader_photos")


def test_get_public_url():
    writer, _ = _make_writer()
    url = writer.get_public_url("800101011234.jpg")
    assert url.startswith("https://test.supabase.co/storage/v1/object/public/aclis_leader_photos/")
