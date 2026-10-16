# API de PCs — contrato para la interfaz

Todas las rutas están bajo `/api/v1`, requieren sesión (cookie del login) y responden JSON.
Errores: `{ "error": "mensaje" }` con código 400 (datos inválidos), 401 (sin sesión), 404, 409 (regla de negocio).

## Estados
- **PC:** `libre` · `en_uso` · `error` · `mantenimiento`
- **Software en una PC:** `sin_revisar` · `pendiente` · `actualizando` · `al_dia` · `error`

## Reglas de negocio (las aplica el backend)
| Regla | Respuesta si se incumple |
|---|---|
| `error` y `mantenimiento` exigen `motivo` | 409 "Indica el motivo" |
| Desde `error`/`mantenimiento` solo se puede ir a `libre` (o entre ellos), nunca directo a `en_uso` | 409 |
| No se puede pasar a `en_uso` con un software en `actualizando` | 409 "Tiene actualizaciones en curso" |
| Un software solo pasa a `actualizando` si la PC está `libre` o en `mantenimiento` | 409 (en masivo: se omite esa PC) |
| No se puede eliminar una PC `en_uso` | 409 |
| Nombre de PC único (sin distinguir mayúsculas) | 409 |
| Pasar a `al_dia` guarda `actualizado_at` automáticamente | — |
| Eliminar = papelera (se puede recuperar en la base); todo cambio queda en la auditoría | — |

## PCs
| Método y ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /pcs` | query opcional: `estado`, `q` (nombre), `softwareId`+`softwareEstado`, `conNotas=true` | Lista ordenada: `{id, nombre, ubicacion, orden, estado, motivo, estado_desde, notas_abiertas, software:[{softwareId,nombre,estado}]}` |
| `GET /pcs/resumen` | — | `{total, porEstado:{libre,en_uso,error,mantenimiento}, software:[{softwareId,nombre,porEstado:{…}}], pcsConNotasAbiertas}` |
| `GET /pcs/:id` | — | PC + `software:[{software_id,nombre,tipo,estado,version,actualizado_at,nota,estado_desde}]` + `notas:[…]` |
| `POST /pcs` | `{nombre, ubicacion?, orden?}` | PC creada (con una fila por cada software) |
| `PATCH /pcs/:id` | `{nombre?, ubicacion?, orden?}` | PC |
| `DELETE /pcs/:id` | — | `{ok:true}` |
| `PATCH /pcs/:id/estado` | `{estado, motivo?}` | PC + `cambio` (false si ya estaba así) |
| `PATCH /pcs/estado` (masivo) | `{ids:[…], estado, motivo?}` | `{actualizadas, omitidas:[{pcId,motivo,codigo}]}` |
| `GET /pcs/:id/historial` | — | Cambios de estado: `[{at, usuario_id, desde, hasta, motivo}]` |

## Software (catálogo y actualizaciones)
| Método y ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /software` | — | `[{id,nombre,tipo,activo,orden}]` |
| `POST /software` | `{nombre, tipo?: driver|juego|otro}` | Software; crea su fila en todas las PC |
| `PATCH /software/:id` | `{nombre?, tipo?, activo?, orden?}` | Software (`activo:false` lo oculta sin perder historial) |
| `PATCH /pcs/:id/software/:softwareId` | `{estado, version?, nota?}` | `{ok:true}` |
| `POST /software/:softwareId/marcar` (masivo) | `{pcIds:[…], estado, version?, nota?}` | `{actualizadas, omitidas:[{pcId,motivo,codigo}]}` |

## Notas
| Método y ruta | Parámetros | Devuelve |
|---|---|---|
| `GET /pcs/:id/notas` | query: `abiertas=true` | Notas de esa PC |
| `POST /pcs/:id/notas` | `{comentario, fecha?}` (fecha ISO con zona; por defecto ahora) | Nota |
| `GET /notas` | query: `pcId`, `abiertas=true` | Notas de todas las PC (con el nombre de la PC) |
| `PATCH /notas/:id` | `{comentario?, fecha?, resuelta?}` | Nota |
| `DELETE /notas/:id` | — | `{ok:true}` |

## Ejemplos
```
PATCH /api/v1/pcs/12/estado
{ "estado": "mantenimiento", "motivo": "Cambio de fuente" }

PATCH /api/v1/pcs/estado
{ "ids": [3,4,5], "estado": "libre" }
→ { "actualizadas": 2, "omitidas": [{ "pcId": 5, "motivo": "Ya estaba en ese estado", "codigo": 200 }] }

POST /api/v1/software/3/marcar
{ "pcIds": [1,2,3,4], "estado": "al_dia", "version": "9.05" }
```
