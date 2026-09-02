import type { Plugin } from 'vite';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { api, type Database } from './index';
export function localApi(): Plugin {
  return {
    name: 'liftlab-local-api',
    configureServer(server) {
      mkdirSync('.local', { recursive: true });
      const sqlite = new DatabaseSync('.local/liftlab.sqlite');
      for (const file of readdirSync('drizzle').filter((f) =>
        f.endsWith('.sql'),
      ))
        sqlite.exec(
          readFileSync(`drizzle/${file}`, 'utf8').replace(
            'CREATE TABLE ',
            'CREATE TABLE IF NOT EXISTS ',
          ),
        );
      const db: Database = {
        prepare(sql) {
          return {
            bind(...values) {
              const stmt = sqlite.prepare(sql);
              return {
                async first<T>() {
                  return (stmt.get(...(values as never[])) ?? null) as T | null;
                },
                async run() {
                  return {
                    meta: {
                      changes: Number(stmt.run(...(values as never[])).changes),
                    },
                  };
                },
              };
            },
          };
        },
      };
      server.httpServer?.once('close', () => sqlite.close());
      server.middlewares.use('/api', async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers))
            if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
          const request = new Request(
            `http://${req.headers.host}/api${req.url}`,
            {
              method: req.method,
              headers,
              body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
            },
          );
          const response = await api(request, db);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Local library unavailable' }));
        }
      });
    },
  };
}
