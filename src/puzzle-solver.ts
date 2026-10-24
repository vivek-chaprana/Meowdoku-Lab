export type Board = number[][];

export function validateBoard(board: unknown): asserts board is Board {
  if (!Array.isArray(board) || !board.length || board.some(row => !Array.isArray(row) || row.length !== board.length)) {
    throw new Error("Board must be a nonempty square array of rows.");
  }
  if (board.some(row => row.some((color: unknown) => !Number.isSafeInteger(color)))) {
    throw new Error("Color identifiers must be safe integers.");
  }
  if (new Set(board.flat()).size !== board.length) {
    throw new Error("An N by N board must contain exactly N colors.");
  }
}

export const exampleBoard: Board = [
  [1, 1, 1, 1, 1, 2, 2],
  [1, 1, 1, 2, 1, 2, 2],
  [1, 1, 3, 2, 2, 2, 2],
  [4, 4, 3, 5, 5, 5, 5],
  [4, 6, 3, 7, 7, 7, 5],
  [6, 6, 3, 3, 3, 7, 3],
  [6, 6, 6, 3, 3, 3, 3],
];

type Cell = { row: number; col: number; color: number; groups: number[] };
type State = { active: number[]; required: number[]; cats: number[] };

function prepare(board: Board) {
  validateBoard(board);
  const size = board.length;
  const colors = [...new Set(board.flat())];
  const cells: Cell[] = board.flatMap((row, r) =>
    row.map((color, c) => ({
      row: r,
      col: c,
      color,
      groups: [r, size + c, 2 * size + colors.indexOf(color)],
    })),
  );
  // Pairwise conflicts are equivalent to the secondary 2x2 constraints.
  // Each set also contains its own cell, so choosing it removes it from active.
  const conflicts = cells.map(
    (a) =>
      new Set(
        cells.flatMap((b, id) =>
          a.row === b.row || a.col === b.col || a.color === b.color || (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1)
            ? [id]
            : [],
        ),
      ),
  );
  const initial: State = {
    active: cells.map((_, id) => id),
    required: Array.from({ length: 3 * size }, (_, id) => id),
    cats: [],
  };
  return { size, cells, conflicts, initial };
}

type Model = ReturnType<typeof prepare>;

function optionsFor(model: Model, state: State, group: number) {
  return state.active.filter((id) => model.cells[id].groups.includes(group));
}

function choose(model: Model, state: State, id: number): State {
  return {
    active: state.active.filter((other) => !model.conflicts[id].has(other)),
    required: state.required.filter((group) => !model.cells[id].groups.includes(group)),
    cats: [...state.cats, id],
  };
}

export type Stats = {
  nodes: number;
  guesses: number;
  deadEnds: number;
  forcedPlacements: number;
  propagationEliminations: number;
};

function newStats(): Stats {
  return { nodes: 0, guesses: 0, deadEnds: 0, forcedPlacements: 0, propagationEliminations: 0 };
}

function propagate(model: Model, start: State, stats: Stats): State | null {
  let state = start;
  while (true) {
    const groups = state.required.map((group) => optionsFor(model, state, group));
    if (groups.some((options) => options.length === 0)) return null;

    const forced = groups.find((options) => options.length === 1);
    if (forced) {
      stats.forcedPlacements++;
      state = choose(model, state, forced[0]);
      continue;
    }

    const eliminated = new Set<number>();
    for (const options of groups) {
      const members = new Set(options);
      for (const candidate of state.active) {
        // A member can itself satisfy this group; don't eliminate it for
        // conflicting with the other mutually exclusive choices in the group.
        if (!members.has(candidate) && options.every((option) => model.conflicts[candidate].has(option))) {
          eliminated.add(candidate);
        }
      }
    }
    // This includes common-neighbor exclusions and colors locked to a row/column.
    if (!eliminated.size) return state;
    stats.propagationEliminations += eliminated.size;
    state = { ...state, active: state.active.filter((id) => !eliminated.has(id)) };
  }
}

function toGrid(model: Model, ids: number[]): Board {
  const grid = Array.from({ length: model.size }, () => Array<number>(model.size).fill(0));
  for (const id of ids) {
    const { row, col } = model.cells[id];
    grid[row][col] = 1;
  }
  return grid;
}

export type SolveResult = { solutions: Board[]; stats: Stats };

function solve(board: Board, propagation: boolean): SolveResult {
  const model = prepare(board);
  const stats = newStats();
  const solutions: Board[] = [];

  function search(input: State) {
    stats.nodes++;
    const state = propagation ? propagate(model, input, stats) : input;
    if (!state) {
      stats.deadEnds++;
      return;
    }
    if (!state.required.length) {
      solutions.push(toGrid(model, state.cats));
      return;
    }
    // Algorithm X's smallest-primary-column heuristic, using plain arrays.
    let best: number[] | undefined;
    for (const group of state.required) {
      const options = optionsFor(model, state, group);
      if (!options.length) {
        stats.deadEnds++;
        return;
      }
      if (!best || options.length < best.length) best = options;
    }
    for (const id of best!) {
      if (best!.length > 1) stats.guesses++;
      search(choose(model, state, id));
    }
  }

  search(model.initial);
  return { solutions, stats };
}

// Both enumerate ALL solutions, making the comparison fair and uniqueness exact.
export function solveBasic(board: Board): SolveResult {
  return solve(board, false);
}
export function solveWithPropagation(board: Board): SolveResult {
  return solve(board, true);
}

export type TimedResult = SolveResult & { elapsedMs: number };
export type ComparisonResult = { basic: TimedResult; propagation: TimedResult; sameSolutions: boolean };

export function compareSolvers(board: Board): ComparisonResult {
  const run = (method: (board: Board) => SolveResult): TimedResult => {
    const start = performance.now();
    const result = method(board);
    return { ...result, elapsedMs: performance.now() - start };
  };
  const basic = run(solveBasic);
  const propagation = run(solveWithPropagation);
  const signature = (result: SolveResult) => JSON.stringify(result.solutions.map(grid => JSON.stringify(grid)).sort());
  return { basic, propagation, sameSolutions: signature(basic) === signature(propagation) };
}

export class PuzzleSolver {
  private readonly board: Board;
  constructor(board: Board) {
    validateBoard(board);
    this.board = board.map(row => [...row]);
  }
  solveBasic() { return solveBasic(this.board); }
  solveWithPropagation() { return solveWithPropagation(this.board); }
  solveBoth() { return compareSolvers(this.board); }
}

// Inspect deductions made before any guesses. Coordinates are zero-based here.
export function inspectPropagation(board: Board) {
  const model = prepare(board);
  const stats = newStats();
  const state = propagate(model, model.initial, stats);
  const possible = new Set(state ? [...state.active, ...state.cats] : []);
  return {
    contradiction: state === null,
    cats: state ? toGrid(model, state.cats) : null,
    excluded: model.cells.flatMap((cell, id) => (possible.has(id) ? [] : [{ row: cell.row, col: cell.col }])),
    stats,
  };
}
