-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor
-- after running schema.sql
-- ============================================================

-- Vector similarity search for RAG
-- Returns the most relevant training document chunks for a given embedding.
create or replace function match_training_docs(
  query_embedding vector(1536),
  match_profile_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    training_docs.id,
    training_docs.content,
    1 - (training_docs.embedding <=> query_embedding) as similarity
  from training_docs
  where profile_id = match_profile_id
    and embedding is not null
  order by training_docs.embedding <=> query_embedding
  limit match_count;
end;
$$;
