import { describe, expect, test } from 'vitest';
import {
  parseExternalRuntimes,
  selectLegalRagRuntime,
} from '../../src/features/legalRag/runtime';

const lawRuntime = {
  name: 'LocalRagLawPoc',
  display_name: 'Legal RAG Agent',
  description: 'Searches Japanese laws',
  arn: 'arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/law',
};

describe('legal RAG runtime configuration', () => {
  test('selects the named legal RAG runtime from multiple runtimes', () => {
    expect(
      selectLegalRagRuntime([
        {
          name: 'OtherAgent',
          description: 'other',
          arn: 'arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/other',
        },
        lawRuntime,
      ])
    ).toEqual(lawRuntime);
  });

  test('uses the only external runtime when an environment changes its name', () => {
    const renamed = { ...lawRuntime, name: 'LegalRagNextEnvironment' };
    expect(selectLegalRagRuntime([renamed])).toEqual(renamed);
  });

  test('does not guess when multiple runtimes have no legal RAG name', () => {
    expect(
      selectLegalRagRuntime([
        { ...lawRuntime, name: 'First' },
        { ...lawRuntime, name: 'Second', arn: `${lawRuntime.arn}-second` },
      ])
    ).toBeUndefined();
  });

  test('rejects invalid external runtime configuration safely', () => {
    expect(parseExternalRuntimes('{invalid')).toEqual([]);
    expect(
      parseExternalRuntimes(JSON.stringify([{ name: 'missing-fields' }]))
    ).toEqual([]);
  });
});
