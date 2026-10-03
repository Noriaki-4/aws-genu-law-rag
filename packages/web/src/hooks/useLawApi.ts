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
  const clientSession = 'law-client-' + crypto.randomUUID();
  type Fields = {
    conversationId?: string;
    requestId?: string;
    expectedRevision?: number;
    payload?: Record<string, unknown>;
  };
  const request = async <T>(
    operation: string,
    fields: Fields = {},
    signal?: AbortSignal
  ): Promise<T> => {
    if (!enabled) throw new Error('Law Runtime transport is disabled');
    const token = await options.getIdToken?.();
    if (options.getIdToken && !token)
      throw new Error('Law Runtime authentication is unavailable');
    const response = await transport(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': fields.conversationId
          ? `law-conversation-${fields.conversationId}`
          : clientSession,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ operation, ...fields }),
      signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) throw new LawApiError(response.status);
    const body = await response.json();
    return body.result as T;
  };
  type Content = { encoding: string; data: string; contentType: string };
  const contentBlob = (content: Content) => {
    if (content.encoding === 'base64') {
      return new Blob(
        [Uint8Array.from(atob(content.data), (c) => c.charCodeAt(0))],
        { type: content.contentType }
      );
    }
    // Display saved XML as text rather than executing its markup.
    return new Blob([content.data], { type: 'text/plain;charset=utf-8' });
  };
  return {
    datasets: async (signal?: AbortSignal) => {
      const datasets = await request<LawDatasetSummary[]>(
        'listDatasets',
        {},
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
      request<LawDataset>('getDataset', { payload: { datasetId } }, signal),
    history: (signal?: AbortSignal) =>
      request<LawConversationSummary[]>(
        'listConversations',
        { payload: { limit: 100 } },
        signal
      ),
    conversation: (conversationId: string, signal?: AbortSignal) =>
      request<LawConversation>('getConversation', { conversationId }, signal),
    create: (datasetId: string) =>
      request<LawConversation>('createConversation', {
        payload: { datasetId, toolOutput: false },
      }),
    submit: (conversationId: string, body: LawSubmitTurn) => {
      const { clientRequestId, expectedRevision, ...payload } = body;
      return request<LawTurn>('submitTurn', {
        conversationId,
        requestId: clientRequestId,
        expectedRevision,
        payload,
      });
    },
    turns: (conversationId: string, signal?: AbortSignal) =>
      request<LawTurn[]>('listTurns', { conversationId }, signal),
    toolResult: (
      conversationId: string,
      turnId: string,
      signal?: AbortSignal
    ) =>
      request<LawToolResult>(
        'getToolResult',
        { conversationId, payload: { turnId } },
        signal
      ),
    analysis: (conversationId: string, signal?: AbortSignal) =>
      request<unknown>('getConversationAnalysis', { conversationId }, signal),
    usage: (conversationId: string, signal?: AbortSignal) =>
      request<unknown>('getConversationUsage', { conversationId }, signal),
    runAnalysis: (runId: string, signal?: AbortSignal) =>
      request<unknown>('getRunAnalysis', { payload: { runId } }, signal),
    rawCall: (runId: string, callId: string, signal?: AbortSignal) =>
      request<unknown>('getCall', { payload: { runId, callId } }, signal),
    analysisExport: async (runId: string, signal?: AbortSignal) =>
      contentBlob(
        await request<Content>(
          'exportRunAnalysis',
          { payload: { runId } },
          signal
        )
      ),
    documentContent: async (
      datasetId: string,
      documentId: string,
      versionId: string,
      signal?: AbortSignal
    ) =>
      contentBlob(
        await request<Content>(
          'getDocumentContent',
          { payload: { datasetId, documentId, versionId } },
          signal
        )
      ),
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
