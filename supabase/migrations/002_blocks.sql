-- Content OS — bloques de contenido
-- Correr este archivo entero en el SQL Editor de Supabase.
-- Es seguro correrlo más de una vez.

-- Cada bloque es una unidad de contenido dentro de una página: un párrafo,
-- un título, un ítem de lista, una tarea.
--
-- La clave de la extensibilidad está en `content`: es JSON, así que cada tipo
-- guarda la forma que necesita sin tocar el esquema. Agregar "guion" o "hook"
-- más adelante es un `type` nuevo, no una migración.
--
--   text          → { "text": "..." }
--   heading       → { "text": "...", "level": 1 | 2 | 3 }
--   bulleted_list → { "text": "..." }
--   todo          → { "text": "...", "checked": true | false }
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null default 'text',
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blocks_page_id_idx on blocks (page_id);
create index if not exists blocks_page_position_idx on blocks (page_id, position);

-- Reusa la función que ya creó schema.sql para mantener updated_at al día.
drop trigger if exists blocks_set_updated_at on blocks;
create trigger blocks_set_updated_at
  before update on blocks
  for each row
  execute function set_updated_at();
