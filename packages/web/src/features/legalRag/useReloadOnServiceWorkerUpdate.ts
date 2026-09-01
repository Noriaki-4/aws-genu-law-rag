import { useEffect } from 'react';

type ServiceWorkerRegistrationLike = {
  update: () => Promise<unknown>;
};

type ServiceWorkerContainerLike = {
  controller: unknown;
  addEventListener: (type: 'controllerchange', listener: () => void) => void;
  removeEventListener: (type: 'controllerchange', listener: () => void) => void;
  getRegistration: () => Promise<ServiceWorkerRegistrationLike | undefined>;
};

export const watchLegalRagServiceWorkerUpdate = (
  serviceWorker: ServiceWorkerContainerLike,
  reload: () => void
): (() => void) => {
  const hadController = serviceWorker.controller !== null;
  let reloading = false;
  const onControllerChange = () => {
    if (!hadController || reloading) return;
    reloading = true;
    reload();
  };

  serviceWorker.addEventListener('controllerchange', onControllerChange);
  void serviceWorker
    .getRegistration()
    .then((registration) => registration?.update())
    .catch(() => undefined);

  return () => {
    serviceWorker.removeEventListener('controllerchange', onControllerChange);
  };
};

/**
 * GenU precaches hashed assets. Reload the Legal RAG page when a new service
 * worker takes control so the active page and its lazy chunks stay in sync.
 */
export const useReloadOnServiceWorkerUpdate = (): void => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    return watchLegalRagServiceWorkerUpdate(
      navigator.serviceWorker,
      window.location.reload.bind(window.location)
    );
  }, []);
};
