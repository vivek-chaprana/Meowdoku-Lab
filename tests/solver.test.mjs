import test from 'node:test';
import assert from 'node:assert/strict';
import { PuzzleSolver, compareSolvers, exampleBoard, inspectPropagation, validateBoard } from '../src/puzzle-solver.ts';
const keys = solutions => solutions.map(grid => grid.map(row => {
  assert.equal(row.filter(cat => cat === 1).length, 1);
  return row.indexOf(1);
}).join(',')).sort();
function oracle(board) {
  const answers = [];
  function visit(columns, remaining) {
    if (remaining.length) {
      for (const c of remaining) visit([...columns, c], remaining.filter(other => other !== c));
      return;
    }
    if (columns.some((c, r) => r > 0 && Math.abs(c - columns[r - 1]) <= 1)) return;
    if (new Set(columns.map((c, r) => board[r][c])).size !== board.length) return;
    answers.push(columns.join(','));
  }
  visit([], Array.from({ length: board.length }, (_, c) => c));
  return answers.sort();
}
test('example has one solution and propagation needs no guesses', () => {
  const result = compareSolvers(exampleBoard);
  assert.equal(result.sameSolutions, true);
  assert.deepEqual(keys(result.basic.solutions), ['3,6,2,4,0,5,1']);
  assert.equal(result.propagation.stats.guesses, 0);
  assert(result.basic.stats.guesses > 0);
  assert(result.basic.elapsedMs >= 0 && result.propagation.elapsedMs >= 0);
  assert(inspectPropagation(exampleBoard).excluded.some(cell => cell.row === 4 && cell.col === 1));
});
test('no solutions, multiple solutions, and one-cell puzzles', () => {
  for (const board of [[[42]], [[1, 1], [2, 2]], Array.from({ length: 4 }, (_, r) => Array(4).fill(r))]) {
    const result = compareSolvers(board);
    assert.deepEqual(keys(result.basic.solutions), oracle(board));
    assert.deepEqual(keys(result.propagation.solutions), oracle(board));
  }
});
test('reject malformed boards with clear errors', () => {
  for (const input of [null, {}, [], [1], [[1], null], [[1, 2], [1]], [['cat']], [[NaN]], [[1, 1], [1, 1]]]) {
    assert.throws(() => validateBoard(input), /Board|Color|colors/);
    assert.throws(() => compareSolvers(input), /Board|Color|colors/);
  }
});
test('class snapshots inputs and repeated calls leave the board intact', () => {
  const board = exampleBoard.map(row => [...row]);
  const solver = new PuzzleSolver(board);
  board[0][0] = 999;
  assert.equal(solver.solveBoth().sameSolutions, true);
  assert.deepEqual(keys(solver.solveBasic().solutions), keys(solver.solveWithPropagation().solutions));
  const snapshot = JSON.stringify(exampleBoard);
  compareSolvers(exampleBoard);
  assert.equal(JSON.stringify(exampleBoard), snapshot);
});
test('both methods match independent exhaustive search on 48 seeded boards', () => {
  let seed = 123456789;
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let n = 4; n <= 7; n++) {
    const legal = oracle(Array.from({ length: n }, (_, r) => Array(n).fill(r))).map(key => key.split(',').map(Number));
    for (let trial = 0; trial < 12; trial++) {
      const board = Array.from({ length: n }, () => Array.from({ length: n }, () => random(n)));
      if (trial % 2 === 0) legal[random(legal.length)].forEach((c, r) => { board[r][c] = r; });
      else board[0] = Array.from({ length: n }, (_, c) => c);
      const expected = oracle(board);
      const result = compareSolvers(board);
      assert.deepEqual(keys(result.basic.solutions), expected);
      assert.deepEqual(keys(result.propagation.solutions), expected);
      assert.equal(result.sameSolutions, true);
    }
  }
});
