-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text unique,
  email text,
  role text not null default 'client' check (role in ('client', 'staff', 'admin')),
  avatar_url text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'vi')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can manage all profiles" on public.profiles
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- STAFF
-- ============================================================
create table public.staff (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles on delete cascade not null unique,
  bio text,
  specialties text[] default '{}',
  is_active boolean not null default true,
  color text not null default '#ec4899'
);

alter table public.staff enable row level security;

create policy "Anyone can view active staff" on public.staff
  for select using (is_active = true);

create policy "Admins can manage staff" on public.staff
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- SERVICE CATEGORIES
-- ============================================================
create table public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_vi text not null,
  sort_order int not null default 0
);

alter table public.service_categories enable row level security;
create policy "Anyone can view categories" on public.service_categories for select using (true);
create policy "Admins can manage categories" on public.service_categories
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- SERVICES
-- ============================================================
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.service_categories on delete set null,
  name_en text not null,
  name_vi text not null,
  description_en text,
  description_vi text,
  duration_minutes int not null default 60,
  price int not null, -- in cents
  is_active boolean not null default true,
  image_url text
);

alter table public.services enable row level security;
create policy "Anyone can view active services" on public.services for select using (is_active = true);
create policy "Admins can manage services" on public.services
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- STAFF AVAILABILITY (weekly schedule)
-- ============================================================
create table public.staff_availability (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references public.staff on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  is_available boolean not null default true,
  unique (staff_id, day_of_week)
);

alter table public.staff_availability enable row level security;
create policy "Anyone can view staff availability" on public.staff_availability for select using (true);
create policy "Admins can manage availability" on public.staff_availability
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Staff can update own availability" on public.staff_availability
  for update using (
    exists (select 1 from public.staff s where s.id = staff_id and s.profile_id = auth.uid())
  );

-- ============================================================
-- STAFF TIME OFF
-- ============================================================
create table public.staff_time_off (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references public.staff on delete cascade not null,
  date date not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.staff_time_off enable row level security;
create policy "Anyone can view time off" on public.staff_time_off for select using (true);
create policy "Admins can manage time off" on public.staff_time_off
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- PROMO CODES
-- ============================================================
create table public.promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value int not null, -- percent or cents
  min_order_amount int not null default 0,
  max_uses int,
  uses_count int not null default 0,
  valid_from date not null default current_date,
  valid_until date,
  is_active boolean not null default true
);

alter table public.promo_codes enable row level security;
create policy "Anyone can view active promo codes" on public.promo_codes
  for select using (is_active = true);
create policy "Admins can manage promo codes" on public.promo_codes
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.profiles on delete set null not null,
  staff_id uuid references public.staff on delete set null not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','deposit_paid','paid','refunded')),
  stripe_payment_intent_id text,
  total_amount int not null default 0,
  deposit_amount int not null default 0,
  discount_amount int not null default 0,
  promo_code_id uuid references public.promo_codes on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Clients can view own appointments" on public.appointments
  for select using (client_id = auth.uid());

create policy "Clients can create appointments" on public.appointments
  for insert with check (client_id = auth.uid());

create policy "Clients can update own pending appointments" on public.appointments
  for update using (client_id = auth.uid() and status in ('pending','confirmed'));

create policy "Staff can view their appointments" on public.appointments
  for select using (
    exists (select 1 from public.staff s where s.id = staff_id and s.profile_id = auth.uid())
  );

create policy "Staff can update appointment status" on public.appointments
  for update using (
    exists (select 1 from public.staff s where s.id = staff_id and s.profile_id = auth.uid())
  );

create policy "Admins can manage all appointments" on public.appointments
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- APPOINTMENT SERVICES (line items)
-- ============================================================
create table public.appointment_services (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references public.appointments on delete cascade not null,
  service_id uuid references public.services on delete set null not null,
  price int not null
);

