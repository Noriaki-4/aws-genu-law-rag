import { useMemo } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  LawConversation,
  LawConversationSummary,
  LawDataset,
  LawDatasetSummary,
  LawSubmitTurn,
  LawToolResult,
  LawTurn,
} from 'generative-ai-use-cases';
import {
  lawDatasetIds,
  lawRestBase,
  lawRestEnabled,
  lawRestUsesCognito,
} from '../features/legalRag/restConfig';

export class LawApiError extends Error {
  constructor(public status: number) {
    super(`Law API returned HTTP ${status}`);
  }
}

export interface LawApiOptions {
  baseUrl?: string;
  getIdToken?: () => Promise<string | undefined>;
  datasetIds?: readonly string[];
}

export function createLawApi(
  enabled: boolean,
  transport: typeof fetch = fetch,
  options: LawApiOptions = {}
) {
  const baseUrl = options.baseUrl ?? lawRestBase;
  const visibleDatasetIds = [...new Set(options.datasetIds ?? [])];
  const send = async (
    path: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<Response> => {
    if (!enabled) throw new Error('Law REST transport is disabled');
    const token = await options.getIdToken?.();
    if (options.getIdToken && !token)
      throw new Error('Law REST authentication is unavailable');
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await transport(baseUrl + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: Object.keys(headers).length === 0 ? undefined : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) throw new LawApiError(response.status);
    return response;
  };
  const request = async <T>(
    path: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<T> => (await send(path, body, signal)).json() as Promise<T>;
  const id = encodeURIComponent;
  return {
    datasets: async (signal?: AbortSignal) => {
      const datasets = await request<LawDatasetSummary[]>(
        '/datasets',
        undefined,
        signal
      );
      return visibleDatasetIds.length === 0
        ? datasets
        : visibleDatasetIds.flatMap((datasetId) => {
            const dataset = datasets.find(
              (item) => item.datasetId === datasetId
            );
            return dataset ? [dataset] : [];
          });
    },
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
        toolOutput: false,
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
    usage: (cid: string, signal?: AbortSignal) =>
      request<unknown>(`/conversations/${id(cid)}/usage`, undefined, signal),
    runAnalysis: (rid: string, signal?: AbortSignal) =>
      request<unknown>(
        `/investigations/${id(rid)}/analysis`,
        undefined,
        signal
      ),
    rawCall: (rid: string, callId: string, signal?: AbortSignal) =>
      request<unknown>(
        `/investigations/${id(rid)}/calls/${id(callId)}`,
        undefined,
        signal
      ),
    analysisExport: async (rid: string, signal?: AbortSignal) =>
      (
        await send(
          `/investigations/${id(rid)}/analysis/export`,
          undefined,
          signal
        )
      ).blob(),
    documentContent: async (
      datasetId: string,
      documentId: string,
      versionId: string,
      signal?: AbortSignal
    ) =>
      (
        await send(
          `/datasets/${id(datasetId)}/documents/${id(documentId)}/content?version=${id(versionId)}`,
          undefined,
          signal
        )
      ).blob(),
  };
}

export type LawApi = ReturnType<typeof createLawApi>;
const getIdToken = async () =>
  (await fetchAuthSession()).tokens?.idToken?.toString();
const useLawApi = () =>
  useMemo(
    () =>
      createLawApi(
        lawRestEnabled,
        fetch,
        lawRestUsesCognito
          ? { getIdToken, datasetIds: lawDatasetIds }
          : { datasetIds: lawDatasetIds }
      ),
    []
  );
export default useLawApi;
