import { describe, expect, test } from 'vitest';
import {
  filterResidentQuestions,
  residentQuestions,
} from '../../src/features/legalRag/residentQuestions';

describe('resident question catalog', () => {
  test('retains all 14 questions and the five levels', () => {
    expect(residentQuestions).toHaveLength(14);
    expect(new Set(residentQuestions.map((q) => q.id)).size).toBe(14);
    expect(
      [1, 2, 3, 4, 5].map((level) => filterResidentQuestions(level, '').length)
    ).toEqual([4, 4, 2, 2, 2]);
  });
  test('preserves hypothetical amendment labels and source wording', () => {
    const examples = filterResidentQuestions(5, '');
    expect(
      // Canonical Japanese catalog wording, not a translated UI label.
      // eslint-disable-next-line i18nhelper/no-jp-string
      examples.every((q) => q.hypothetical && q.question.startsWith('仮想改正'))
    ).toBe(true);
    // eslint-disable-next-line i18nhelper/no-jp-string
    expect(filterResidentQuestions(1, '印鑑登録')).toHaveLength(2);
    expect(filterResidentQuestions(0, 'not-a-question')).toHaveLength(0);
  });
});
