import { describe, expect, test, vi } from 'vitest';
import { watchLegalRagServiceWorkerUpdate } from '../../src/features/legalRag/useReloadOnServiceWorkerUpdate';

const createServiceWorker = (controlled: boolean) => {
  let listener: (() => void) | undefined;
  const update = vi.fn().mockResolvedValue(undefined);
  const serviceWorker = {
    controller: controlled ? {} : null,
    addEventListener: vi.fn(
      (_type: 'controllerchange', nextListener: () => void) => {
        listener = nextListener;
      }
    ),
    removeEventListener: vi.fn(),
    getRegistration: vi.fn().mockResolvedValue({ update }),
  };
  return {
    serviceWorker,
    update,
    dispatchControllerChange: () => listener?.(),
  };
};

describe('Legal RAG service worker update', () => {
  test('reloads an already controlled page once after an update takes control', async () => {
    const { serviceWorker, update, dispatchControllerChange } =
      createServiceWorker(true);
    const reload = vi.fn();

    const cleanup = watchLegalRagServiceWorkerUpdate(serviceWorker, reload);
    await vi.waitFor(() => expect(update).toHaveBeenCalledOnce());
    dispatchControllerChange();
    dispatchControllerChange();

    expect(reload).toHaveBeenCalledOnce();
    cleanup();
    expect(serviceWorker.removeEventListener).toHaveBeenCalledOnce();
  });

  test('does not reload a page on its first service worker installation', () => {
    const { serviceWorker, dispatchControllerChange } =
      createServiceWorker(false);
    const reload = vi.fn();

    watchLegalRagServiceWorkerUpdate(serviceWorker, reload);
    dispatchControllerChange();

    expect(reload).not.toHaveBeenCalled();
  });
});
