-- Private photo storage and the request-expiry schedule.

-- Rule 5: photos live in a private bucket. Nothing is public; the app asks for
-- a short-lived signed URL, which storage only issues if these policies allow
-- the caller to read the object.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Objects are stored as "<owner user id>/<file name>".
create policy "photos: owner or match can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and private.can_view_photo((storage.foldername(name))[1]));

create policy "photos: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Expire unanswered requests every 5 minutes.
create extension if not exists pg_cron;
select cron.schedule('expire-requests', '*/5 * * * *', $$select private.expire_requests()$$);
