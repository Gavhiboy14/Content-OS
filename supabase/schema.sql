-- Content OS — esquema inicial
-- Correr este archivo entero en el SQL Editor de tu proyecto de Supabase.

create extension if not exists "pgcrypto";

-- Una sola tabla genérica para TODAS las páginas del workspace:
-- clientes, subpáginas de cliente, recursos, categorías, lo que sea.
-- La estructura de árbol vive en parent_id (relación padre/hijo).
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null default '',
  icon text default '📄',
  parent_id uuid references pages(id) on delete cascade,
  -- tipo semántico de la página: 'home' | 'client' | 'resource' | 'category' | 'page' | ...
  -- se usa para elegir comportamiento/plantilla, NO para el texto del sidebar.
  type text not null default 'page',
  -- encabezado de grupo en el sidebar para páginas de nivel raíz, ej: 'CLIENTES', 'RECURSOS'.
  -- null = la página no pertenece a ningún grupo (aparece suelta, como "Inicio").
  section text,
  -- orden entre hermanos (mismo parent_id) o entre páginas raíz del mismo section.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_parent_id_idx on pages (parent_id);
create index if not exists pages_parent_position_idx on pages (parent_id, position);

-- Mantiene updated_at al día en cada UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pages_set_updated_at on pages;
create trigger pages_set_updated_at
  before update on pages
  for each row
  execute function set_updated_at();

-- Página de inicio inicial, para que el sidebar no arranque vacío.
insert into pages (title, slug, icon, parent_id, type, section, position)
select 'Inicio', 'inicio', '🏠', null, 'home', null, 0
where not exists (select 1 from pages where type = 'home');
