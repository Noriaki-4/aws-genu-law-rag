import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import QuestionLibraryDialog from '../../src/features/legalRag/QuestionLibraryDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; level?: number }) => {
      if (values?.level !== undefined) return `${key}:${values.level}`;
      if (values?.count !== undefined) return `${key}:${values.count}`;
      return key;
    },
  }),
}));

describe('QuestionLibraryDialog', () => {
  test('filters Level 2 questions and applies the selected question', () => {
    const onClose = vi.fn();
    const onSelectQuestion = vi.fn();
    render(
      <QuestionLibraryDialog
        isOpen
        onClose={onClose}
        onSelectQuestion={onSelectQuestion}
      />
    );

    fireEvent.click(
      screen.getByText('legal_rag.question_library.filter_label:6')
    );
    expect(
      screen.queryByText(
        'legal_rag.question_library.questions.small_number_private_placement.title'
      )
    ).toBeNull();

    const title = screen.getByText(
      'legal_rag.question_library.questions.tender_offer_notice_policy.title'
    );
    fireEvent.click(title.closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByText('legal_rag.question_library.apply'));

    expect(onSelectQuestion).toHaveBeenCalledWith(
      'legal_rag.question_library.questions.tender_offer_notice_policy.question'
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
