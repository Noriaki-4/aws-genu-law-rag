import * as cdk from 'aws-cdk-lib';
import { readFileSync } from 'node:fs';
import { getParams } from '../parameter';

const RUNTIME_ARN =
  'arn:aws:bedrock-agentcore:ap-northeast-1:035351467732:runtime/LocalRagLawPoc-9vW35wDaXG';

test('law-rag-poc uses the existing Tokyo AgentCore Runtime', () => {
  const params = getParams(new cdk.App({ context: { env: 'law-rag-poc' } }));

  expect(params.region).toBe('ap-northeast-1');
  expect(params.modelRegion).toBe('ap-northeast-1');
  expect(params.agentCoreRegion).toBe('ap-northeast-1');
  expect(params.createGenericAgentCoreRuntime).toBe(false);
  expect(params.agentCoreExternalRuntimes).toEqual([
    expect.objectContaining({
      name: 'LocalRagLawPoc',
      arn: RUNTIME_ARN,
    }),
  ]);
});

test('cdk context and typed environment configuration stay aligned', () => {
  const cdkConfig = JSON.parse(readFileSync('cdk.json', 'utf8')) as {
    context: Record<string, unknown>;
  };
  const params = getParams(
    new cdk.App({ context: { env: String(cdkConfig.context.env) } })
  );

  expect(cdkConfig.context.region).toBe(params.region);
  expect(cdkConfig.context.modelRegion).toBe(params.modelRegion);
  expect(cdkConfig.context.agentCoreRegion).toBe(params.agentCoreRegion);
  expect(cdkConfig.context.agentCoreExternalRuntimes).toEqual(
    params.agentCoreExternalRuntimes
  );
});
