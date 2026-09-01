export type AgentCoreResponseStream =
  | AsyncIterable<Uint8Array>
  | ReadableStream<Uint8Array>
  | Blob;

const isAsyncIterable = (
  stream: AgentCoreResponseStream
): stream is AsyncIterable<Uint8Array> =>
  typeof (stream as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] ===
  'function';

const isReadableStream = (
  stream: AgentCoreResponseStream
): stream is ReadableStream<Uint8Array> =>
  typeof (stream as ReadableStream<Uint8Array>).getReader === 'function';

const normalizeEventLine = (line: string): string => {
  if (!line.trim()) return '';
  return line.startsWith('data:') ? line.substring(5).trimStart() : line;
};

export const isDisplayableAgentCoreEvent = (eventText: string): boolean => {
  try {
    const parsed = JSON.parse(eventText) as {
      event?: {
        contentBlockStart?: { start?: { text?: unknown } };
        contentBlockDelta?: { delta?: { text?: unknown } };
        internalServerException?: unknown;
        modelStreamErrorException?: unknown;
        serviceUnavailableException?: unknown;
        throttlingException?: unknown;
        validationException?: unknown;
        redactContent?: { redactAssistantContentMessage?: unknown };
      };
    };
    const event = parsed.event;
    if (!event) return false;

    const startText = event.contentBlockStart?.start?.text;
    const deltaText = event.contentBlockDelta?.delta?.text;
    const redactedText = event.redactContent?.redactAssistantContentMessage;
    return (
      (typeof startText === 'string' && startText.length > 0) ||
      (typeof deltaText === 'string' && deltaText.length > 0) ||
      typeof redactedText === 'string' ||
      Boolean(
        event.internalServerException ||
        event.modelStreamErrorException ||
        event.serviceUnavailableException ||
        event.throttlingException ||
        event.validationException
      )
    );
  } catch {
    return false;
  }
};

export const consumeAgentCoreEventStream = async (
  stream: AgentCoreResponseStream,
  onEvent: (eventText: string) => void
): Promise<void> => {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const emitCompleteLines = () => {
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const eventText = normalizeEventLine(line);
      if (eventText) onEvent(eventText);
    }
  };
  const consumeChunk = (chunk: Uint8Array) => {
    buffer += decoder.decode(chunk, { stream: true });
    emitCompleteLines();
  };

  if (isAsyncIterable(stream)) {
    for await (const chunk of stream) consumeChunk(chunk);
  } else if (isReadableStream(stream)) {
    const reader = stream.getReader();
    try {
      let result = await reader.read();
      while (!result.done) {
        consumeChunk(result.value);
        result = await reader.read();
      }
    } finally {
      reader.releaseLock();
    }
  } else if (typeof Blob !== 'undefined' && stream instanceof Blob) {
    consumeChunk(new Uint8Array(await stream.arrayBuffer()));
  } else {
    throw new Error(
      'AgentCore Runtime returned an unsupported response stream.'
    );
  }

  buffer += decoder.decode();
  const finalEvent = normalizeEventLine(buffer);
  if (finalEvent) onEvent(finalEvent);
};
