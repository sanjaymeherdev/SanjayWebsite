-- Run once in Supabase: SQL Editor. Creates a public-read bucket where only the admin can write.
-- Change the email below if your admin account is different (it must match the account you sign in with).
insert into storage.buckets (id, name, public, file_size_limit)
values ('models', 'models', true, 52428800)           -- 50 MB per file (free-plan maximum)
on conflict (id) do nothing;

create policy "models: anyone can read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'models');

create policy "models: admin can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'models' and lower(auth.jwt() ->> 'email') = 'graphicyin@gmail.com');

create policy "models: admin can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'models' and lower(auth.jwt() ->> 'email') = 'graphicyin@gmail.com');
