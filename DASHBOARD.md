# DASHBOARD.md — MAXCHICHAR Admin Dashboard Spec

> This file specifies the complete content management system for the MAXCHICHAR portfolio.
> Read this alongside CLAUDE.md before building anything in this section.
> The dashboard lives at /dashboard and is completely separate from the public portfolio.

---

## 1. Architecture Decision: Why Supabase

**Stack:** Supabase (PostgreSQL + Auth + Storage) + React dashboard route

**Why not a headless CMS (Sanity/Contentful):**
- You own your data completely — no third-party platform lock-in
- One platform for everything: database, auth, file uploads, real-time
- Free tier: 500MB database, 1GB storage, 50,000 monthly active users
- As a builder, knowing Supabase transfers to every future product you build
- Clients and team members get proper role-based accounts, not shared passwords

**Why not file-based markdown:**
- Markdown files break when non-technical team members edit them
- No image upload, no draft/publish workflow, no multi-user access
- Fine for solo devs, wrong for a team managing live client content

---

## 2. Supabase Setup (Do This Before Running Any Prompts)

### 2.1 Create Project
1. Go to supabase.com → New Project
2. Project name: `maxchichar-portfolio`
3. Database password: save this somewhere safe
4. Region: pick closest to Lagos (eu-west-1 or us-east-1)
5. Copy your `Project URL` and `anon public key` — you'll need these

### 2.2 Environment Variables
Create a `.env` file in your project root:
```
VITE_SUPABASE_URL=https://fvotpyfhzbahtbkudjme.supabase.co
VITE_SUPABASE_ANON_KEY=[sb_publishable_7Rx9pA5kEXugg_oJyW8g7A_JAXBWVCE]
```

Add `.env` to `.gitignore` immediately. Never commit this file.

### 2.3 Database Schema (Run This in Supabase SQL Editor)

```sql
-- USERS / ROLES
-- Supabase handles auth.users automatically
-- We add a profiles table for roles

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'editor')) default 'editor',
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Blog Posts
create table posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image text,
  category text check (category in ('Blockchain', 'Design', 'AI', 'Dev', 'Process', 'Opinion')),
  status text check (status in ('draft', 'published')) default 'draft',
  read_time integer,
  tags text[],
  author_id uuid references profiles(id),
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tagline text,
  description text,
  stack text[],
  live_url text,
  github_url text,
  screenshot text,
  is_flagship boolean default false,
  rank integer,
  year integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Skills
create table skills (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  years integer,
  descriptor text,
  rank integer,
  created_at timestamp with time zone default now()
);

-- Site Settings (key-value store)
create table settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default now()
);

-- Insert default settings
insert into settings (key, value) values
  ('tagline', 'Self-Taught. Serial Builder. Blockchain & AI.'),
  ('availability', 'Open to work · Currently building'),
  ('location', 'Lagos, Nigeria'),
  ('github_url', ''),
  ('twitter_url', ''),
  ('linkedin_url', ''),
  ('email', ''),
  ('github_descriptor', ''),
  ('twitter_descriptor', ''),
  ('linkedin_descriptor', '');

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at before update on posts
  for each row execute function update_updated_at();

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();
```

### 2.4 Row Level Security (RLS) — Critical for Team Access

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table posts enable row level security;
alter table projects enable row level security;
alter table skills enable row level security;
alter table settings enable row level security;

-- Profiles: users can read all, edit only their own
create policy "Anyone can read profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Posts: public can read published, authenticated can do everything
create policy "Public can read published posts" on posts
  for select using (status = 'published');
create policy "Authenticated can manage posts" on posts
  for all using (auth.role() = 'authenticated');

-- Projects: public read, authenticated write
create policy "Public can read projects" on projects for select using (true);
create policy "Authenticated can manage projects" on projects
  for all using (auth.role() = 'authenticated');

-- Skills: public read, authenticated write
create policy "Public can read skills" on skills for select using (true);
create policy "Authenticated can manage skills" on skills
  for all using (auth.role() = 'authenticated');

