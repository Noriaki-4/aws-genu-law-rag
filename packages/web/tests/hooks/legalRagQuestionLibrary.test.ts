import { describe, expect, test } from 'vitest';
import { LEGAL_RAG_QUESTIONS } from '../../src/features/legalRag/questionLibrary';

describe('legal RAG question library', () => {
  test('contains the selected Level 1 and Level 2 finance questions', () => {
    expect(LEGAL_RAG_QUESTIONS).toHaveLength(7);
    expect(
      LEGAL_RAG_QUESTIONS.reduce<Record<number, number>>((counts, question) => {
        counts[question.level] = (counts[question.level] ?? 0) + 1;
        return counts;
      }, {})
    ).toEqual({ 1: 2, 2: 5 });
    expect(LEGAL_RAG_QUESTIONS.map((question) => question.level)).toEqual([
      1, 1, 2, 2, 2, 2, 2,
    ]);
    expect(
      LEGAL_RAG_QUESTIONS.filter((question) => question.level === 1).map(
        (question) => question.id
      )
    ).toEqual([
      'small-number-private-placement',
      'tender-offer-share-acquisition',
    ]);
    expect(
      LEGAL_RAG_QUESTIONS.every((question) => question.topic === 'finance')
    ).toBe(true);
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
