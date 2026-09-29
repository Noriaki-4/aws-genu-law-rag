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

describe('law REST boundary', () => {
  test('requires development mode and a loopback browser', () => {
    expect(isLocalLawRestEnabled(true, 'local-rest', '127.0.0.1')).toBe(true);
    expect(isLocalLawRestEnabled(false, 'local-rest', '127.0.0.1')).toBe(false);
    expect(isLocalLawRestEnabled(true, 'local-rest', 'example.com')).toBe(
      false
    );
    expect(isLocalLawRestEnabled(true, undefined, 'localhost')).toBe(false);
  });

  test('accepts only Tokyo API Gateway HTTPS endpoints', () => {
    expect(
      normalizeRemoteLawEndpoint(
        'https://api-id.execute-api.ap-northeast-1.amazonaws.com/'
      )
    ).toBe('https://api-id.execute-api.ap-northeast-1.amazonaws.com');
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
      json: async () => [
        { datasetId: narashinoDataset },
        { datasetId: 'ds-' + '0'.repeat(64) },
        { datasetId: naraDataset },
      ],
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

  test('encodes identifiers and never sends Cognito credentials to the local service', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    await createLawApi(true, transport).conversation('id/with?query');
    expect(transport).toHaveBeenCalledWith(
      '/law-api/conversations/id%2Fwith%3Fquery',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      })
    );
  });

  test('sends the Cognito ID token to the configured remote service', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    await createLawApi(true, transport, {
      baseUrl: 'https://api-id.execute-api.ap-northeast-1.amazonaws.com',
      getIdToken: async () => 'id-token',
    }).datasets();
    expect(transport).toHaveBeenCalledWith(
      'https://api-id.execute-api.ap-northeast-1.amazonaws.com/datasets',
      expect.objectContaining({
        headers: { Authorization: 'Bearer id-token' },
        credentials: 'omit',
      })
    );
  });

  test('does not send a remote request without an ID token', async () => {
    const transport = vi.fn();
    await expect(
      createLawApi(true, transport, {
        baseUrl: 'https://api-id.execute-api.ap-northeast-1.amazonaws.com',
        getIdToken: async () => undefined,
      }).datasets()
    ).rejects.toThrow('authentication');
    expect(transport).not.toHaveBeenCalled();
  });

  test('creates normal conversations and preserves the submit identity', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const api = createLawApi(true, transport);
    await api.create('dataset');
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      datasetId: 'dataset',
      toolOutput: false,
    });
    const request = {
      text: 'question',
      clientRequestId: 'request-1',
      expectedRevision: 0,
      datasetId: 'dataset',
    };
    await api.submit('c', request);
    await api.submit('c', request);
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
});
