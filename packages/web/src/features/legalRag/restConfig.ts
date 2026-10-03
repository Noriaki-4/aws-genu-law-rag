export const isLocalLawRestEnabled = (
  development: boolean,
  mode: string | undefined,
  hostname: string
) =>
  development &&
  mode === 'local-runtime' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

export const normalizeRemoteLawEndpoint = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    const endpoint = new URL(value);
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.port ||
      endpoint.username ||
      endpoint.password ||
      endpoint.hash ||
      (endpoint.search && endpoint.search !== '?qualifier=DEFAULT') ||
      endpoint.hostname !== 'bedrock-agentcore.ap-northeast-1.amazonaws.com' ||
      !/^\/runtimes\/arn%3Aaws%3Abedrock-agentcore%3Aap-northeast-1%3A[0-9]{12}%3Aruntime%2F[A-Za-z0-9_-]+\/invocations$/i.test(
        endpoint.pathname
      )
    )
      return undefined;
    return endpoint.href.replace(/\/$/, '');
  } catch {
    return undefined;
  }
};

export const parseLawDatasetIds = (value: string | undefined) => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (item): item is string =>
            typeof item === 'string' && /^ds-[0-9a-f]{64}$/.test(item)
        )
      ),
    ];
  } catch {
    return [];
  }
};

export const defaultLawDatasetId =
  'ds-525fc301de3e54ecb868fdd41a329bbfc97135b1309202e1856b6ba1df717cd0';
export const narashinoLawDatasetId =
  'ds-a0ef00eb3843023d6121613a647f5907272141f6381d8bcbbdaea3a178a3593a';
export const financialLawDatasetId =
  'ds-dfc86a33c77b557bdb31189116ca21af335552c2dd0ee88a94ce2fca048274ef';
export const defaultLawDatasetIds = [
  defaultLawDatasetId,
  narashinoLawDatasetId,
  financialLawDatasetId,
] as const;

const localEnabled = isLocalLawRestEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_APP_LEGAL_RAG_TRANSPORT,
  window.location.hostname
);
const remoteEndpoint = normalizeRemoteLawEndpoint(
  import.meta.env.VITE_APP_LEGAL_RAG_ENDPOINT
);

export const lawRestEnabled = localEnabled || remoteEndpoint !== undefined;
export const lawRestBase = remoteEndpoint ?? '/law-api/invocations';
export const lawRestUsesCognito = remoteEndpoint !== undefined;
const configuredLawDatasetIds = parseLawDatasetIds(
  import.meta.env.VITE_APP_LEGAL_RAG_DATASET_IDS
);
export const lawDatasetIds =
  configuredLawDatasetIds.length > 0
    ? configuredLawDatasetIds
    : defaultLawDatasetIds;
