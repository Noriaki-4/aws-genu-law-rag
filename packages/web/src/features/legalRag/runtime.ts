import { AgentCoreConfiguration } from 'generative-ai-use-cases';

export const LEGAL_RAG_RUNTIME_NAME = 'LocalRagLawPoc';

export const parseExternalRuntimes = (
  value: string | undefined
): AgentCoreConfiguration[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (runtime): runtime is AgentCoreConfiguration =>
        typeof runtime === 'object' &&
        runtime !== null &&
        typeof runtime.name === 'string' &&
        typeof runtime.arn === 'string' &&
        typeof runtime.description === 'string'
    );
  } catch {
    return [];
  }
};

export const selectLegalRagRuntime = (
  runtimes: AgentCoreConfiguration[]
): AgentCoreConfiguration | undefined =>
  runtimes.find((runtime) => runtime.name === LEGAL_RAG_RUNTIME_NAME) ??
  (runtimes.length === 1 ? runtimes[0] : undefined);

export const configuredLegalRagRuntime = selectLegalRagRuntime(
  parseExternalRuntimes(import.meta.env.VITE_APP_AGENT_CORE_EXTERNAL_RUNTIMES)
);

export const legalRagEnabled = configuredLegalRagRuntime !== undefined;
