from app.ai import ai, reset_ai_provider
reset_ai_provider()
p = ai()
print("summary:", p.summarize_report("Bulan Jun: gotong-royong, mesyuarat penduduk, pembersihan longkang."))
print("insights:", p.trend_insights({"kampung_count": 14, "open_issues": 5}))
