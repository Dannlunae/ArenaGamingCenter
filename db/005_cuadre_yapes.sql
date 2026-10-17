-- 005_cuadre_yapes.sql — cada cuadre guarda una "foto" de los yapes hasta ese momento
-- y puede compararse también contra el total de ventas del sistema (efectivo + yape).

alter table arqueos
  add column yapes_total     numeric(10,2),    -- suma de yapes del turno hasta el momento del cuadre (la calcula el servidor)
  add column yapes_cantidad  int,
  add column sistema_total   numeric(10,2),    -- total de ventas del sistema del negocio (incluye yape), opcional
  add column diferencia_total numeric(10,2) generated always as
    (total_contado + coalesce(yapes_total, 0) - sistema_total) stored;   -- (efectivo + yapes) − sistema_total
