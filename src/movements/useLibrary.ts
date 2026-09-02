import { useEffect, useRef, useState } from 'react';
import { emptyLibrary, validLibrary, type LibraryData } from './catalog';
export function useLibrary() {
  const [data, setData] = useState<LibraryData>(emptyLibrary),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState('Loading your library…'),
    [error, setError] = useState('');
  const current = useRef(data),
    revision = useRef(0),
    pending = useRef(false),
    busy = useRef(false),
    blocked = useRef(false);
  const initialRequest = useRef<Promise<{
    data: LibraryData;
    revision: number;
  }> | null>(null);
  useEffect(() => {
    let alive = true;
    initialRequest.current ??= fetch('/api/library').then(async (r) => {
      if (!r.ok)
        throw Error('Could not load your saved library. Reload to try again.');
      return r.json();
    });
    initialRequest.current
      .then((v) => {
        if (!validLibrary(v.data)) throw Error('Invalid saved library');
        if (alive) {
          current.current = v.data;
          setData(v.data);
          revision.current = v.revision;
          setReady(true);
          setStatus('All changes saved');
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  async function flush() {
    if (busy.current || blocked.current) return;
    busy.current = true;
    while (pending.current) {
      pending.current = false;
      setStatus('Saving…');
      const snapshot = current.current;
      try {
        const r = await fetch('/api/library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: snapshot, revision: revision.current }),
        });
        const result = await r.json();
        if (!r.ok) {
          if (r.status === 409) blocked.current = true;
          throw Error(result.error ?? 'Save failed. Please retry.');
        }
        revision.current = result.revision;
        setError('');
        setStatus('All changes saved');
      } catch (e) {
        pending.current = true;
        setError((e as Error).message);
        setStatus('Unsaved changes');
        break;
      }
    }
    busy.current = false;
  }
  function update(fn: (d: LibraryData) => LibraryData) {
    if (!ready) return;
    const next = fn(current.current);
    if (!validLibrary(next)) {
      setError(
        'This change exceeds a library limit or contains an invalid value.',
      );
      return;
    }
    current.current = next;
    setData(next);
    pending.current = true;
    void flush();
  }
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pending.current || busy.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  return { data, ready, status, error, update, retry: flush };
}
export type Library = ReturnType<typeof useLibrary>;
export function exportLibrary(data: LibraryData) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          { format: 'liftlab-library', version: 1, data },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    ),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'liftlab-workouts.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
