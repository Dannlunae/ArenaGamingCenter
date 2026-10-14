# Caja del cyber — parte 1

Next.js 15 + Postgres (Supabase, São Paulo) en Vercel (región gru1).

## Puesta en marcha
1. Supabase: pega `db/schema.sql` (si no lo hiciste) y crea tu perfil admin:
   `insert into perfiles(id, nombre, rol) values ('<ADMIN_ID>', 'Tu nombre', 'admin');`
2. Copia `.env.example` a `.env.local` y llena los 4 valores
   (DATABASE_URL = "Transaction pooler", puerto 6543).
3. `pnpm install` y `pnpm dev` → http://localhost:3000
   (si no tienes pnpm: `corepack enable` y listo; la versión ya está fijada en `package.json`)
4. Vercel: importa el repo (detecta pnpm solo por `pnpm-lock.yaml`), pega las mismas 4 variables de entorno y despliega.

## Capas
- `src/shared/schemas.ts` — contrato de parámetros (Zod), compartido por front y back.
- `src/app/api/v1/**` — rutas HTTP: validan y delegan.
- `src/server/services` — reglas de negocio. `src/server/repos` — solo SQL.
- `src/lib/auth.ts` — sesión (aislada para cambiarla al sumar usuarios).
- `src/components` — pantalla; solo habla con la API mediante `src/lib/client.ts`.
