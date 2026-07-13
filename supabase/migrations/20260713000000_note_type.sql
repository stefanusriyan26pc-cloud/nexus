-- Notes: explicit editor type. NULL means "infer from content" so existing
-- notes keep their current behavior (math/markdown notes open as documents,
-- plain ones as quick notes).
alter table public.notes
  add column if not exists note_type text
  check (note_type in ('simple', 'document'));
