-- ============================================================
-- 經銷商核心公關品申請網站 - 資料庫結構（v2）
-- 到 Supabase 後台 -> SQL Editor -> 貼上整段執行
-- 如果你已經執行過舊版 schema，先把 applications 和 roster 兩張表刪除再重新執行這份
-- ============================================================

create extension if not exists "pgcrypto";

drop table if exists applications;
drop table if exists roster;

-- 1. 名單表：你維護，核心申請時只能讀取、不能修改
create table roster (
  id uuid primary key default gen_random_uuid(),
  project text not null,              -- 項目，例如「26Q3 團隊長公關品贊助」
  rank text not null,                 -- 位階，例如「團隊長」
  applicant_name text not null,       -- 申請人
  subsidy_amount numeric not null,    -- 商品補助金
  created_at timestamptz default now()
);

-- 2. 申請表：核心送出的每一筆申請
create table applications (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid references roster(id) on delete set null,
  project text not null,
  rank text not null,
  applicant_name text not null,
  subsidy_amount numeric not null,
  event_theme text not null,          -- 活動主題
  event_period text not null,         -- 活動期間（顯示用字串，如 2026/09/01 - 2026/09/15）
  event_content text not null,        -- 活動內容
  items jsonb not null,               -- 公關品統整，例如 [{"product":"面膜","spec":"10入","qty":"5","amount":"250"}]
  recipient_name text not null,       -- 收件人姓名
  recipient_phone text not null,      -- 收件人電話
  recipient_address text not null,    -- 收件地址
  status text not null default '待審' check (status in ('待審','核准','退回')),
  review_note text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table roster enable row level security;
alter table applications enable row level security;

create policy "roster_public_read" on roster for select using (true);
create policy "roster_admin_write" on roster for insert with check (auth.role() = 'authenticated');
create policy "roster_admin_update" on roster for update using (auth.role() = 'authenticated');
create policy "roster_admin_delete" on roster for delete using (auth.role() = 'authenticated');

create policy "applications_public_read" on applications for select using (true);
create policy "applications_public_insert" on applications for insert with check (true);
create policy "applications_admin_update" on applications for update using (auth.role() = 'authenticated');
