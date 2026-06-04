# Upscale CRM

Client & task management for small marketing agencies.

## Setup

### 1. Supabase — create tables

Run this SQL in your Supabase SQL editor:

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text default '',
  email text default '',
  phone text default '',
  status text check (status in ('lead','active','paused','finished')) default 'lead',
  notes text default '',
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  title text not null,
  description text default '',
  priority text check (priority in ('low','medium','high')) default 'medium',
  due_date date,
  assignee text default '',
  status text check (status in ('pending','in_progress','done')) default 'pending',
  created_at timestamptz default now()
);
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Find these in your Supabase project under **Settings → API**.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub
2. Import repo in Vercel
3. Add the two env vars in Vercel project settings
4. Deploy
