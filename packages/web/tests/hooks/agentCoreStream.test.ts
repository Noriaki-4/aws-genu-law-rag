import { describe, expect, test } from 'vitest';
import {
  consumeAgentCoreEventStream,
  isDisplayableAgentCoreEvent,
} from '../../src/utils/agentCoreStream';

const textEvent = (text: string) =>
  JSON.stringify({
    event: { contentBlockDelta: { delta: { text } } },
  });

describe('AgentCore response stream', () => {
  test('reads a browser ReadableStream without an async iterator', async () => {
    const encoded = new TextEncoder().encode(
      `${JSON.stringify({ event: { messageStart: { role: 'assistant' } } })}\n${textEvent('answer text')}\n`
    );
    let offset = 0;
    const stream = {
      getReader: () => ({
        read: async () => {
          if (offset >= encoded.length) return { done: true as const };
          const nextOffset = Math.min(offset + 7, encoded.length);
          const value = encoded.slice(offset, nextOffset);
          offset = nextOffset;
          return { done: false as const, value };
        },
        releaseLock: () => undefined,
      }),
    } as ReadableStream<Uint8Array>;
    const events: string[] = [];

    await consumeAgentCoreEventStream(stream, (event) => events.push(event));

    expect(events).toHaveLength(2);
    expect(events[1]).toBe(textEvent('answer text'));
  });

  test('preserves split UTF-8 characters and normalizes SSE data lines', async () => {
    const encoded = new TextEncoder().encode(`data: ${textEvent('café')}\n`);
    const splitAt = encoded.indexOf(0xc3) + 1;
    const stream = (async function* () {
      yield encoded.slice(0, splitAt);
      yield encoded.slice(splitAt);
    })();
    const events: string[] = [];

    await consumeAgentCoreEventStream(stream, (event) => events.push(event));

    expect(events).toEqual([textEvent('café')]);
  });

  test('keeps progress events non-displayable until answer text or an error', () => {
    expect(
      isDisplayableAgentCoreEvent(
        JSON.stringify({ event: { messageStart: { role: 'assistant' } } })
      )
    ).toBe(false);
    expect(
      isDisplayableAgentCoreEvent(
        JSON.stringify({
          event: {
            contentBlockDelta: {
              delta: { reasoningContent: { text: 'searching' } },
            },
          },
        })
      )
    ).toBe(false);
    expect(isDisplayableAgentCoreEvent(textEvent('answer'))).toBe(true);
    expect(
      isDisplayableAgentCoreEvent(
        JSON.stringify({
          event: { internalServerException: { message: 'failed' } },
        })
      )
    ).toBe(true);
  });
});
