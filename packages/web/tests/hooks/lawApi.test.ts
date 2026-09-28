import { describe, expect, test, vi } from 'vitest';
import { createLawApi, LawApiError } from '../../src/hooks/useLawApi';
import { isLocalLawRestEnabled } from '../../src/features/legalRag/restConfig';

describe('law REST boundary', () => {
  test('requires development mode and a loopback browser', () => {
    expect(isLocalLawRestEnabled(true, 'local-rest', '127.0.0.1')).toBe(true);
    expect(isLocalLawRestEnabled(false, 'local-rest', '127.0.0.1')).toBe(false);
    expect(isLocalLawRestEnabled(true, 'local-rest', 'example.com')).toBe(
      false
    );
    expect(isLocalLawRestEnabled(true, undefined, 'localhost')).toBe(false);
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

  test('creates tool-capable conversations and preserves the submit identity', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    const api = createLawApi(true, transport);
    await api.create('dataset');
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      datasetId: 'dataset',
      toolOutput: true,
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
