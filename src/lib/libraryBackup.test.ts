import { expect, it } from 'vitest';
import { emptyLibrary } from '../movements/catalog';
import { legacyLibraryFormat, parseLibraryBackup } from './libraryBackup';

it('imports both existing and rebranded backups without losing session data', () => {
  const data = { ...emptyLibrary, workoutName: 'My saved session' };
  for (const format of [legacyLibraryFormat, 'kinetra-library']) {
    expect(parseLibraryBackup({ format, version: 1, data })).toEqual(data);
  }
});

it('rejects unsupported versions, other formats and invalid library content', () => {
  for (const value of [
    null,
    { format: 'kinetra-library', version: 2, data: emptyLibrary },
    { format: 'other-library', version: 1, data: emptyLibrary },
    { format: 'kinetra-library', version: 1, data: { broken: true } },
  ]) {
    expect(() => parseLibraryBackup(value)).toThrow(
      'valid Kinetra library backup',
    );
  }
});
