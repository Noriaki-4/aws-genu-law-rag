import { useMemo } from 'react';
import {
  LawConversation,
  LawConversationSummary,
  LawDataset,
  LawDatasetSummary,
  LawSubmitTurn,
  LawToolResult,
  LawTurn,
} from 'generative-ai-use-cases';
import { lawRestBase, lawRestEnabled } from '../features/legalRag/restConfig';

export class LawApiError extends Error {
  constructor(public status: number) {
    super(`Law API returned HTTP ${status}`);
  }
}

export function createLawApi(
  enabled: boolean,
  transport: typeof fetch = fetch
) {
  const request = async <T>(
    path: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<T> => {
    if (!enabled) throw new Error('Local law REST transport is disabled');
    const response = await transport(lawRestBase + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) throw new LawApiError(response.status);
    return response.json() as Promise<T>;
  };
  const id = encodeURIComponent;
  return {
    datasets: (signal?: AbortSignal) =>
      request<LawDatasetSummary[]>('/datasets', undefined, signal),
    dataset: (datasetId: string, signal?: AbortSignal) =>
      request<LawDataset>(`/datasets/${id(datasetId)}`, undefined, signal),
    history: (signal?: AbortSignal) =>
      request<LawConversationSummary[]>(
        '/conversations?limit=100',
        undefined,
        signal
      ),
    conversation: (cid: string, signal?: AbortSignal) =>
      request<LawConversation>(`/conversations/${id(cid)}`, undefined, signal),
    create: (datasetId: string) =>
      request<LawConversation>('/conversations', {
        datasetId,
        toolOutput: true,
      }),
    submit: (cid: string, body: LawSubmitTurn) =>
      request<LawTurn>(`/conversations/${id(cid)}/turns`, body),
    turns: (cid: string, signal?: AbortSignal) =>
      request<LawTurn[]>(`/conversations/${id(cid)}/turns`, undefined, signal),
    toolResult: (cid: string, tid: string, signal?: AbortSignal) =>
      request<LawToolResult>(
        `/conversations/${id(cid)}/turns/${id(tid)}/tool-result`,
        undefined,
        signal
      ),
    analysis: (cid: string, signal?: AbortSignal) =>
      request<unknown>(`/conversations/${id(cid)}/analysis`, undefined, signal),
    runAnalysis: (rid: string, signal?: AbortSignal) =>
      request<unknown>(
        `/investigations/${id(rid)}/analysis`,
        undefined,
        signal
      ),
  };
}

export type LawApi = ReturnType<typeof createLawApi>;
const useLawApi = () => useMemo(() => createLawApi(lawRestEnabled), []);
export default useLawApi;
