import { compareSolvers } from './puzzle-solver';
import type { Board, ComparisonResult } from './puzzle-solver';

export type WorkerResponse = { result: ComparisonResult } | { error: string };
self.onmessage = (event: MessageEvent<Board>) => {
  try {
    self.postMessage({ result: compareSolvers(event.data) } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Unable to solve this board.' } satisfies WorkerResponse);
  }
};
