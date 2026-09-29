const INTERNAL_VALIDATION_CODES = [
  'unknown_reference_source',
  'reference_quote_mismatch',
  'reference_article_mismatch',
  'unverified_reference_document_id',
];

export function userFacingIssues(values: string[] = []): string[] {
  return values
    .filter(
      (value) =>
        !value.includes('SOURCE_ABBREVIATION:') &&
        !INTERNAL_VALIDATION_CODES.some((code) => value.includes(code))
    )
    .map((value) => value.replace(/^(?:local-|law-)[^:]+:\s*/, ''));
}

export function userFacingStatus(
  status: string | undefined,
  answer:
    | {
        claims?: unknown[];
        unknowns?: unknown[];
        unresolvedIssues?: string[];
      }
    | undefined
): string | undefined {
  return status === 'incomplete' &&
    answer?.claims?.length &&
    !answer.unknowns?.length &&
    !userFacingIssues(answer.unresolvedIssues).length
    ? 'completed'
    : status;
}
