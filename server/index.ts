import { emptyLibrary, validLibrary } from '../src/movements/catalog';
import { legacyLibraryCookie } from '../src/lib/libraryBackup';
export interface Database {
  prepare(sql: string): { bind(...values: unknown[]): Statement };
}
export interface Statement {
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
interface Env {
  DB: Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
export async function api(request: Request, db: Database): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/library') return json({ error: 'Not found' }, 404);
  const cookies = request.headers.get('Cookie') ?? '';
  const cookie =
    cookies.match(/(?:^|;\s*)kinetra_library=([a-f0-9]{64})(?:;|$)/)?.[1] ??
    cookies.match(
      new RegExp(`(?:^|;\\s*)${legacyLibraryCookie}=([a-f0-9]{64})(?:;|$)`),
    )?.[1];
  if (request.method === 'GET') {
    const id =
      cookie ??
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
    await db
      .prepare(
        'INSERT OR IGNORE INTO libraries (id,data,revision,updated_at) VALUES (?,?,0,?)',
      )
      .bind(id, JSON.stringify(emptyLibrary), new Date().toISOString())
      .run();
    const row = await db
      .prepare('SELECT data,revision FROM libraries WHERE id=?')
      .bind(id)
      .first<{ data: string; revision: number }>();
    return json({ data: JSON.parse(row!.data), revision: row!.revision }, 200, {
      'Set-Cookie': `kinetra_library=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`,
    });
  }
  if (request.method !== 'PUT')
    return json({ error: 'Method not allowed' }, 405);
  if (!cookie || request.headers.get('Origin') !== url.origin)
    return json(
      { error: 'Reload the page to restore your library session.' },
      403,
    );
  if (Number(request.headers.get('Content-Length')) > 1000000)
    return json({ error: 'Library is too large.' }, 413);
  const raw = await request.text();
  if (raw.length > 1000000)
    return json({ error: 'Library is too large.' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (
    !body ||
    !validLibrary(body.data) ||
    !Number.isInteger(body.revision) ||
    body.revision < 0
  )
    return json({ error: 'Invalid library data' }, 400);
  const result = await db
    .prepare(
      'UPDATE libraries SET data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',
    )
    .bind(
      JSON.stringify(body.data),
      new Date().toISOString(),
      cookie,
      body.revision,
    )
    .run();
  if (!result.meta.changes)
    return json(
      {
        error:
          'This library changed in another tab. Export your changes, then reload before editing.',
      },
      409,
    );
  return json({ revision: body.revision + 1 });
}
export default {
  async fetch(request: Request, env: Env) {
    try {
      return new URL(request.url).pathname.startsWith('/api/')
        ? await api(request, env.DB)
        : await env.ASSETS.fetch(request);
    } catch {
      return json(
        { error: 'Your library could not be saved. Please retry.' },
        500,
      );
    }
  },
};
