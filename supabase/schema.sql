create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  subthemes text[] not null default '{}',
  summary text not null,
  why_it_matters text,
  notes text,
  keywords text[] not null default '{}',
  source_type text,
  source_url text,
  source_label text,
  added_via text,
  submitted_at timestamptz default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  theme text not null,
  subthemes text[] not null default '{}',
  summary text not null,
  why_it_matters text,
  notes text,
  keywords text[] not null default '{}',
  status text not null default 'to-read' check (status in ('to-read', 'published')),
  source_type text,
  source_url text,
  source_label text,
  added_via text,
  submitted_at timestamptz default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists terms_category_idx on public.terms (category);
create index if not exists reads_theme_idx on public.reads (theme);
create index if not exists reads_status_idx on public.reads (status);

drop trigger if exists set_terms_updated_at on public.terms;
create trigger set_terms_updated_at
before update on public.terms
for each row
execute function public.set_updated_at();

drop trigger if exists set_reads_updated_at on public.reads;
create trigger set_reads_updated_at
before update on public.reads
for each row
execute function public.set_updated_at();

alter table public.terms enable row level security;
alter table public.reads enable row level security;

drop policy if exists "Public can read terms" on public.terms;
create policy "Public can read terms"
on public.terms
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read reads" on public.reads;
create policy "Public can read reads"
on public.reads
for select
to anon, authenticated
using (true);
