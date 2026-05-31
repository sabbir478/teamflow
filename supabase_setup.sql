-- ═══════════════════════════════════════════════
-- TeamFlow — Supabase Database Setup
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_initials text,
  avatar_color text default '#7C5CFC',
  role text default 'member' check (role in ('admin','member')),
  created_at timestamp with time zone default now()
);

-- TASKS
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  deadline date,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  status text default 'Pending' check (status in ('Pending','Working','Review','Completed')),
  priority text default 'Medium' check (priority in ('High','Medium','Low')),
  tags text[] default '{}',
  created_at timestamp with time zone default now()
);

-- COMMENTS
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- MESSAGES (team chat)
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- ── Auto-create profile on signup ──────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, avatar_initials, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 1) || 
          coalesce(split_part(coalesce(new.raw_user_meta_data->>'name',''), ' ', 2),'?')),
    (array['#7C5CFC','#00D4AA','#FF6B6B','#FFB84D','#4DFFB4'])[floor(random()*5+1)]
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Row Level Security ──────────────────────────────
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;
alter table messages enable row level security;

-- Everyone logged in can read all profiles/tasks/messages
create policy "profiles_read" on profiles for select using (auth.role() = 'authenticated');
create policy "tasks_read"    on tasks    for select using (auth.role() = 'authenticated');
create policy "comments_read" on comments for select using (auth.role() = 'authenticated');
create policy "messages_read" on messages for select using (auth.role() = 'authenticated');

-- Anyone logged in can insert
create policy "tasks_insert"    on tasks    for insert with check (auth.role() = 'authenticated');
create policy "comments_insert" on comments for insert with check (auth.role() = 'authenticated');
create policy "messages_insert" on messages for insert with check (auth.role() = 'authenticated');
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Task update: assigned person or creator
create policy "tasks_update" on tasks for update
  using (auth.uid() = assigned_to or auth.uid() = created_by or
         exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Task delete: admin only
create policy "tasks_delete" on tasks for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
