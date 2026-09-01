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
  },
  staging: {
    // Parameters for staging environment
  },
  prod: {
    // Parameters for production environment
  },
  'law-rag-poc': {
    region: 'ap-northeast-1',
    modelRegion: 'ap-northeast-1',
    agentCoreRegion: 'ap-northeast-1',
    createGenericAgentCoreRuntime: false,
    agentCoreExternalRuntimes: [
      {
        name: 'LocalRagLawPoc',
        // External runtime metadata does not support locale-specific values.
        // eslint-disable-next-line i18nhelper/no-jp-string
        display_name: '法令RAGエージェント',
        description:
          // eslint-disable-next-line i18nhelper/no-jp-string
          '法令本文と法令関係グラフを根拠として質問に回答します。検証用途であり、回答は法的判断を確定するものではありません。',
        arn: 'arn:aws:bedrock-agentcore:ap-northeast-1:035351467732:runtime/LocalRagLawPoc-9vW35wDaXG',
      },
    ],
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
