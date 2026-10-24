import type { Board, ComparisonResult, TimedResult } from './puzzle-solver';
const fallbackPalette = ['#e8c7ad', '#c7c8ef', '#e9d891', '#b5d3c5', '#edb8bd', '#c6d8ee', '#d5c1dd', '#c9d19c'];
function drawBoard(container: HTMLElement, board: Board, solution: Board | undefined, palette: string[]) {
  const colors = [...new Set(board.flat())];
  const grid = document.createElement('div');
  grid.className = 'board'; grid.style.setProperty('--size', String(board.length));
  grid.setAttribute('role', 'img');
  const cats = solution?.flatMap((row, r) => row.flatMap((cat, c) => cat ? [`row ${r + 1}, column ${c + 1}`] : []));
  grid.setAttribute('aria-label', `${board.length} by ${board.length} puzzle. ${cats ? `Cats at ${cats.join('; ')}.` : 'No cats placed.'}`);
  board.forEach((row, r) => row.forEach((color, c) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    const index = colors.indexOf(color);
    cell.style.background = palette[color] ?? fallbackPalette[index] ?? `hsl(${index * 137.5 % 360} 45% 80%)`;
    cell.title = `Row ${r + 1}, column ${c + 1} · Color ${color + 1}`;
    cell.setAttribute('aria-hidden', 'true');
    const label = document.createElement('small'); label.textContent = String(color + 1); cell.append(label);
    if (solution?.[r][c]) {
      const cat = document.createElement('span'); cat.className = 'cat'; cat.textContent = '🐈'; cell.append(cat);
    }
    grid.append(cell);
  }));
  container.replaceChildren(grid);
}
function renderMethod(id: 'basic' | 'propagation', board: Board, palette: string[], result?: TimedResult) {
  const panel = document.getElementById(id)!;
  panel.innerHTML = `<div class="method-heading"><span class="eyebrow">${id === 'basic' ? 'BASELINE' : 'WITH DEDUCTIONS'}</span><h2>${id === 'basic' ? 'Backtracking' : 'Propagation'}</h2></div><div class="board-slot"></div><div class="solution-picker"></div><div class="metrics"></div>`;
  const slot = panel.querySelector<HTMLElement>('.board-slot')!;
  drawBoard(slot, board, result?.solutions[0], palette);
  const picker = panel.querySelector<HTMLElement>('.solution-picker')!;
  if (!result) { picker.textContent = 'Waiting to solve'; return; }
  if (!result.solutions.length) picker.textContent = 'No solution';
  else if (result.solutions.length === 1) picker.textContent = 'Unique solution';
  else {
    const label = document.createElement('label'); label.textContent = `${result.solutions.length} solutions · view `;
    const select = document.createElement('select'); select.setAttribute('aria-label', `${id} solution`);
    result.solutions.forEach((_, i) => select.add(new Option(`Solution ${i + 1}`, String(i))));
    select.onchange = () => drawBoard(slot, board, result.solutions[Number(select.value)], palette);
    label.append(select); picker.append(label);
  }
  const metrics = panel.querySelector<HTMLElement>('.metrics')!;
  const entries = [['Time', `${result.elapsedMs.toFixed(3)} ms`], ['Guesses', result.stats.guesses], ['Search calls', result.stats.nodes], ['Dead ends', result.stats.deadEnds], ['Forced cats', result.stats.forcedPlacements], ['Deduced exclusions', result.stats.propagationEliminations]];
  for (const [label, value] of entries) {
    const metric = document.createElement('div');
    const title = document.createElement('span'); title.textContent = String(label);
    const number = document.createElement('strong'); number.textContent = String(value);
    metric.append(title, number); metrics.append(metric);
  }
}
export function renderComparison(board: Board, palette: string[], result?: ComparisonResult) {
  renderMethod('basic', board, palette, result?.basic); renderMethod('propagation', board, palette, result?.propagation);
}
