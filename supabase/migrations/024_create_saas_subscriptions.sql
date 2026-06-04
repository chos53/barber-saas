create table if not exists saas_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null default 0,
  max_users integer not null default 1,
  max_professionals integer not null default 1,
  max_monthly_appointments integer not null default 100,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  plan_id uuid references saas_plans(id) on delete set null,
  status text not null default 'trial',
  trial_ends_at timestamptz,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists company_subscriptions_company_id_idx
on company_subscriptions(company_id);

create index if not exists company_subscriptions_plan_id_idx
on company_subscriptions(plan_id);

create index if not exists company_subscriptions_status_idx
on company_subscriptions(status);

alter table saas_plans enable row level security;
alter table company_subscriptions enable row level security;

insert into saas_plans (
  name,
  description,
  price,
  max_users,
  max_professionals,
  max_monthly_appointments,
  active
)
values
  ('Starter', 'Plano inicial para pequenos negócios', 49.90, 2, 3, 300, true),
  ('Pro', 'Plano profissional para barbearias em crescimento', 99.90, 5, 8, 1000, true),
  ('Premium', 'Plano completo para operações maiores', 199.90, 15, 25, 5000, true)
on conflict do nothing;