-- Settings: public read, admin only write
create policy "Public can read settings" on settings for select using (true);
create policy "Authenticated can manage settings" on settings
  for all using (auth.role() = 'authenticated');
```

### 2.5 Storage Buckets
In Supabase Dashboard → Storage → New Bucket:
- `post-covers` — public bucket (blog cover images)
- `project-screenshots` — public bucket (project screenshots)
- `avatars` — public bucket (user profile photos)

---

## 3. User Roles

| Role | Can Do |
|------|--------|
| **admin** | Everything: posts, projects, skills, settings, invite team, delete content |
| **editor** | Create/edit posts and projects. Cannot change settings or manage users. |

You (MAXCHICHAR) are always admin.
Clients or team members get the editor role.

---

## 4. Dashboard Layout

```
/dashboard                    → redirect to /dashboard/posts
/dashboard/login              → login page (email + password)
/dashboard/posts              → post list
/dashboard/posts/new          → new post editor
/dashboard/posts/[id]         → edit post
/dashboard/projects           → project list
/dashboard/projects/new       → new project form
/dashboard/projects/[id]      → edit project
/dashboard/skills             → skills manager
/dashboard/settings           → site settings
/dashboard/team               → team/user management (admin only)
```

### 4.1 Dashboard Shell

```
┌─────────────────────────────────────────────────────────────┐
│  MX  MAXCHICHAR ADMIN          [Avatar] [Name] [Log out]    │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Posts       │                                              │
│  Projects    │         MAIN CONTENT AREA                    │
│  Skills      │                                              │
│  Settings    │                                              │
│  Team (admin)│                                              │
│              │                                              │
│  ─────────── │                                              │
│  View site ↗ │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Design rules for the dashboard:**
- Same dark aesthetic as the portfolio: background #020202, purple accents
- NO film grain, NO galaxy particles, NO entrance animations
- Clean, fast, functional — this is a work tool, not a showpiece
- Sidebar: fixed left, 240px wide, dark zinc background
- Active nav item: left border 2px purple, text white
- All forms: clean inputs, dark background, purple focus ring
- Tables: dark rows, subtle hover highlight

---

## 5. Feature Specs

### 5.1 Blog Post Editor

**List view (/dashboard/posts):**
- Table: Title · Category · Status · Date · Author · Actions
- Status badge: Draft (zinc) / Published (purple)
- Actions: Edit · Duplicate · Delete
- Filter by: Status · Category
- Search by title
- "New Post" button top-right (purple, Bebas Neue)

**Editor (/dashboard/posts/new and /[id]):**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Posts    [DRAFT]                    [Save Draft] [Publish]│
├─────────────────────────────────────────────────────────────┤
│  Title                                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Post title here...                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────┬──────────────────────┐    │
│  │                              │  SETTINGS            │    │
│  │  MARKDOWN EDITOR             │  ──────────────────  │    │
│  │                              │  Slug                │    │
│  │  Full markdown support       │  Category            │    │
│  │  with live preview toggle    │  Tags                │    │
│  │                              │  Excerpt             │    │
│  │                              │  Cover image upload  │    │
│  │                              │  Read time (auto)    │    │
│  │                              │  Published date      │    │
│  └──────────────────────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Editor features:**
- Markdown editor: use `@uiw/react-md-editor` (dark theme, no install bloat)
- Live preview toggle: split view or preview-only
- Slug: auto-generated from title, editable
- Read time: auto-calculated from word count (avg 200 words/min)
- Cover image: drag-and-drop upload → Supabase Storage → returns public URL
- Auto-save draft: every 30 seconds if content has changed
- Save Draft: saves with status 'draft'
- Publish: sets status 'published', sets published_at to now()
- Unpublish: sets status back to 'draft'

### 5.2 Projects Manager

