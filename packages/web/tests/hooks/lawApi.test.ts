import { describe, expect, test, vi } from 'vitest';
import { createLawApi, LawApiError } from '../../src/hooks/useLawApi';
import {
  isLocalLawRestEnabled,
  normalizeRemoteLawEndpoint,
  parseLawDatasetIds,
} from '../../src/features/legalRag/restConfig';

const naraDataset =
  'ds-525fc301de3e54ecb868fdd41a329bbfc97135b1309202e1856b6ba1df717cd0';
const narashinoDataset =
  'ds-a0ef00eb3843023d6121613a647f5907272141f6381d8bcbbdaea3a178a3593a';

describe('law Runtime boundary', () => {
  test('requires development mode and a loopback browser', () => {
    expect(isLocalLawRestEnabled(true, 'local-runtime', '127.0.0.1')).toBe(
      true
    );
    expect(isLocalLawRestEnabled(false, 'local-runtime', '127.0.0.1')).toBe(
      false
    );
    expect(isLocalLawRestEnabled(true, 'local-runtime', 'example.com')).toBe(
      false
    );
    expect(isLocalLawRestEnabled(true, undefined, 'localhost')).toBe(false);
  });

  test('accepts only Tokyo AgentCore Runtime invocation endpoints', () => {
    expect(
      normalizeRemoteLawEndpoint(
        'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations?qualifier=DEFAULT'
      )
    ).toBe(
      'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations?qualifier=DEFAULT'
    );
    expect(
      normalizeRemoteLawEndpoint(
        'https://api-id.execute-api.us-east-1.amazonaws.com'
      )
    ).toBeUndefined();
    expect(
      normalizeRemoteLawEndpoint('http://localhost:18000')
    ).toBeUndefined();
  });

  test('accepts only valid unique configured dataset IDs', () => {
    expect(
      parseLawDatasetIds(
        JSON.stringify([naraDataset, 'invalid', naraDataset, narashinoDataset])
      )
    ).toEqual([naraDataset, narashinoDataset]);
    expect(parseLawDatasetIds('{')).toEqual([]);
  });

  test('filters and orders datasets by the configured current set list', async () => {
    const transport = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [
          { datasetId: narashinoDataset },
          { datasetId: 'ds-' + '0'.repeat(64) },
          { datasetId: naraDataset },
        ],
      }),
    });
    const datasets = await createLawApi(true, transport, {
      datasetIds: [naraDataset, narashinoDataset],
    }).datasets();
    expect(datasets.map((dataset) => dataset.datasetId)).toEqual([
      naraDataset,
      narashinoDataset,
    ]);
  });

  test('disabled transport never sends a request', async () => {
    const transport = vi.fn();
    await expect(createLawApi(false, transport).datasets()).rejects.toThrow(
      'disabled'
    );
    expect(transport).not.toHaveBeenCalled();
  });

  test('preserves identifiers in JSON without local Cognito credentials', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: {} }) });
    await createLawApi(true, transport).conversation('id/with?query');
    expect(transport).toHaveBeenCalledWith(
      '/law-api/invocations',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      })
    );
  });

  test('sends the Cognito ID token to the configured remote service', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: {} }) });
    await createLawApi(true, transport, {
      baseUrl:
        'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations?qualifier=DEFAULT',
      getIdToken: async () => 'id-token',
    }).datasets();
    expect(transport).toHaveBeenCalledWith(
      'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations?qualifier=DEFAULT',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer id-token' }),
        credentials: 'omit',
      })
    );
  });

  test('does not send a remote request without an ID token', async () => {
    const transport = vi.fn();
    await expect(
      createLawApi(true, transport, {
        baseUrl:
          'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations?qualifier=DEFAULT',
        getIdToken: async () => undefined,
      }).datasets()
    ).rejects.toThrow('authentication');
    expect(transport).not.toHaveBeenCalled();
  });

  test('creates normal conversations and preserves the submit identity', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: {} }) });
    const api = createLawApi(true, transport);
    await api.create('dataset');
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      operation: 'createConversation',
      payload: { datasetId: 'dataset', toolOutput: false },
    });
    const request = {
      text: 'question',
      clientRequestId: 'request-1',
      expectedRevision: 0,
      datasetId: 'dataset',
    };
    await api.submit('c', request);
    await api.submit('c', request);
    expect(JSON.parse(transport.mock.calls[1][1].body)).toEqual({
      operation: 'submitTurn',
      conversationId: 'c',
      requestId: 'request-1',
      expectedRevision: 0,
      payload: { text: 'question', datasetId: 'dataset' },
    });
    expect(
      transport.mock.calls[1][1].headers[
        'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'
      ]
    ).toBe('law-conversation-c');
    expect(transport.mock.calls[1][1].body).toEqual(
      transport.mock.calls[2][1].body
    );
  });

  test('preserves HTTP conflict status and abort signals', async () => {
    const transport = vi.fn().mockResolvedValue({ ok: false, status: 409 });
    const signal = new AbortController().signal;
    await expect(
      createLawApi(true, transport).conversation('c', signal)
    ).rejects.toEqual(new LawApiError(409));
    expect(transport.mock.calls[0][1].signal).toBe(signal);
  });
  test('decodes saved XML safely and base64 diagnostic ZIP', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            encoding: 'utf-8',
            contentType: 'application/xml',
            data: '<Law>text</Law>',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            encoding: 'base64',
            contentType: 'application/zip',
            data: 'UEs=',
          },
        }),
      });
    const api = createLawApi(true, transport);
    const xml = await api.documentContent('dataset', 'document', 'version');
    expect(xml.type).toBe('text/plain;charset=utf-8');
    expect(xml.size).toBe(15);
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      operation: 'getDocumentContent',
      payload: {
        datasetId: 'dataset',
        documentId: 'document',
        versionId: 'version',
      },
    });
    const zip = await api.analysisExport('run');
    expect(zip.type).toBe('application/zip');
    expect(zip.size).toBe(2);
  });
  test('rejects other hosts, malformed ARN paths and unexpected URL options', () => {
    const endpoint =
      'https://bedrock-agentcore.ap-northeast-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A123456789012%3Aruntime%2Flaw_test-abc/invocations';
    for (const value of [
      endpoint.replace(
        'ap-northeast-1.amazonaws.com',
        'ap-northeast-1.amazonaws.com.evil.test'
      ),
      endpoint.replace('/invocations', '/mcp'),
      endpoint + '?token=secret',
      endpoint + '#fragment',
      endpoint.replace('https://', 'https://user:password@'),
      endpoint.replace('.com/', '.com:444/'),
    ]) {
      expect(normalizeRemoteLawEndpoint(value)).toBeUndefined();
    }
    expect(normalizeRemoteLawEndpoint(endpoint)).toBe(endpoint);
  });
});
