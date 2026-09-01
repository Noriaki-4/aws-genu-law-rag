import { describe, expect, test, vi } from 'vitest';
import { installReadableStreamAsyncIterator } from '../../src/features/legalRag/readableStreamAsyncIterator';

describe('Legal RAG ReadableStream compatibility', () => {
  test('adds async iteration to a getReader-only stream', async () => {
    class ReaderOnlyStream<T> {
      private offset = 0;

      constructor(private readonly chunks: T[]) {}

      getReader() {
        return {
          read: async () =>
            this.offset < this.chunks.length
              ? { done: false as const, value: this.chunks[this.offset++] }
              : { done: true as const, value: undefined },
          cancel: vi.fn(),
          releaseLock: vi.fn(),
        };
      }
    }

    installReadableStreamAsyncIterator({
      prototype:
        ReaderOnlyStream.prototype as unknown as ReadableStream<unknown>,
    });
    const stream = new ReaderOnlyStream(['first', 'second']);
    const values: string[] = [];

    for await (const value of stream as unknown as AsyncIterable<string>) {
      values.push(value);
    }

    expect(values).toEqual(['first', 'second']);
  });

  test('does not replace a browser-provided async iterator', () => {
    const existing = vi.fn();
    const prototype = {
      getReader: vi.fn(),
      [Symbol.asyncIterator]: existing,
    } as unknown as ReadableStream<unknown>;

    installReadableStreamAsyncIterator({ prototype });

    expect(
      (prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator]
    ).toBe(existing);
  });
});
