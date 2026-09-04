import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LegalRagPage from '../../src/pages/LegalRagPage';

const mocks = vi.hoisted(() => ({
  invokeAgentRuntime: vi.fn(),
  clear: vi.fn(),
  setModelId: vi.fn(),
  setFollowing: vi.fn(),
  requestQuestionReadiness: vi.fn(),
  messages: [] as Array<{
    id: string;
    role: 'assistant';
    content: string;
    llmType?: string;
    legalRagCitations?: Array<{
      documentId: string;
      contentUnitId?: string;
      title?: string;
      heading?: string;
      sourcePage?: number;
      text?: string;
    }>;
  }>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; level?: number }) => {
      if (values?.level !== undefined) return `${key}:${values.level}`;
      if (values?.count !== undefined) return `${key}:${values.count}`;
      return key;
    },
  }),
}));

vi.mock('../../src/hooks/useAgentCore', () => ({
  useAgentCore: () => ({
    messages: mocks.messages,
    isEmpty: mocks.messages.length === 0,
    clear: mocks.clear,
    loading: false,
    invokeAgentRuntime: mocks.invokeAgentRuntime,
    getExternalRuntimes: () => [
      {
        name: 'LocalRagLawPoc',
        description: 'Legal RAG runtime',
        arn: 'arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/law',
      },
    ],
    getModelId: () => 'test-model',
    setModelId: mocks.setModelId,
  }),
}));

vi.mock('../../src/hooks/useFollow', () => ({
  default: () => ({
    scrollableContainer: { current: null },
    setFollowing: mocks.setFollowing,
  }),
}));

vi.mock('../../src/hooks/useModel', () => ({
  MODELS: { modelIds: ['test-model'] },
  findModelByModelId: () => ({
    type: 'bedrock',
    modelId: 'test-model',
    region: 'ap-northeast-1',
  }),
}));

vi.mock('../../src/features/legalRag/questionReadiness', () => ({
  requestQuestionReadiness: mocks.requestQuestionReadiness,
}));

type InputProps = {
  content: string;
  onChangeContent: (content: string) => void;
  onSend: () => void;
  onReset: () => void;
  onOrganize: () => void;
};

const QUESTION_LABEL = 'question';
const SEND_LABEL = 'send';
const RESET_LABEL = 'reset';
const ORGANIZE_LABEL = 'legal_rag.readiness.organize';

vi.mock('../../src/features/legalRag/LegalRagInputChatContent', () => ({
  default: ({
    content,
    onChangeContent,
    onSend,
    onReset,
    onOrganize,
  }: InputProps) => (
    <div data-testid="question-composer">
      <textarea
        aria-label={QUESTION_LABEL}
        value={content}
        onChange={(event) => onChangeContent(event.target.value)}
      />
      <button type="button" onClick={onSend}>
        {SEND_LABEL}
      </button>
      <button type="button" onClick={onReset}>
        {RESET_LABEL}
      </button>
      <button type="button" onClick={onOrganize}>
        {ORGANIZE_LABEL}
      </button>
    </div>
  ),
}));

vi.mock('../../src/components/ScrollTopBottom', () => ({
  default: () => null,
}));

vi.mock('../../src/components/ChatMessage', () => ({
  default: ({
    chatContent,
  }: {
    chatContent?: { content: string; llmType?: string };
  }) => (
    <div data-testid="chat-message">
      <span>{chatContent?.content}</span>
      <span>{chatContent?.llmType}</span>
    </div>
  ),
}));

