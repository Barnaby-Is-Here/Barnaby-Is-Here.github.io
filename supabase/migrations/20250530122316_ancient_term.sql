create table recipes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  path text not null,
  ingredients text[] not null,
  method text not null,
  tags text[] not null,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table recipes enable row level security;

-- Create a policy that allows all operations
create policy "Enable all operations for authenticated users" on recipes
  for all using (auth.role() = 'authenticated');

-- Create storage bucket for recipe photos
insert into storage.buckets (id, name) values ('recipe-photos', 'recipe-photos');

-- Set storage policy
create policy "Allow authenticated users to upload images"
  on storage.objects for insert
  with check (bucket_id = 'recipe-photos' and auth.role() = 'authenticated');

create policy "Allow public read access to images"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');