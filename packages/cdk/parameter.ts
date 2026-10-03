import * as cdk from 'aws-cdk-lib';
import {
  StackInput,
  stackInputSchema,
  ProcessedStackInput,
} from './lib/stack-input';
import { ModelConfiguration } from 'generative-ai-use-cases';
import { loadBrandingConfig } from './branding';

// Get parameters from CDK Context
const getContext = (app: cdk.App): StackInput => {
  const params = stackInputSchema.parse(app.node.getAllContext());
  return params;
};

// If you want to define parameters directly
const envs: Record<string, Partial<StackInput>> = {
  // If you want to define an anonymous environment, uncomment the following and the content of cdk.json will be ignored.
  // If you want to define an anonymous environment in parameter.ts, uncomment the following and the content of cdk.json will be ignored.
  // '': {
  //   // Parameters for anonymous environment
  //   // If you want to override the default settings, add the following
  // },
  dev: {
    // Parameters for development environment
    // Set the v3 HTTP Runtime invocation URL after backend deployment.
    legalRagEndpoint: null,
    legalRagDatasetIds: [
      'ds-525fc301de3e54ecb868fdd41a329bbfc97135b1309202e1856b6ba1df717cd0',
      'ds-a0ef00eb3843023d6121613a647f5907272141f6381d8bcbbdaea3a178a3593a',
      'ds-dfc86a33c77b557bdb31189116ca21af335552c2dd0ee88a94ce2fca048274ef',
    ],
    modelRegion: 'ap-northeast-1',
    modelIds: [
      'jp.anthropic.claude-sonnet-4-6',
      'jp.anthropic.claude-opus-4-8',
      'jp.anthropic.claude-opus-4-7',
      'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
      'jp.amazon.nova-2-lite-v1:0',
    ],
    imageGenerationModelIds: ['amazon.nova-canvas-v1:0'],
    videoGenerationModelIds: ['amazon.nova-reel-v1:0'],
    speechToSpeechModelIds: ['amazon.nova-2-sonic-v1:0'],
    agentFoundationModel: 'jp.anthropic.claude-sonnet-4-6',
  },
  staging: {
    // Parameters for staging environment
  },
  prod: {
    // Parameters for production environment
  },
  // If you need other environments, customize them as needed
};

// For backward compatibility, get parameters from CDK Context > parameter.ts
export const getParams = (app: cdk.App): ProcessedStackInput => {
  // By default, get parameters from CDK Context
  let params = getContext(app);

  // If the env matches the ones defined in envs, use the parameters in envs instead of the ones in context
  if (envs[params.env]) {
    params = stackInputSchema.parse({
      ...envs[params.env],
      env: params.env,
    });
  }
  // Make the format of modelIds, imageGenerationModelIds consistent
  const convertToModelConfiguration = (
    models: (string | ModelConfiguration)[],
    defaultRegion: string
  ): ModelConfiguration[] => {
    return models.map((model) =>
      typeof model === 'string'
        ? { modelId: model, region: defaultRegion }
        : model
    );
  };

  return {
    ...params,
    modelIds: convertToModelConfiguration(params.modelIds, params.modelRegion),
    imageGenerationModelIds: convertToModelConfiguration(
      params.imageGenerationModelIds,
      params.modelRegion
    ),
    videoGenerationModelIds: convertToModelConfiguration(
      params.videoGenerationModelIds,
      params.modelRegion
    ),
    speechToSpeechModelIds: convertToModelConfiguration(
      params.speechToSpeechModelIds,
      params.modelRegion
    ),
    endpointNames: convertToModelConfiguration(
      params.endpointNames,
      params.modelRegion
    ),
    // Process agentCoreRegion: null -> modelRegion
    agentCoreRegion: params.agentCoreRegion || params.modelRegion,
    // Compute isAgentCoreNetworkPrivate from VPC configuration
    isAgentCoreNetworkPrivate: !!(
      params.agentCoreVpcId &&
      params.agentCoreSubnetIds &&
      params.agentCoreSubnetIds.length > 0
    ),
    // Load branding configuration
    brandingConfig: loadBrandingConfig(),
  };
};
