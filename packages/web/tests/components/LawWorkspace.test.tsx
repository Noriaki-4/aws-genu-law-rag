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
  usage: vi.fn(),
  dataset: vi.fn(),
  runAnalysis: vi.fn(),
  rawCall: vi.fn(),
  analysisExport: vi.fn(),
  documentContent: vi.fn(),
}));
const naraDatasetId =
  'ds-525fc301de3e54ecb868fdd41a329bbfc97135b1309202e1856b6ba1df717cd0';
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
      claims: [
        {
          section: 'conclusion',
          text: 'Structured conclusion',
          evidenceIds: [],
        },
        {
          section: 'reasoning',
          heading: 'Reason one',
          text: 'Structured reason',
          evidenceIds: ['e1'],
        },
      ],
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
  mocks.analysis.mockResolvedValue({
    turns: [
      {
        turnId: 't1',
        status: 'completed',
        runIds: ['r1'],
        request: { text: 'Test question' },
        decision: { action: 'investigate', reason: 'Need sources' },
      },
    ],
  });
  mocks.usage.mockResolvedValue({
    calls: [{ callId: 'call-1' }],
    knownUsd: 0.001,
    unknownCalls: 0,
  });
  mocks.runAnalysis.mockResolvedValue({
    run: { runId: 'r1', status: 'completed' },
    artifacts: { retrieval_steps: [], evidence: [] },
    usage: {
      totalInput: { knownSum: 100 },
      output: { knownSum: 20 },
    },
    cost: { knownUsd: 0.001, unknownCalls: 0 },
    calls: [],
  });
  mocks.rawCall.mockResolvedValue({});
  mocks.analysisExport.mockResolvedValue(new Blob(['export']));
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
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getAllByText('legal_rag.resident_library.level_1_title')
    ).toHaveLength(2);
    expect(
      screen.getAllByText('legal_rag.resident_library.level_5_title')
    ).toHaveLength(2);
    expect(
      screen.queryByText('legal_rag.resident_library.hypothetical')
    ).toBeNull();
    const levelFiveQuestion = screen.getByText(residentQuestions[12].title);
    fireEvent.click(
      within(levelFiveQuestion.closest('article')!).getByText(
        'legal_rag.resident_library.apply'
      )
    );
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
      screen
        .getByRole('button', { name: /legal_rag\.workspace\.send/ })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('selects the current Nara dataset for a new conversation', async () => {
    mocks.datasets.mockResolvedValue([
      {
        datasetId: naraDatasetId,
        municipalities: ['Nara'],
        documentCount: 361,
        relationCount: 0,
        titles: [],
      },
    ]);
    renderPage('/legal-rag');
    await waitFor(() =>
      expect(
        (
          screen.getByLabelText(
            'legal_rag.workspace.dataset'
          ) as HTMLSelectElement
        ).value
      ).toBe(naraDatasetId)
    );
  });

  test('restores a saved answer and sources without loading diagnostics or calling the model', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    expect(mocks.analysis).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('legal_rag.workspace.evidence_count'));
    expect(screen.getByText('Original source')).toBeTruthy();
    expect(screen.queryByText('legal_rag.workspace.source')).toBeNull();
    mocks.documentContent.mockResolvedValue(new Blob(['source']));
    const createObjectURL = vi.fn(() => 'blob:source');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = vi.fn();
      }
    );
    fireEvent.click(screen.getByText('legal_rag.workspace.saved_document'));
    await waitFor(() =>
      expect(mocks.documentContent).toHaveBeenCalledWith('d1', 'doc', 'v1')
    );
    expect(screen.queryByText('legal_rag.workspace.requirements')).toBeNull();
    expect(mocks.toolResult).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  test('loads analysis only when selected and can display registered documents', async () => {
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.click(screen.getByText('legal_rag.workspace.analysis'));
    await screen.findByText('legal_rag.analysis.title');
    await screen.findByText('legal_rag.analysis.timeline_item');
    expect(mocks.analysis).toHaveBeenCalledWith('c1', expect.any(AbortSignal));
    expect(mocks.usage).toHaveBeenCalledWith('c1', expect.any(AbortSignal));
    fireEvent.click(screen.getByText('legal_rag.workspace.documents'));
    await waitFor(() => expect(mocks.dataset).toHaveBeenCalled());
    expect(
      screen.getByLabelText('legal_rag.workspace.graph_focus')
    ).toBeTruthy();
    expect(
      screen.getByLabelText('legal_rag.workspace.graph_depth')
    ).toBeTruthy();
    expect(screen.getByText('legal_rag.workspace.graph_summary')).toBeTruthy();
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
    fireEvent.click(
      screen.getByRole('button', { name: /legal_rag\.workspace\.send/ })
    );
    await screen.findByText('legal_rag.workspace.connection_error');
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: /legal_rag\.workspace\.send/ })
          .hasAttribute('disabled')
      ).toBe(false)
    );
    fireEvent.click(
      screen.getByRole('button', { name: /legal_rag\.workspace\.send/ })
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
    expect(mocks.submit.mock.calls[0]).toEqual(mocks.submit.mock.calls[1]);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('applies a dataset change to the next message in an existing conversation', async () => {
    mocks.datasets.mockResolvedValue([
      {
        datasetId: 'd1',
        municipalities: ['City one'],
        documentCount: 1,
        relationCount: 0,
        titles: [],
      },
      {
        datasetId: 'd2',
        municipalities: ['City two'],
        documentCount: 2,
        relationCount: 0,
        titles: [],
      },
    ]);
    renderPage();
    await screen.findByText('Structured conclusion');
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.dataset'), {
      target: { value: 'd2' },
    });
    fireEvent.change(screen.getByLabelText('legal_rag.workspace.question'), {
      target: { value: 'Use the new dataset' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /legal_rag\.workspace\.send/ })
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0][1]).toEqual(
      expect.objectContaining({ datasetId: 'd2' })
    );
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
    fireEvent.click(
      screen.getByRole('button', {
        name: /legal_rag\.workspace\.new_conversation/,
      })
    );
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
    fireEvent.click(
      screen.getByRole('button', { name: /legal_rag\.workspace\.send/ })
    );
    fireEvent.click(
      screen.getByRole('button', { name: /legal_rag\.workspace\.send/ })
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
