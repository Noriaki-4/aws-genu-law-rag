import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LawWorkspace from '../../src/features/legalRag/LawWorkspace';
import { residentQuestions } from '../../src/features/legalRag/residentQuestions';

const mocks = vi.hoisted(() => ({
  datasets: vi.fn(),
  history: vi.fn(),
  conversation: vi.fn(),
  create: vi.fn(),
  submit: vi.fn(),
  turns: vi.fn(),
  toolResult: vi.fn(),
  analysis: vi.fn(),
  dataset: vi.fn(),
  runAnalysis: vi.fn(),
}));
vi.mock('../../src/hooks/useLawApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/hooks/useLawApi')>()),
  default: () => mocks,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const evidence = {
  evidenceId: 'e1',
  documentId: 'doc',
  versionId: 'v1',
  locationId: 'p1',
  title: 'Test document',
  heading: 'Article 1',
  text: 'Original source',
  sourceUrl: 'javascript:alert(1)',
};
const conversation = {
  conversationId: 'c1',
  datasetId: 'd1',
  revision: 2,
  status: 'idle',
  toolOutput: true,
  evidence: [evidence],
  messages: [
    {
      messageId: 'm1',
      turnId: 't1',
      role: 'user',
      text: 'Test question',
      runIds: [],
    },
    {
      messageId: 'm2',
      turnId: 't1',
      role: 'assistant',
      text: 'Fallback answer',
      runIds: ['r1'],
    },
  ],
};
const turns = [
  {
    turnId: 't1',
    status: 'completed',
    runIds: ['r1'],
    reply: 'answer',
    answer: {
      claims: [{ text: 'Structured conclusion', evidenceIds: ['e1'] }],
      unknowns: ['A clarification'],
      unresolvedIssues: [],
    },
  },
];
const renderPage = (url = '/legal-rag?conversation=c1') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LawWorkspace />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.datasets.mockResolvedValue([
    {
      datasetId: 'd1',
      municipalities: ['City'],
      documentCount: 1,
      relationCount: 0,
      titles: [],
    },
  ]);
  mocks.history.mockResolvedValue([
    { conversationId: 'c1', title: 'Saved chat', status: 'idle' },
  ]);
  mocks.conversation.mockResolvedValue(conversation);
  mocks.turns.mockResolvedValue(turns);
  mocks.create.mockResolvedValue({
    ...conversation,
    revision: 0,
    messages: [],
  });
  mocks.submit.mockResolvedValue({ turnId: 't2', status: 'queued' });
  mocks.analysis.mockResolvedValue({ marker: 'analysis-result' });
  mocks.dataset.mockResolvedValue({
    documents: [{ documentId: 'doc', versionId: 'v1', title: 'Test document' }],
    relations: [],
  });
  mocks.toolResult.mockResolvedValue({
    requirementsStatus: 'generated',
    requirements: [],
    combination: '',
    unresolvedIssues: [],
    readyForSql: false,
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('law workspace', () => {
  test('orders conversation, question library, documents and analysis together', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    const navigation = screen.getByRole('navigation', {
      name: 'legal_rag.workspace.views',
    });
    expect(
      within(navigation)
        .getAllByRole('button')
        .map((item) => item.textContent)
    ).toEqual([
      'legal_rag.workspace.conversation',
      'legal_rag.resident_library.title',
      'legal_rag.workspace.documents',
      'legal_rag.workspace.analysis',
    ]);
  });
  test('selecting an example after an answer starts a draft without generating an answer', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.click(screen.getByText('legal_rag.resident_library.title'));
    fireEvent.change(
      screen.getByLabelText('legal_rag.resident_library.level'),
      { target: { value: '5' } }
    );
    expect(
      screen.getAllByText('legal_rag.resident_library.hypothetical')
    ).toHaveLength(2);
    fireEvent.click(screen.getAllByText('legal_rag.resident_library.apply')[0]);
    await screen.findByText('legal_rag.workspace.start');
    expect(
      (
        screen.getByLabelText(
          'legal_rag.workspace.question'
        ) as HTMLTextAreaElement
      ).value
    ).toBe(residentQuestions[12].question);
    expect(
      (
        screen.getByLabelText(
          'legal_rag.workspace.dataset'
        ) as HTMLSelectElement
      ).value
    ).toBe('d1');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('examples cannot be applied to a non-municipal dataset', async () => {
    mocks.datasets.mockResolvedValue([
      {
        datasetId: 'd1',
        municipalities: [],
        documentCount: 1,
        relationCount: 0,
        titles: [],
      },
    ]);
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.click(screen.getByText('legal_rag.resident_library.title'));
    expect(
      screen
        .getAllByText('legal_rag.resident_library.apply')
        .every((b) => b.hasAttribute('disabled'))
    ).toBe(true);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  test('polls a running conversation without resubmitting and stops on completion', async () => {
    vi.useFakeTimers();
    mocks.conversation
      .mockResolvedValueOnce({ ...conversation, status: 'processing' })
      .mockResolvedValue(conversation);
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('legal_rag.workspace.processing')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.queryByText('legal_rag.workspace.processing')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(mocks.conversation).toHaveBeenCalledTimes(2);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  test('does not select an arbitrary historical dataset for a new conversation', async () => {
    renderPage('/legal-rag');
    await screen.findByText('Saved chat');
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.question'), {
      target: { value: 'Question' },
    });
    expect(
      screen.getByText('legal_rag.workspace.send').hasAttribute('disabled')
    ).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('restores a saved answer and sources without loading diagnostics or calling the model', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    expect(mocks.analysis).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('legal_rag.workspace.evidence_count'));
    expect(screen.getByText('Original source')).toBeTruthy();
    expect(screen.queryByText('legal_rag.workspace.source')).toBeNull();
    expect(
      screen
        .getByText('legal_rag.workspace.saved_document')
        .getAttribute('href')
    ).toBe('/law-api/datasets/d1/documents/doc/content?version=v1');
    fireEvent.click(screen.getByText('legal_rag.workspace.requirements'));
    await waitFor(() =>
      expect(mocks.toolResult).toHaveBeenCalledWith('c1', 't1')
    );
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  test('loads analysis only when selected and can display registered documents', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.click(screen.getByText('legal_rag.workspace.analysis'));
    await screen.findByText(/analysis-result/);
    fireEvent.click(screen.getByText('legal_rag.workspace.documents'));
    await waitFor(() => expect(mocks.dataset).toHaveBeenCalled());
    expect(
      await screen.findByText('legal_rag.workspace.no_relations')
    ).toBeTruthy();
  });

  test('keeps request id and revision when a send response is lost', async () => {
    mocks.submit.mockRejectedValueOnce(new TypeError('connection lost'));
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.question'), {
      target: { value: 'Follow up' },
    });
    fireEvent.click(screen.getByText('legal_rag.workspace.send'));
    await screen.findByText('legal_rag.workspace.connection_error');
    await waitFor(() =>
      expect(
        screen.getByText('legal_rag.workspace.send').hasAttribute('disabled')
      ).toBe(false)
    );
    fireEvent.click(screen.getByText('legal_rag.workspace.send'));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
    expect(mocks.submit.mock.calls[0]).toEqual(mocks.submit.mock.calls[1]);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('ignores a stale conversation response after the user starts a new chat', async () => {
    let resolve!: (value: typeof conversation) => void;
    mocks.conversation.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    renderPage();
    await screen.findByText('Saved chat');
    fireEvent.click(screen.getByText('legal_rag.workspace.new_conversation'));
    await act(async () => resolve(conversation));
    expect(screen.queryByText('Structured conclusion')).toBeNull();
    expect(screen.getByText('legal_rag.workspace.start')).toBeTruthy();
  });

  test('submits a new question exactly once on repeated clicks', async () => {
    renderPage('/legal-rag');
    await screen.findByText('Saved chat');
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.dataset'), {
      target: { value: 'd1' },
    });
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.question'), {
      target: { value: 'New question' },
    });
    fireEvent.click(screen.getByText('legal_rag.workspace.send'));
    fireEvent.click(screen.getByText('legal_rag.workspace.send'));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
