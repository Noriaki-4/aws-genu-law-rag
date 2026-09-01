import { describe, expect, test } from 'vitest';
import { LEGAL_RAG_QUESTIONS } from '../../src/features/legalRag/questionLibrary';

describe('legal RAG question library', () => {
  test('contains every Streamlit Level 1 to 3 question and no Level 4', () => {
    expect(LEGAL_RAG_QUESTIONS).toHaveLength(15);
    expect(
      LEGAL_RAG_QUESTIONS.reduce<Record<number, number>>((counts, question) => {
        counts[question.level] = (counts[question.level] ?? 0) + 1;
        return counts;
      }, {})
    ).toEqual({ 1: 3, 2: 3, 3: 9 });
    expect(LEGAL_RAG_QUESTIONS.every((question) => question.level <= 3)).toBe(
      true
    );
  });

  test('keeps a translation key and law date for every question', () => {
    for (const question of LEGAL_RAG_QUESTIONS) {
      expect(question.translationKey).toMatch(
        /^legal_rag\.question_library\.questions\./
      );
      expect(question.legalAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
