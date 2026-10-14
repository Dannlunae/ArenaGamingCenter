import postgres from "postgres";

// Una sola conexión por instancia + pooler de Supabase (modo transacción).
const g = globalThis as unknown as { sql?: postgres.Sql };
export const sql: postgres.Sql = (g.sql ??= postgres(process.env.DATABASE_URL!, {
  max: 1,
  prepare: false,
  // bigint (ids) como número normal, no como texto
  types: { bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) } },
}));

/** Ejecuta fn en una transacción e informa el usuario a la auditoría. */
export async function conUsuario<T>(uid: string, fn: (q: postgres.Sql) => Promise<T>): Promise<T> {
  const r = await sql.begin(async (q) => {
    await q`select set_config('app.usuario_id', ${uid}, true)`;
    return fn(q as unknown as postgres.Sql);
  });
  return r as unknown as T;
}
