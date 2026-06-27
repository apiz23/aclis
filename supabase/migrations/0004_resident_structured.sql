alter table aclis_resident
  add column if not exists name    text,
  add column if not exists ic_no   text,
  add column if not exists phone   text,
  add column if not exists b40_status bool default false,
  add column if not exists address text;
