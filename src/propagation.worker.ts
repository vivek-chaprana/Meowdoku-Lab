import { solveWithPropagation } from './puzzle-solver';
import type { Board, TimedResult } from './puzzle-solver';
export type PropagationResponse = { result: TimedResult } | { error: string };
self.onmessage = (event: MessageEvent<Board>) => {
  try {
    const start = performance.now();
    const result = solveWithPropagation(event.data);
    self.postMessage({ result: { ...result, elapsedMs: performance.now() - start } } satisfies PropagationResponse);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Unable to solve this board.' } satisfies PropagationResponse);
  }
};