alter table public.appointment_services enable row level security;
create policy "Users can view appointment services" on public.appointment_services
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.client_id = auth.uid()
          or exists (select 1 from public.staff s where s.id = a.staff_id and s.profile_id = auth.uid())
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

create policy "Users can insert appointment services" on public.appointment_services
  for insert with check (
    exists (select 1 from public.appointments a where a.id = appointment_id and a.client_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

-- ============================================================
-- WAITLIST
-- ============================================================
create table public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.profiles on delete cascade not null,
  staff_id uuid references public.staff on delete set null,
  service_id uuid references public.services on delete set null not null,
  preferred_date date not null,
  preferred_time_start time not null,
  preferred_time_end time not null,
  status text not null default 'waiting'
    check (status in ('waiting','notified','booked','expired')),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
create policy "Clients manage own waitlist" on public.waitlist
  using (client_id = auth.uid());
create policy "Admins view all waitlist" on public.waitlist
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- LOYALTY ACCOUNTS
-- ============================================================
create table public.loyalty_accounts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.profiles on delete cascade not null unique,
  points int not null default 0,
  total_earned int not null default 0,
  total_redeemed int not null default 0
);

alter table public.loyalty_accounts enable row level security;
create policy "Clients view own loyalty" on public.loyalty_accounts
  for select using (client_id = auth.uid());
create policy "Admins view all loyalty" on public.loyalty_accounts
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- LOYALTY TRANSACTIONS
-- ============================================================
create table public.loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.profiles on delete cascade not null,
  appointment_id uuid references public.appointments on delete set null,
  points int not null,
  type text not null check (type in ('earned','redeemed','expired')),
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.loyalty_transactions enable row level security;
create policy "Clients view own transactions" on public.loyalty_transactions
  for select using (client_id = auth.uid());
create policy "Admins view all transactions" on public.loyalty_transactions
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- SEED: DEFAULT SERVICE CATEGORIES
-- ============================================================
insert into public.service_categories (name_en, name_vi, sort_order) values
  ('Manicure', 'Làm Móng Tay', 1),
  ('Pedicure', 'Làm Móng Chân', 2),
  ('Gel & Acrylic', 'Gel & Acrylic', 3),
  ('Nail Art', 'Vẽ Móng', 4),
  ('Add-ons', 'Dịch Vụ Thêm', 5);

-- ============================================================
-- SEED: DEFAULT SERVICES
-- ============================================================
insert into public.services (category_id, name_en, name_vi, duration_minutes, price) values
  ((select id from public.service_categories where name_en = 'Manicure'), 'Classic Manicure', 'Làm Móng Tay Cơ Bản', 45, 2500),
  ((select id from public.service_categories where name_en = 'Manicure'), 'Gel Manicure', 'Làm Móng Tay Gel', 60, 3500),
  ((select id from public.service_categories where name_en = 'Pedicure'), 'Classic Pedicure', 'Làm Móng Chân Cơ Bản', 60, 3000),
  ((select id from public.service_categories where name_en = 'Pedicure'), 'Gel Pedicure', 'Làm Móng Chân Gel', 75, 4500),
  ((select id from public.service_categories where name_en = 'Gel & Acrylic'), 'Full Set Acrylic', 'Đắp Bột Acrylic', 90, 5500),
  ((select id from public.service_categories where name_en = 'Gel & Acrylic'), 'Gel Extensions', 'Nối Móng Gel', 90, 6000),
  ((select id from public.service_categories where name_en = 'Nail Art'), 'Simple Nail Art', 'Vẽ Móng Đơn Giản', 30, 1500),
  ((select id from public.service_categories where name_en = 'Nail Art'), 'Complex Nail Art', 'Vẽ Móng Phức Tạp', 60, 3000),
  ((select id from public.service_categories where name_en = 'Add-ons'), 'Nail Repair', 'Sửa Móng', 15, 500),
  ((select id from public.service_categories where name_en = 'Add-ons'), 'Paraffin Wax Treatment', 'Tắm Sáp Paraffin', 20, 1000);
