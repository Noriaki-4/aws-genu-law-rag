import { describe, expect, test } from 'vitest';
import { parseQuestionReadinessResult } from '../../src/features/legalRag/questionReadiness';

describe('parseQuestionReadinessResult', () => {
  test('accepts the current ready response', () => {
    expect(
      parseQuestionReadinessResult(
        JSON.stringify({
          decision: 'ready',
          reason: 'The actor and action are clear.',
          recommendation: 'What requirements apply when a company acts?',
        })
      )
    ).toEqual({
      decision: 'ready',
      reason: 'The actor and action are clear.',
      recommendation: 'What requirements apply when a company acts?',
    });
  });

  test('accepts the current clarification recommendation response', () => {
    expect(
      parseQuestionReadinessResult(
        JSON.stringify({
          decision: 'clarification_recommended',
          reason: 'The action target is missing.',
          recommendation: 'Specify which document the company submits.',
        })
      )
    ).toEqual({
      decision: 'clarification_recommended',
      reason: 'The action target is missing.',
      recommendation: 'Specify which document the company submits.',
    });
  });

  test('rejects the removed choice-based response', () => {
    expect(() =>
      parseQuestionReadinessResult(
        JSON.stringify({
          decision: 'clarification_required',
          reason: 'The actor is missing.',
          clarification_question: 'Who performs the action?',
          choices: [],
        })
      )
    ).toThrow('Question readiness response has an invalid shape.');
  });
});