describe('LegalRagPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messages.length = 0;
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(() => ({
        disconnect: vi.fn(),
        observe: vi.fn(),
        unobserve: vi.fn(),
      }))
    );
  });

  test('opens the question library and fills a selected question', async () => {
    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    expect(screen.getByText('legal_rag.title')).toBeTruthy();
    expect(screen.getByText('legal_rag.scope.title')).toBeTruthy();
    expect(screen.getByText('legal_rag.scope.rows.finance.field')).toBeTruthy();
    expect(screen.queryByText('legal_rag.scope.rows.lease.field')).toBeNull();
    expect(screen.queryByText('legal_rag.scope.rows.pharma.field')).toBeNull();
    expect(screen.queryByText('legal_rag.scope.notes')).toBeNull();
    expect(
      screen
        .getByText('legal_rag.readiness.organize')
        .closest('[data-testid="question-composer"]')
    ).not.toBeNull();
    fireEvent.click(screen.getByText('legal_rag.question_library.open:9'));
    const questionTitle = await screen.findByText(
      'legal_rag.question_library.questions.tender_offer_notice_methods.title'
    );
    fireEvent.click(questionTitle.closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByText('legal_rag.question_library.apply'));

    expect(
      (screen.getByLabelText('question') as HTMLTextAreaElement).value
    ).toBe(
      'legal_rag.question_library.questions.tender_offer_notice_methods.question'
    );
  });

  test('invokes the configured external runtime without a runtime selector', () => {
    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('question'), {
      target: { value: 'Check the applicable provisions.' },
    });
    fireEvent.click(screen.getByText('send'));

    expect(mocks.invokeAgentRuntime).toHaveBeenCalledWith(
      'arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/law',
      expect.any(String),
      'Check the applicable provisions.'
    );
  });

  test('does not display a single GenU model for legal RAG answers', () => {
    mocks.messages.push({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Legal RAG answer',
      llmType: 'global.anthropic.claude-sonnet-5',
    });

    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('global.anthropic.claude-sonnet-5')).toBeNull();
  });

  test('shows citation text and content unit ID in expandable details', () => {
    mocks.messages.push({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Legal RAG answer',
      legalRagCitations: [
        {
          documentId: 'law-1',
          contentUnitId: 'law-1-article-1-paragraph-1',
          title: 'Companies Act',
          heading: 'Article 1',
          sourcePage: 3,
          text: 'Cited provision text',
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    expect(screen.getByText('legal_rag.citations.title:1')).toBeTruthy();
    expect(screen.getByText(/Companies Act \/ Article 1/)).toBeTruthy();
    expect(screen.getByText('Cited provision text')).toBeTruthy();
    expect(screen.getByText('law-1-article-1-paragraph-1')).toBeTruthy();
  });

  test('applies the recommended question when readiness is ready', async () => {
    mocks.requestQuestionReadiness.mockResolvedValue({
      decision: 'ready',
      reason: 'The actor and action are clear.',
      recommendation: 'What requirements apply when a company acts?',
    });

    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('question'), {
      target: { value: 'Who must comply?' },
    });
    fireEvent.click(screen.getByText('legal_rag.readiness.organize'));

    await waitFor(() => {
      expect(
        screen.getByText('What requirements apply when a company acts?')
      ).toBeTruthy();
    });
    expect(mocks.requestQuestionReadiness).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Who must comply?',
        agentRuntimeArn:
          'arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/law',
      })
    );

    fireEvent.click(screen.getByText('legal_rag.readiness.apply'));

    expect(
      (screen.getByLabelText('question') as HTMLTextAreaElement).value
    ).toBe('What requirements apply when a company acts?');
  });

  test('shows a clarification recommendation without applying it', async () => {
    mocks.requestQuestionReadiness.mockResolvedValue({
      decision: 'clarification_recommended',
      reason: 'The action target is missing.',
      recommendation: 'Specify which document the company submits.',
    });

    render(
      <MemoryRouter initialEntries={['/legal-rag']}>
        <LegalRagPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('question'), {
      target: { value: 'What must the company submit?' },
    });
    fireEvent.click(screen.getByText('legal_rag.readiness.organize'));

    await waitFor(() => {
      expect(
        screen.getByText('Specify which document the company submits.')
      ).toBeTruthy();
    });
    expect(screen.queryByText('legal_rag.readiness.apply')).toBeNull();
  });
});
