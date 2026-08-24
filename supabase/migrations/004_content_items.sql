-- Content OS — separación entre navegación y contenido
-- Correr este archivo entero en el SQL Editor de Supabase.
-- Es seguro correrlo más de una vez.
--
-- QUÉ CAMBIA
--
--   pages          → sólo estructura de navegación (lo que se ve en el sidebar)
--   content_items  → lo que se produce dentro de una página: guiones, ideas,
--                    hooks, referencias, publicaciones, tareas
--   blocks         → el cuerpo de texto, ahora de una página O de un contenido
--
-- Un guión deja de ser una subpágina y pasa a ser un contenido dentro de la
-- página que corresponda.

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  -- 'guion' | 'idea' | 'hook' | 'referencia' | 'publicacion' | 'tarea'
  -- Sumar un tipo nuevo no necesita migración: se registra en el código.
  type text not null,
  title text not null default '',
  -- Campos propios de cada tipo, igual que en pages: estado, plataforma, etc.
  properties jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_page_id_idx on content_items (page_id);
create index if not exists content_items_page_type_idx on content_items (page_id, type, position);
create index if not exists content_items_properties_idx on content_items using gin (properties);

drop trigger if exists content_items_set_updated_at on content_items;
create trigger content_items_set_updated_at
  before update on content_items
  for each row
  execute function set_updated_at();

-- Un bloque pertenece a una página o al cuerpo de un contenido.
-- Si content_item_id es null, el bloque es del cuerpo de la página.
alter table blocks
  add column if not exists content_item_id uuid references content_items(id) on delete cascade;

create index if not exists blocks_content_item_id_idx on blocks (content_item_id);

-- ---------------------------------------------------------------------------
-- Migración de lo que ya existe
-- ---------------------------------------------------------------------------

-- 1. Cada página de tipo 'script' pasa a ser un guión dentro de su página padre.
--    Sus bloques se llevan con ella y la página vieja se elimina.
do $$
declare
  pagina record;
  nuevo_id uuid;
begin
  for pagina in
    select * from pages where type = 'script' and parent_id is not null
  loop
    insert into content_items (page_id, type, title, properties, position)
    values (pagina.parent_id, 'guion', pagina.title, pagina.properties, pagina.position)
    returning id into nuevo_id;

    update blocks
      set content_item_id = nuevo_id, page_id = pagina.parent_id
      where page_id = pagina.id;

    delete from pages where id = pagina.id;
  end loop;
end $$;

-- 2. Los hooks que estaban como bloques pasan a ser contenidos.
do $$
declare
  bloque record;
begin
  for bloque in select * from blocks where type = 'hook' loop
    insert into content_items (page_id, type, title, properties, position)
    values (
      bloque.page_id,
      'hook',
      coalesce(bloque.content->>'text', ''),
      jsonb_build_object(
        'favorite',
        coalesce((bloque.content->>'favorite')::boolean, false)
      ),
      bloque.position
    );

    delete from blocks where id = bloque.id;
  end loop;
end $$;

-- 3. Los tipos de página especiales ya no existen: toda página es una página.
update pages set type = 'page' where type in ('script', 'hook_bank');
