export {};

declare global {
  interface ReadableStream<R> {
    getIterator(): any;
  }
}
