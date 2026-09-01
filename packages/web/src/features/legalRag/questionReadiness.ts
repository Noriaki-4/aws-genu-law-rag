import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AgentCoreRequest, Model } from 'generative-ai-use-cases';
import { getRegionFromArn } from '../../utils/arnUtils';

const region = import.meta.env.VITE_APP_REGION as string;
const modelRegion = import.meta.env.VITE_APP_MODEL_REGION as string;
const identityPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID as string;
const userPoolId = import.meta.env.VITE_APP_USER_POOL_ID as string;

export type QuestionReadinessChoice = {
  choiceId: string;
  label: string;
  refinedQuestion: string;
};

export type QuestionReadinessResult = {
  decision: 'ready' | 'clarification_required';
  reason: string;
  clarificationQuestion: string | null;
  choices: QuestionReadinessChoice[];
};

type QuestionReadinessWireResult = {
  decision?: unknown;
  reason?: unknown;
  clarification_question?: unknown;
  choices?: unknown;
};

type RuntimeResponse = {
  response?: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
};

const eventText = (line: string): string => {
  const normalized = line.startsWith('data: ') ? line.substring(6) : line;
  if (!normalized.trim()) return '';

  const parsed = JSON.parse(normalized) as {
    event?: {
      contentBlockDelta?: { delta?: { text?: unknown } };
      internalServerException?: { message?: unknown };
    };
  };
  const event = parsed.event;
  const errorMessage = event?.internalServerException?.message;
  if (typeof errorMessage === 'string' && errorMessage) {
    throw new Error(errorMessage);
  }
  const text = event?.contentBlockDelta?.delta?.text;
  return typeof text === 'string' ? text : '';
};

const readTextResponse = async (response: RuntimeResponse): Promise<string> => {
  if (!response.response) {
    throw new Error('AgentCore Runtime returned no response stream.');
  }

  let buffer = '';
  let text = '';
  const consume = (chunk: Uint8Array) => {
    buffer += new TextDecoder('utf-8').decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    text += lines.map(eventText).join('');
  };

  const stream = response.response;
  if (Symbol.asyncIterator in stream) {
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      consume(chunk);
    }
  } else {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    let result = await reader.read();
    while (!result.done) {
      consume(result.value);
      result = await reader.read();
    }
  }

  if (buffer.trim()) text += eventText(buffer);
  return text;
};

const parseResult = (text: string): QuestionReadinessResult => {
  const value = JSON.parse(text) as QuestionReadinessWireResult;
  if (
    (value.decision !== 'ready' &&
      value.decision !== 'clarification_required') ||
    typeof value.reason !== 'string' ||
    (value.clarification_question !== null &&
      typeof value.clarification_question !== 'string') ||
    !Array.isArray(value.choices)
  ) {
    throw new Error('Question readiness response has an invalid shape.');
  }

  const choices = value.choices.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('choice_id' in item) ||
      typeof item.choice_id !== 'string' ||
      !('label' in item) ||
      typeof item.label !== 'string' ||
      !('refined_question' in item) ||
      typeof item.refined_question !== 'string'
    ) {
      throw new Error('Question readiness choice has an invalid shape.');
    }
    return {
      choiceId: item.choice_id,
      label: item.label,
      refinedQuestion: item.refined_question,
    };
  });

  return {
    decision: value.decision,
    reason: value.reason,
    clarificationQuestion: value.clarification_question,
    choices,
  };
};

export const requestQuestionReadiness = async ({
  agentRuntimeArn,
  sessionId,
  question,
  model,
}: {
  agentRuntimeArn: string;
  sessionId: string;
  question: string;
  model: Model;
}): Promise<QuestionReadinessResult> => {
  const token = (await fetchAuthSession()).tokens?.idToken?.toString();
  if (!token) throw new Error('User is not authenticated');

  const clientRegion = getRegionFromArn(agentRuntimeArn) || region;
  const providerName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const client = new BedrockAgentCoreClient({
    region: clientRegion,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region },
      identityPoolId,
      logins: { [providerName]: token },
    }),
  });

  const payload: AgentCoreRequest & { operation: 'question_readiness' } = {
    operation: 'question_readiness',
    messages: [],
    system_prompt: '',
    prompt: [{ text: question }],
    model: {
      type: 'bedrock',
      modelId: model.modelId,
      region: model.region || modelRegion,
    },
    session_id: sessionId,
  };
  const response = (await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn,
      runtimeSessionId: sessionId,
      qualifier: 'DEFAULT',
      payload: JSON.stringify(payload),
    })
  )) as RuntimeResponse;

  return parseResult(await readTextResponse(response));
};
