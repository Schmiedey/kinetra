import { validLibrary, type LibraryData } from '../movements/catalog';

// Read original identifiers so existing backups and library sessions remain usable.
export const legacyLibraryFormat = 'liftlab-library';
export const legacyLibraryCookie = 'liftlab_library';
export const legacyLocalDatabase = '.local/liftlab.sqlite';

export function parseLibraryBackup(value: unknown): LibraryData {
  if (!value || typeof value !== 'object')
    throw Error('Choose a valid Kinetra library backup.');
  const backup = value as {
    format?: unknown;
    version?: unknown;
    data?: unknown;
  };
  if (
    !['kinetra-library', legacyLibraryFormat].includes(String(backup.format)) ||
    backup.version !== 1 ||
    !validLibrary(backup.data)
  )
    throw Error('Choose a valid Kinetra library backup.');
  return backup.data;
}
