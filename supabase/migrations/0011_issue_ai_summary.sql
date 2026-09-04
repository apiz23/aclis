-- Migration 0011 — Add ai_summary column to aclis_issue

ALTER TABLE public.aclis_issue
  ADD COLUMN IF NOT EXISTS ai_summary text;
