-- Banco de dados da Canecaria Panda no Supabase.
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo sem perder dados (só cria o que estiver faltando).

-- ------------------------------------------------------------ tabelas
create table if not exists public.configuracoes (
  id int primary key default 1 check (id = 1),
  dados jsonb default '{}'::jsonb
);

create table if not exists public.categorias (
  id text primary key,
  name text,
  slug text unique,
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.produtos (
  id text primary key,
  name text,
  slug text unique,
  category_id text default '',
  sku text default '',
  price numeric(12,2) default 0,
  cost_price numeric(12,2) default 0,
  description text default '',
  images jsonb default '[]'::jsonb,
  art jsonb default '{}'::jsonb,
  active boolean default true,
  featured boolean default false,
  customizable boolean default true,
  custom_label text default '',
  track_stock boolean default false,
  stock int default 0,
  min_stock int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.clientes (
  id text primary key,
  name text,
  phone text default '',
  email text default '',
  document text default '',
  address text default '',
  city text default '',
  birthday text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists clientes_phone_idx on public.clientes (phone);

create table if not exists public.pedidos (
  id text primary key,
  number int not null unique,
  code text not null unique,
  origin text default 'site',
  customer_id text default '',
  customer jsonb default '{}'::jsonb,
  items jsonb default '[]'::jsonb,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  coupon text default '',
  shipping numeric(12,2) default 0,
  total numeric(12,2) default 0,
  delivery text default 'retirada',
  address text default '',
  payment_method text default '',
  paid boolean default false,
  paid_at text default '',
  notes text default '',
  due_date text default '',
  status text default 'novo',
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists pedidos_status_idx on public.pedidos (status);
create index if not exists pedidos_created_idx on public.pedidos (created_at desc);

create table if not exists public.cupons (
  id text primary key,
  code text not null unique,
  type text default 'percent',
  value numeric(12,2) default 0,
  min_total numeric(12,2) default 0,
  active boolean default true,
  expires_at text default '',
  max_uses int default 0,
  uses int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.financeiro (
  id text primary key,
  type text,
  category text default '',
  description text default '',
  amount numeric(12,2) default 0,
  date text,
  paid boolean default true,
  method text default '',
  notes text default '',
  order_id text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists financeiro_date_idx on public.financeiro (date);

create table if not exists public.movimentos_estoque (
  id text primary key,
  product_id text,
  product_name text default '',
  qty int,
  reason text default '',
  order_id text default '',
  at timestamptz default now()
);

create table if not exists public.administradores (
  email text primary key,
  name text default '',
  salt text,
  hash text,
  created_at timestamptz default now()
);

-- Número de versão dos dados: impede que duas gravações simultâneas se atropelem.
create table if not exists public.versao_dados (
  id int primary key default 1 check (id = 1),
  revisao bigint default 0
);
insert into public.versao_dados (id, revisao) values (1, 0) on conflict (id) do nothing;

-- ------------------------------------------------------------ segurança
-- Ninguém acessa as tabelas direto pelo navegador: só a API do site,
-- que usa a chave secreta (service role). Por isso RLS ligado e sem políticas.
alter table public.configuracoes enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.cupons enable row level security;
alter table public.financeiro enable row level security;
alter table public.movimentos_estoque enable row level security;
alter table public.administradores enable row level security;
alter table public.versao_dados enable row level security;

-- ------------------------------------------------------------ gravação atômica
-- Aplica várias inserções/alterações/exclusões de uma vez, numa transação só.
-- p_changes = { "tabela": { "upsert": [linhas], "delete": [chaves] }, ... }
create or replace function public.aplicar_alteracoes(p_expected bigint, p_changes jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  atual bigint;
  tabela text;
  mudancas jsonb;
  chave text;
  colunas text;
  atualiza text;
  permitidas text[] := array['configuracoes','categorias','produtos','clientes','pedidos','cupons','financeiro','movimentos_estoque','administradores'];
begin
  select revisao into atual from versao_dados where id = 1 for update;
  if atual <> p_expected then
    raise exception 'conflito_de_versao' using errcode = 'P0001';
  end if;

  for tabela, mudancas in select * from jsonb_each(p_changes) loop
    if not (tabela = any(permitidas)) then
      raise exception 'tabela não permitida: %', tabela;
    end if;
    chave := case tabela when 'administradores' then 'email' else 'id' end;

    if jsonb_array_length(coalesce(mudancas->'delete', '[]'::jsonb)) > 0 then
      execute format('delete from %I where %I::text = any (select jsonb_array_elements_text($1))', tabela, chave)
        using mudancas->'delete';
    end if;

    if jsonb_array_length(coalesce(mudancas->'upsert', '[]'::jsonb)) > 0 then
      select string_agg(format('%I', column_name), ', ' order by ordinal_position),
             string_agg(format('%I = excluded.%I', column_name, column_name), ', ' order by ordinal_position)
        into colunas, atualiza
        from information_schema.columns
       where table_schema = 'public' and table_name = tabela and column_name <> chave;
      execute format(
        'insert into %I (%I, %s) select %I, %s from jsonb_populate_recordset(null::%I, $1) on conflict (%I) do update set %s',
        tabela, chave, colunas, chave, colunas, tabela, chave, atualiza
      ) using mudancas->'upsert';
    end if;
  end loop;

  update versao_dados set revisao = revisao + 1 where id = 1 returning revisao into atual;
  return atual;
end;
$$;

revoke all on function public.aplicar_alteracoes(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_alteracoes(bigint, jsonb) to service_role;

-- ------------------------------------------------------------ fotos dos produtos
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;
