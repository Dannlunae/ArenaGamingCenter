# API de caja — reportes, turnos, franjas, comentarios y papelera

Bajo `/api/v1`. Requieren sesión. Errores: `{ "error": "mensaje" }` (400 datos inválidos, 401, 404, 409 regla de negocio, 429 demasiados intentos de login).
Todas las fechas y horas se interpretan y se muestran en **hora de Lima**.

## Reportes de yapes — `GET /reportes/yapes`
Todos los parámetros son opcionales y combinables:

| Parámetro | Valores | Notas |
|---|---|---|
| `rango` | `hoy` `ayer` `7d` `30d` `semana` `mes` `mes_anterior` | `semana` = de lunes a hoy. No se mezcla con `desde`/`hasta`. |
| `desde`, `hasta` | `AAAA-MM-DD` | Días completos, inclusive. Solo `desde` → hasta hoy. Solo `hasta` → ese día. |
| `turnoId` | número | Solo los yapes de ese turno. |
| `franjaId` | número | Filtra por la franja guardada (hora y días). Las franjas que cruzan la medianoche cuentan la madrugada para el día en que empezaron. |
| `horaDesde`, `horaHasta` | `HH:MM` | Franja suelta, sin guardarla. Van juntas; no se mezclan con `franjaId`. |
| `verificacion` | `verificado` `falso` `sin_revisar` | |
| `emisor` | texto | Contiene (sin distinguir mayúsculas). |
| `agrupar` | `ninguno` (defecto) `turno` `dia` `mes` | Los grupos son por **día calendario**. |
| `limite` | 1–5000 (1000) | Solo con `agrupar=ninguno`. |
| `formato` | `json` (defecto) `csv` | `csv` descarga un archivo que abre Excel. |

Sin ningún filtro de fecha ni turno, devuelve **hoy**.

Respuesta JSON:
```
{ filtros:{desde,hasta,turnoId,franja,verificacion,emisor}, total, cantidad, promedio,
  yapes:[{id,fecha_lima,monto,emisor,receptor,verificacion,comentario,turno_id}], truncado }   // agrupar=ninguno
  grupos:[{clave,etiqueta,total,cantidad}]                                                    // agrupar=turno|dia|mes
```
No cuenta yapes eliminados ni de turnos eliminados.

## Turnos
| Ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /turnos` | `desde`, `hasta`, `estado=abierto\|cerrado`, `limite` | Lista con `total_yapes`, `cantidad_yapes`, `contado_inicio`, `contado_cierre`, `sistema_cierre`, `diferencia_cierre`, `franja` |
| `GET /turnos/:id` | — | Turno + `yapes:{total,n}` + `arqueos:[{id,tipo,at,total_contado,sistema_efectivo,diferencia,detalle:[{denominacion,cantidad,subtotal}]}]` |
| `PATCH /turnos/:id` | `{franjaId?, abiertoAt?, cerradoAt?}` | Turno. El cierre no puede ser anterior a la apertura. |
| `POST /turnos/:id/reabrir` | — | Turno abierto de nuevo (se descarta su arqueo de cierre). 409 si ya hay otro abierto. |
| `DELETE /turnos/:id` | — | A la papelera. 409 si está abierto. |
| `PATCH /arqueos/:id` | `{detalle?, sistemaEfectivo?}` (`null` lo borra) | Arqueo con total y diferencia recalculados |
| `DELETE /arqueos/:id` | — | A la papelera |

`POST /turnos/abrir` ahora devuelve también `advertencias:[…]` (abrir fuera del horario de la franja, o conteo distinto al cierre anterior) y valida `franjaId`.

## Franjas (horarios que defines tú)
| Ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /franjas` | `vigente=true` (solo las activas que contienen la hora actual) | `[{id,nombre,hora_inicio,hora_fin,dias_semana,activo,orden}]` |
| `POST /franjas` | `{nombre, horaInicio, horaFin, diasSemana?, activo?, orden?}` (`HH:MM`; días 1=lunes…7=domingo; por defecto los 7) | Franja |
| `PATCH /franjas/:id` | cualquiera de los anteriores | Franja |
| `DELETE /franjas/:id` | — | Los turnos que la usaban quedan sin franja |

Si `horaFin` < `horaInicio`, la franja termina al día siguiente (ej. 22:00–02:00).

## Comentarios rápidos
| Ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /comentarios` | `turnoId?`, `alcance=turno\|todos` (defecto `turno`), `pendientes=true` | Los del turno (el abierto, si no das `turnoId`) **más los fijados pendientes de cualquier turno**. Orden: pendientes, fijados, recientes. |
| `POST /comentarios` | `{texto, turnoId?, fijado?}` | Comentario (por defecto del turno abierto; `turnoId: null` lo deja sin turno) |
| `PATCH /comentarios/:id` | `{texto?, fijado?, hecho?}` | Comentario |
| `DELETE /comentarios/:id` | — | A la papelera |

## Papelera
| Ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /papelera` | — | Conteo por tipo: `{yapes,comentarios,turnos,arqueos,pcs,notas}` |
| `GET /papelera?tipo=` | `yapes\|comentarios\|turnos\|arqueos\|pcs\|notas` | Lista de eliminados (máx. 200) |
| `POST /papelera/restaurar` | `{tipo, id}` | `{ok:true}`. 409 si falta restaurar antes el turno o la PC, si ya hay un turno abierto o si el nombre de la PC ya existe. |
| `DELETE /papelera?dias=30` | `dias` (defecto 30; `0` = todo) | Borra **definitivamente** lo que lleva más de `dias` en la papelera |

## Login
`POST /login` bloquea la IP tras **5 intentos fallidos en 15 minutos** (429). Un acceso correcto borra sus fallos.