**List view (/dashboard/projects):**
- Drag-and-drop reorder (changes `rank` field)
- Flagship toggle: star icon — only one project can be flagship at a time
- Table: Rank · Name · Stack · Flagship · Live · Actions
- "New Project" button top-right

**Project form (/dashboard/projects/new and /[id]):**
- Name, Tagline, Description (textarea)
- Stack: tag input (type a tech, press Enter to add)
- Live URL, GitHub URL
- Screenshot: drag-and-drop upload → Supabase Storage
- Flagship toggle: checkbox (auto-removes flagship from previous project)
- Year: number input
- Save / Delete buttons

### 5.3 Skills Manager (/dashboard/skills)

- Table of all skills with inline editing
- Drag-and-drop reorder
- Add new skill: inline form at bottom of table
- Fields: Name · Category · Years · Descriptor
- Delete: confirmation before removing

### 5.4 Settings (/dashboard/settings)

Four grouped sections:

**Identity:**
- Tagline (text input)
- Availability status (text input)
- Location (text input)

**Social Links:**
- GitHub URL + descriptor
- X (Twitter) URL + descriptor
- LinkedIn URL + descriptor
- Email

**Bio:**
- Three textarea fields: Paragraph 1, 2, 3
- Character count display

**Danger Zone (admin only):**
- Export all content as JSON
- Clear all draft posts

Save button per section. Success toast on save.

### 5.5 Team Manager (/dashboard/team) — Admin Only

- Table: Name · Email · Role · Joined · Actions
- Invite by email: sends Supabase magic link
- Role assignment: dropdown (admin / editor)
- Revoke access: removes user

---

## 6. Public Portfolio → Supabase Integration

Once the dashboard is built, update these portfolio components to fetch
from Supabase instead of CONTENT.md:

| Component | Supabase Table | Query |
|-----------|---------------|-------|
| Blog Archive | posts | status = 'published', order by published_at desc |
| Single Post | posts | slug = [param] |
| Projects | projects | order by rank asc |
| Skills | skills | order by rank asc |
| Contact | settings | key in ['github_url', 'twitter_url', ...] |
| Hero tagline | settings | key = 'tagline' |
| Availability | settings | key = 'availability' |

Create `/src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## 7. Authentication Flow

```
User visits /dashboard/*
  └─→ Check Supabase session
        ├─→ No session → redirect to /dashboard/login
        └─→ Session exists
              ├─→ Role = admin → full access
              └─→ Role = editor → posts + projects only
                                   settings tab hidden
                                   team tab hidden
```

Login page:
- Email + password form
- Dark aesthetic, MX monogram centered above form
- "Forgot password" → Supabase password reset email
- Error: "Invalid credentials" (never specify which field is wrong)
- No "Sign up" link — users are invited by admin only

---

## 9. Deployment Notes

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. The `/dashboard` route is part of the same Vite build.
   No separate deployment needed.

3. For the invite Edge Function, deploy via Supabase CLI:
   ```bash
   npm install -g supabase
   supabase login
   supabase functions deploy invite-user
   ```
   Add `SUPABASE_SERVICE_ROLE_KEY` as a secret in Supabase dashboard
   (never expose this in client code)

4. Custom domain: set in Supabase → Settings → Custom Domains
   so auth emails come from your domain, not supabase.co

---

## 10. First Login Checklist

After building and deploying:

- [ ] Go to Supabase → Authentication → Users → Invite user
      Enter your email. You'll get a magic link for first login.
- [ ] Set your password after first login
- [ ] Go to Supabase SQL Editor and run:
      `update profiles set role = 'admin' where id = '[your-user-id]';`
- [ ] Log into /dashboard/login — you should have full admin access
- [ ] Add your first blog post
- [ ] Add your projects (Tovo, Nkesa, Recenteris)
- [ ] Fill in settings (social links, tagline, bio)
- [ ] Invite a team member from /dashboard/team

---

_The dashboard is a work tool. Keep it fast, keep it dark, keep it yours._
_Every piece of content on the public portfolio flows from here._
