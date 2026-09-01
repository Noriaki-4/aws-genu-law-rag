type ReadableStreamLikeConstructor = {
  prototype: ReadableStream<unknown>;
};

const asyncIterator = Symbol.asyncIterator;

/**
 * Safari versions without ReadableStream async iteration can still expose
 * getReader(). The Legal RAG page installs the missing protocol before using
 * GenU's standard AgentCore hook to consume the browser response stream.
 */
export const installReadableStreamAsyncIterator = (
  Stream: ReadableStreamLikeConstructor | undefined = globalThis.ReadableStream
): void => {
  const prototype = Stream?.prototype;
  if (!prototype || asyncIterator in prototype) return;

  Object.defineProperty(prototype, asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* <T>(this: ReadableStream<T>): AsyncGenerator<T> {
      const reader = this.getReader();
      let completed = false;
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) {
            completed = true;
            return;
          }
          yield result.value;
        }
      } finally {
        try {
          if (!completed) await reader.cancel();
        } finally {
          reader.releaseLock();
        }
      }
    },
  });
};
