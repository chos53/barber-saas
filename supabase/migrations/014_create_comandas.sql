create table if not exists comandas (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references companies(id) on delete cascade,

  client_id uuid references clients(id) on delete set null,

  professional_id uuid references professionals(id) on delete set null,

  status text not null default 'open',

  total numeric(10,2) not null default 0,

  notes text,

  created_at timestamptz default now(),

  closed_at timestamptz
);

create table if not exists comanda_items (
  id uuid primary key default gen_random_uuid(),

  comanda_id uuid not null references comandas(id) on delete cascade,

  service_id uuid references services(id) on delete set null,

  product_id uuid,

  description text not null,

  quantity integer not null default 1,

  price numeric(10,2) not null default 0,

  created_at timestamptz default now()
);

alter table comandas enable row level security;
alter table comanda_items enable row level security;

create policy "Users can view comandas from company"
on comandas
for select
using (
  company_id in (
    select company_id
    from profiles
    where id = auth.uid()
  )
);

create policy "Users can insert comandas from company"
on comandas
for insert
with check (
  company_id in (
    select company_id
    from profiles
    where id = auth.uid()
  )
);

create policy "Users can update comandas from company"
on comandas
for update
using (
  company_id in (
    select company_id
    from profiles
    where id = auth.uid()
  )
);

create policy "Users can delete comandas from company"
on comandas
for delete
using (
  company_id in (
    select company_id
    from profiles
    where id = auth.uid()
  )
);

create policy "Users can view comanda items"
on comanda_items
for select
using (
  comanda_id in (
    select id
    from comandas
    where company_id in (
      select company_id
      from profiles
      where id = auth.uid()
    )
  )
);

create policy "Users can insert comanda items"
on comanda_items
for insert
with check (
  comanda_id in (
    select id
    from comandas
    where company_id in (
      select company_id
      from profiles
      where id = auth.uid()
    )
  )
);

create policy "Users can update comanda items"
on comanda_items
for update
using (
  comanda_id in (
    select id
    from comandas
    where company_id in (
      select company_id
      from profiles
      where id = auth.uid()
    )
  )
);

create policy "Users can delete comanda items"
on comanda_items
for delete
using (
  comanda_id in (
    select id
    from comandas
    where company_id in (
      select company_id
      from profiles
      where id = auth.uid()
    )
  )
);