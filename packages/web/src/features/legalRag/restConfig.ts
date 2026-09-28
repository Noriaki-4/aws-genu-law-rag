export const isLocalLawRestEnabled = (
  development: boolean,
  mode: string | undefined,
  hostname: string
) =>
  development &&
  mode === 'local-rest' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

// v2.0.8 is single-user and has no authorization boundary. Never enable this
// transport in a production build, even when the development flag is supplied.
export const lawRestEnabled = isLocalLawRestEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_APP_LEGAL_RAG_TRANSPORT,
  window.location.hostname
);
export const lawRestBase = '/law-api';
