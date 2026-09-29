import { describe, expect, test } from 'vitest';
import {
  userFacingIssues,
  userFacingStatus,
} from '../../src/features/legalRag/presentation';

describe('legal RAG presentation', () => {
  test('hides internal validation codes and document ids', () => {
    expect(
      userFacingIssues([
        'local-abc: invalid optional reference (reference_quote_mismatch)',
        'law-123: unverified_reference_document_id',
        'local-def: Attachment body was not read.',
      ])
    ).toEqual(['Attachment body was not read.']);
  });

  test('treats a historical internal-only incomplete answer as completed', () => {
    expect(
      userFacingStatus('incomplete', {
        claims: [{}],
        unknowns: [],
        unresolvedIssues: ['law-123: unverified_reference_document_id'],
      })
    ).toBe('completed');
  });

  test('keeps substantive unresolved answers incomplete', () => {
    expect(
      userFacingStatus('incomplete', {
        claims: [{}],
        unknowns: [],
        unresolvedIssues: ['A required regulation is unavailable.'],
      })
    ).toBe('incomplete');
  });
});
