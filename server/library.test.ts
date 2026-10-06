import { beforeEach, afterEach, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { api, type Database } from './index';
import { emptyLibrary, catalog } from '../src/movements/catalog';
import { legacyLibraryCookie } from '../src/lib/libraryBackup';
let sqlite: DatabaseSync, db: Database;
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')))
    sqlite.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  db = {
    prepare(sql) {
      return {
        bind(...values) {
          const s = sqlite.prepare(sql);
          return {
            async first<T>() {
              return (s.get(...(values as never[])) ?? null) as T | null;
            },
            async run() {
              return {
                meta: {
                  changes: Number(s.run(...(values as never[])).changes),
                },
              };
            },
          };
        },
      };
    },
  };
});
afterEach(() => sqlite.close());
const get = (cookie = '') =>
  api(
    new Request('https://kinetra.test/api/library', {
      headers: { Cookie: cookie },
    }),
    db,
  );
const put = (
  cookie: string,
  data: unknown,
  revision = 0,
  origin = 'https://kinetra.test',
) =>
  api(
    new Request('https://kinetra.test/api/library', {
      method: 'PUT',
      headers: {
        Cookie: cookie,
        Origin: origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, revision }),
    }),
    db,
  );
it('keeps an existing library when migrating its cookie to the new brand', async () => {
  const first = await get();
  const currentCookie = first.headers.get('Set-Cookie')!.split(';')[0];
  const previousCookie = currentCookie.replace(
    'kinetra_library',
    legacyLibraryCookie,
  );
  const data = { ...emptyLibrary, workoutName: 'Saved before the rebrand' };
  expect((await put(previousCookie, data)).status).toBe(200);
  const migrated = await get(previousCookie);
  expect((await migrated.json()).data).toEqual(data);
  expect(migrated.headers.get('Set-Cookie')!.split(';')[0]).toBe(currentCookie);
});
it('persists custom movements and workout history while isolating visitor libraries', async () => {
  const first = await get(),
    cookie = first.headers.get('Set-Cookie')!.split(';')[0];
  const data = {
    ...emptyLibrary,
    custom: [{ ...catalog[0], id: 'my-press', custom: true }],
    favorites: ['my-press'],
    workoutName: 'Push day',
  };
  expect((await put(cookie, data)).status).toBe(200);
  expect((await (await get(cookie)).json()).data).toEqual(data);
  expect((await (await get()).json()).data).toEqual(emptyLibrary);
  expect(first.headers.get('Set-Cookie')).toContain('HttpOnly');
  expect(first.headers.get('Set-Cookie')).toContain('Secure');
});
it('rejects stale saves, malformed data and cross-origin writes', async () => {
  const first = await get(),
    cookie = first.headers.get('Set-Cookie')!.split(';')[0];
  expect((await put(cookie, emptyLibrary)).status).toBe(200);
  expect(
    (await put(cookie, { ...emptyLibrary, workoutName: 'stale' })).status,
  ).toBe(409);
  expect((await put(cookie, { bad: true }, 1)).status).toBe(400);
  expect(
    (await put(cookie, emptyLibrary, 1, 'https://other.test')).status,
  ).toBe(403);
  expect((await put('', emptyLibrary)).status).toBe(403);
  expect((await (await get(cookie)).json()).data.workoutName).toBe(
    'My workout',
  );
});
