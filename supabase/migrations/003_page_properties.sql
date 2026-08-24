-- Content OS — propiedades por página
-- Correr este archivo entero en el SQL Editor de Supabase.
-- Es seguro correrlo más de una vez.

-- Campo libre donde cada tipo de página guarda sus propios datos.
-- Igual que `content` en los bloques: al ser JSON, sumar un tipo de página
-- nuevo con campos propios no necesita ninguna migración más.
--
--   script (guion) → { "status": "idea", "platform": "instagram" }
--   hook           → { "category": "...", "rating": 5 }   (a futuro)
--
-- Las páginas que no usan propiedades simplemente lo dejan en {}.
alter table pages
  add column if not exists properties jsonb not null default '{}'::jsonb;

-- Para poder filtrar por propiedades sin recorrer toda la tabla
-- (por ejemplo: todos los guiones en estado "grabado").
create index if not exists pages_properties_idx on pages using gin (properties);
