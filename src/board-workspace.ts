import type { ExtractionResponse } from './extraction.worker';
import { exampleBoard } from './puzzle-solver';
import type { Board, TimedResult } from './puzzle-solver';
import type { PropagationResponse } from './propagation.worker';
import type { WorkerResponse } from './solver.worker';
import { renderComparison } from './comparison-results';
import { navbar } from './navigation';

export function mountBoardWorkspace(comparison = false) {

const colors = [
  { name: 'Gold / Mustard', hex: '#dfbd51' },
  { name: 'Pink / Pale Pink / Pale Rose', hex: '#f0bfd0' },
  { name: 'Rose / Fuchsia / Dark Rose', hex: '#c95b88' },
  { name: 'Purple', hex: '#b59bd6' },
  { name: 'Light Blue / Pale Blue', hex: '#b9d9ef' },
  { name: 'Blue', hex: '#7da9dd' },
  { name: 'Teal / Turquoise', hex: '#77c5bc' },
  { name: 'Light Green', hex: '#b8d899' },
  { name: 'Dark Green', hex: '#7ea582' },
  { name: 'Olive-Yellow', hex: '#c4c77e' },
  { name: 'Brown / Tan', hex: '#c69e7f' },
  { name: 'Orange', hex: '#eeab70' },
];

document.title = comparison ? 'Meowdoku Algorithm Comparison — Backtracking & Deductions' : 'Meowdoku Solver — Upload, Build & Solve Cat Puzzles';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
${navbar(comparison)}
<main class="home"><section class="intro"><p class="eyebrow">${comparison ? 'ONE PUZZLE. TWO APPROACHES.' : 'A LITTLE COLOR. A LITTLE CAT LOGIC.'}</p><h1>${comparison ? 'Compare the search.<br><span>See the difference.</span>' : 'Every cat has<br><span>its perfect spot.</span>'}</h1><p>${comparison ? 'Build or upload a puzzle, then compare both solvers on the same board.' : 'Recreate your puzzle. We’ll find where the cats belong.'}</p></section>
<div class="entry-options" aria-label="Choose how to enter your puzzle">
<button id="manual-option" class="entry-option selected" aria-pressed="true"><span class="option-icon">▦</span><span><strong>Create a board</strong><small>Pick a size, then paint your color regions.</small></span><span class="option-arrow">↗</span></button>
<button id="upload-option" class="entry-option" aria-pressed="false"><span class="option-icon">▧</span><span><strong>Upload a screenshot</strong><small>Turn a screenshot into an editable color board.</small></span><span class="option-arrow">↗</span></button></div>
<section id="upload-panel" class="panel upload-panel" hidden>
<div class="upload-content"><p class="eyebrow">FROM SCREENSHOT TO PUZZLE</p><h2>Bring your board along.</h2><p>Drop in a screenshot. We’ll pick out the grid and its colors, ready for you to check and solve.</p>
<label id="drop-zone" class="drop-zone" for="screenshot"><span class="upload-glyph" aria-hidden="true">⇧</span><strong>Choose a screenshot</strong><span>or drag and drop it here</span><small>PNG, JPG or WebP · up to 20 MB</small><input id="screenshot" type="file" accept="image/png,image/jpeg,image/webp"></label>
<p class="hint">Your image stays on this device. Works offline once the app is ready.</p><p id="upload-status" role="status" aria-live="polite"></p><div class="upload-actions"><button id="extract-again" hidden>Extract again</button><button id="remove-image" hidden>Remove image</button></div></div>
<div class="upload-preview"><div id="preview-placeholder"><span aria-hidden="true">▦</span><strong>A clear view works best</strong><p>Include all four board edges. Keep the screenshot straight and unobstructed.</p></div><img id="reference-image" alt="Your uploaded puzzle reference" hidden></div></section>

<div class="builder-layout"><aside class="panel builder-tools"><h2>Make it yours</h2><label for="grid-size">Grid size</label><select id="grid-size">${Array.from({length:9},(_,i)=>`<option value="${i+4}" ${i===3?'selected':''}>${i+4} × ${i+4}</option>`).join('')}</select><p class="hint">Changing size starts a fresh board.</p>
<div class="palette-heading"><label>Color palette</label><span>12 colors</span></div><div id="palette" class="palette" role="group" aria-label="Paint colors"></div><p id="brush-label" class="hint"></p><button id="eraser" aria-pressed="false">⌫ Eraser</button><div class="tool-actions"><button id="undo" disabled>Undo</button><button id="clear">Clear board</button><button id="example">Load example</button></div><div class="rules"><strong>One cat, every region.</strong><p>Exactly one cat per row, column, and color. No touching, even diagonally.</p></div></aside>
<section class="panel builder-canvas"><div class="canvas-heading"><div><p class="eyebrow">YOUR COLORFUL PUZZLE</p><h2>${comparison ? "Comparison board" : "Find their perfect spots"}</h2></div><span id="size-badge" class="tag"></span></div><p class="hint">Choose a color, then click or drag across cells. Keyboard: Tab to a cell, then Enter or Space to paint.</p><div id="paint-grid" class="paint-grid" role="group" aria-label="Editable puzzle board"></div><div class="board-progress"><span id="coverage"></span><span id="color-count"></span></div><div class="actions"><button id="solve" class="primary">${comparison ? "Compare both solvers ↗" : "Find the cats ↗"}</button><button id="cancel-solve" hidden>Cancel</button></div><p id="solve-status" role="status" aria-live="polite">Paint every cell to get started.</p><div id="home-results" hidden><label for="solution-choice">View solution</label><select id="solution-choice"></select><div id="home-metrics" class="home-metrics"></div></div></section></div>
${comparison ? '<details class="panel json-import"><summary>Import a JSON board</summary><label for="board-json">Square matrix of color numbers (4 × 4 to 12 × 12)</label><textarea id="board-json" spellcheck="false" aria-describedby="json-status"></textarea><button id="import-json">Use this board</button><p id="json-status" role="status"></p></details>' : ''}
${comparison ? '<section id="comparison-output" hidden><h2>Results side by side</h2><p id="comparison-verdict" role="status"></p><div class="result-grid"><article id="basic" class="panel result"></article><article id="propagation" class="panel result"></article></div><p class="hint">Both methods enumerate all solutions. Timings include setup and reflect a single run.</p></section>' : ''}</main><footer>Small paws. Strict constraints.</footer>`;
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = el<HTMLDivElement>('paint-grid');
const sizeSelect = el<HTMLSelectElement>('grid-size');
const solveButton = el<HTMLButtonElement>('solve');
const status = el<HTMLParagraphElement>('solve-status');
const undoButton = el<HTMLButtonElement>('undo');
let board: Board = Array.from({length:7},()=>Array<number>(7).fill(-1));
let brush = 0;
let history: { board: Board; colors: typeof colors }[] = [];
let drawing = false;
let worker: Worker | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let result: TimedResult | undefined;
let solutionIndex = 0;
let imageUrl: string | undefined;
let extractionWorker: Worker | undefined;
let extractionTimer: ReturnType<typeof setTimeout> | undefined;
let extractionVersion = 0;
const originalColors = colors.map(color=>({...color}));
const originalPalette = colors.map(color=>color.hex);

function stop() {
  worker?.terminate(); worker = undefined; clearTimeout(timer);
  solveButton.disabled = false; el('cancel-solve').hidden = true;
}
function invalidate() {
  cancelExtraction();
  if (comparison) el('comparison-output').hidden=true;
  stop(); result = undefined; solutionIndex = 0; el('home-results').hidden = true;
  status.className = ''; status.textContent = 'Board updated. Find the cats when you’re ready.';
  grid.querySelectorAll('.cat').forEach(cat=>cat.remove());
  grid.querySelectorAll<HTMLButtonElement>('.paint-cell').forEach(cell=>cell.setAttribute('aria-label',cell.title));
}
function remember() {
  history.push({board:board.map(row=>[...row]),colors:colors.map(color=>({...color}))});
  if (history.length > 100) history.shift();
  undoButton.disabled = false;
}
function updateCell(cell: HTMLButtonElement, r: number, c: number) {
  const color = board[r][c];
  cell.replaceChildren();
  cell.style.background = color === -1 ? '' : colors[color].hex;
  cell.classList.toggle('unpainted', color === -1);
  cell.title = `Row ${r+1}, column ${c+1}: ${color===-1?'Unpainted':colors[color].name}`;
  const hasCat = Boolean(result?.solutions[solutionIndex]?.[r][c]);
  cell.setAttribute('aria-label', `${cell.title}${hasCat?', cat':''}`);
  const label = document.createElement('small'); label.textContent = color===-1?'·':String(color+1); cell.append(label);
  if (hasCat) { const cat=document.createElement('span'); cat.className='cat'; cat.textContent='🐈'; cell.append(cat); }
}
function progress() {
  const values = board.flat();
  const filled = values.filter(v=>v!==-1).length;
  const count = new Set(values.filter(v=>v!==-1)).size;
  el('coverage').textContent = `${filled} / ${values.length} cells painted`;
  el('color-count').textContent = `${count} / ${board.length} colors used`;
  el('color-count').classList.toggle('error',count>board.length);
  el('size-badge').textContent = `${board.length} × ${board.length}`;
}
function drawGrid() {
  grid.replaceChildren(); grid.style.setProperty('--size',String(board.length));
  board.forEach((row,r)=>row.forEach((_,c)=>{
    const cell = document.createElement('button'); cell.className='paint-cell'; cell.type='button';
    cell.dataset.row=String(r); cell.dataset.col=String(c); updateCell(cell,r,c); grid.append(cell);
  }));
  progress();
}
function selectBrush(value: number) {
  brush=value;
  el('palette').querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===brush)));
  el('eraser').setAttribute('aria-pressed',String(brush===-1));
  el('brush-label').textContent=brush===-1?'Selected: Eraser':`Selected: ${colors[brush].name}`;
}
colors.forEach((color,i)=>{
  const button=document.createElement('button'); button.className='swatch'; button.type='button';
  button.style.setProperty('--swatch',color.hex); button.title=color.name;
  button.setAttribute('aria-label',`${i+1}. ${color.name}`); button.setAttribute('aria-pressed','false');
  const chip=document.createElement('span'); chip.className='color-chip'; chip.textContent=String(i+1);
  const name=document.createElement('span'); name.textContent=color.name;
  button.append(chip,name); button.onclick=()=>selectBrush(i); el('palette').append(button);
});
function paint(cell: HTMLButtonElement) {
  const r=Number(cell.dataset.row), c=Number(cell.dataset.col);
  if (board[r][c]===brush) return;
  invalidate(); board[r][c]=brush; updateCell(cell,r,c); progress();
}
grid.onpointerdown=event=>{
  const cell=(event.target as HTMLElement).closest<HTMLButtonElement>('.paint-cell');
  if (!cell || event.button!==0) return;
  event.preventDefault(); cell.focus({preventScroll:true}); remember(); drawing=true; paint(cell);
};
grid.onpointermove=event=>{
  if (!drawing) return;
  const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLButtonElement>('.paint-cell');
  if (cell && grid.contains(cell)) paint(cell);
};
window.addEventListener('pointerup',()=>{ drawing=false; });
window.addEventListener('pointercancel',()=>{ drawing=false; });
window.addEventListener('blur',()=>{ drawing=false; });
grid.onclick=event=>{
  if (event.detail!==0) return;
  const cell=(event.target as HTMLElement).closest<HTMLButtonElement>('.paint-cell');
  if (cell) { remember(); paint(cell); }
};
if (comparison) {
  el<HTMLTextAreaElement>('board-json').value=JSON.stringify(exampleBoard,null,2);
  el('import-json').onclick=()=>{
    try {
      const input: unknown=JSON.parse(el<HTMLTextAreaElement>('board-json').value);
      if(!Array.isArray(input) || input.length<4 || input.length>12 || !input.every(row=>Array.isArray(row) && row.length===input.length && row.every(value=>Number.isSafeInteger(value)))) throw new Error('Enter a square 4–12 grid containing integer color numbers.');
      const values=input as Board;
      const ids=[...new Set(values.flat())];
      if(ids.length!==values.length) throw new Error(`Use exactly ${values.length} distinct colors for this board.`);
      remember();invalidate();board=values.map(row=>row.map(value=>ids.indexOf(value)));
      colors.splice(0,colors.length,...originalColors.map(color=>({...color})));refreshPalette();
      sizeSelect.value=String(board.length);drawGrid();
      el('json-status').textContent='Board imported. Color numbers were mapped to the palette.';
    } catch(error) {el('json-status').textContent=(error as Error).message;}
  };
}
el('eraser').onclick=()=>selectBrush(-1);
undoButton.onclick=()=>{ const previous=history.pop(); if (!previous) return; invalidate(); board=previous.board; colors.splice(0,colors.length,...previous.colors); refreshPalette(); sizeSelect.value=String(board.length); undoButton.disabled=!history.length; drawGrid(); };
el('clear').onclick=()=>{ remember(); invalidate(); board=board.map(row=>row.map(()=>-1)); drawGrid(); };
sizeSelect.onchange=()=>{ remember(); invalidate(); board=Array.from({length:Number(sizeSelect.value)},()=>Array<number>(Number(sizeSelect.value)).fill(-1)); drawGrid(); };
el('example').onclick=()=>{ remember(); invalidate(); board=exampleBoard.map(row=>row.map(color=>color-1)); sizeSelect.value='7'; drawGrid(); status.textContent='Example loaded. Your board is ready.'; };
el<HTMLSelectElement>('solution-choice').onchange=event=>{ solutionIndex=Number((event.target as HTMLSelectElement).value); drawGrid(); };
solveButton.onclick=()=>{
  invalidate();
  const remaining=board.flat().filter(v=>v===-1).length;
  if (remaining) { status.textContent=`Paint the remaining ${remaining} cells first.`; status.className='error'; return; }
  const count=new Set(board.flat()).size;
  if (count!==board.length) { status.textContent=`A ${board.length} × ${board.length} puzzle needs exactly ${board.length} colors. You have ${count}.`; status.className='error'; return; }
  solveButton.disabled=true; el('cancel-solve').hidden=false; status.textContent=comparison?'Running both solvers…':'Finding the cats…';
  try {
    worker=comparison ? new Worker(new URL('./solver.worker.ts',import.meta.url),{type:'module'}) : new Worker(new URL('./propagation.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(event:MessageEvent<PropagationResponse | WorkerResponse>)=>{
      stop();
      if ('error' in event.data) { status.textContent=event.data.error; status.className='error'; return; }
      const response=event.data.result;
      if ('basic' in response) {
        result=response.propagation;
        el('comparison-output').hidden=false;
        renderComparison(board,colors.map(color=>color.hex),response);
        el('comparison-verdict').textContent=response.sameSolutions ? 'Both solvers found the same solution set.' : 'The solution sets differ. Please review the results.';
      } else result=response;
      const count=result.solutions.length;
      status.textContent=count===0?'No solution. Check your color regions and try again.':count===1?'Found it! This board has one unique solution.':`${count} solutions found. Choose one below to explore.`;
      status.className=count?'success':'error';
      el('home-results').hidden=false;
      const picker=el<HTMLSelectElement>('solution-choice'); picker.replaceChildren();
      result.solutions.forEach((_,i)=>picker.add(new Option(`Solution ${i+1}`,String(i))));
      picker.hidden=count<2; document.querySelector<HTMLLabelElement>('label[for="solution-choice"]')!.hidden=count<2;
      const metrics=el('home-metrics'); metrics.replaceChildren();
      for (const [label,value] of [['Time',`${result.elapsedMs.toFixed(2)} ms`],['Guesses',result.stats.guesses],['Forced cats',result.stats.forcedPlacements]]) {
        const item=document.createElement('div'); const title=document.createElement('span'); title.textContent=String(label);
        const number=document.createElement('strong'); number.textContent=String(value); item.append(title,number); metrics.append(item);
      }
      drawGrid();
    };
    worker.onerror=()=>{ stop(); status.textContent='Could not complete this solve. Please try again.'; status.className='error'; };
    worker.postMessage(board.map(row=>[...row]));
    timer=setTimeout(()=>{ stop(); status.textContent='Stopped after 15 seconds. This search is incomplete; try a more constrained board.'; },15000);
  } catch { stop(); status.textContent='Could not start the solver. Please try again.'; status.className='error'; }
};
el('cancel-solve').onclick=()=>{ stop(); status.textContent='Solve cancelled. Your board is ready to edit.'; };
function mode(upload:boolean) {
  el('upload-panel').hidden=!upload;
  el('upload-option').setAttribute('aria-pressed',String(upload)); el('manual-option').setAttribute('aria-pressed',String(!upload));
  el('upload-option').classList.toggle('selected',upload); el('manual-option').classList.toggle('selected',!upload);
}
el('manual-option').onclick=()=>mode(false); el('upload-option').onclick=()=>mode(true);

function cancelExtraction() {
  extractionVersion++;
  if(extractionWorker) el('upload-status').textContent='Extraction cancelled. Your board has not been changed.';
  extractionWorker?.terminate(); extractionWorker=undefined; clearTimeout(extractionTimer);
  el<HTMLButtonElement>('extract-again').disabled=false;
}
function refreshPalette() {
  el('palette').querySelectorAll<HTMLButtonElement>('button').forEach((button,i)=>{
    button.style.setProperty('--swatch',colors[i].hex); button.title=colors[i].name;
    button.setAttribute('aria-label',`${i+1}. ${colors[i].name}`);
    button.lastElementChild!.textContent=colors[i].name;
  });
  selectBrush(brush);
}
function colorName(hex:string) {
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let h=delta===0?0:max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
  h=(h*60+360)%360;
  if(h<12 || h>=350)return 'Rose / Red';
  if(h<45)return max<.85?'Brown / Tan':'Orange';
  if(h<65)return 'Gold / Mustard';
  if(h<85)return 'Olive-Yellow';
  if(h<160)return max<.7?'Dark Green':'Light Green';
  if(h<190)return 'Teal / Turquoise';
  if(h<250)return delta<.25?'Light Blue / Pale Blue':'Blue';
  if(h<285)return 'Purple';
  return min>.6?'Pink / Pale Rose':'Rose / Fuchsia';
}
function removeImage() {
  cancelExtraction();
  if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl=undefined;
  const image=el<HTMLImageElement>('reference-image'); image.onload=null;image.onerror=null;
  image.removeAttribute('src'); image.hidden=true; el('preview-placeholder').hidden=false;
  el<HTMLInputElement>('screenshot').value=''; el('remove-image').hidden=true; el('extract-again').hidden=true;
  el('upload-status').textContent='';
}
function runExtraction() {
  cancelExtraction(); stop();
  const image=el<HTMLImageElement>('reference-image');
  if(!image.complete || !image.naturalWidth) { el('upload-status').textContent='Wait for the screenshot to finish loading.';return; }
  const version=extractionVersion;
  el('upload-status').textContent='Detecting the grid and sampling its colors…';
  el<HTMLButtonElement>('extract-again').disabled=true;
  try {
    const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('Your browser could not read the image. Try another browser.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    extractionWorker=new Worker(new URL('./extraction.worker.ts',import.meta.url),{type:'module'});
    extractionWorker.onmessage=(event:MessageEvent<ExtractionResponse>)=>{
      if(version!==extractionVersion)return;
      extractionWorker?.terminate();extractionWorker=undefined;clearTimeout(extractionTimer);
      el<HTMLButtonElement>('extract-again').disabled=false;
      if('error' in event.data) {el('upload-status').textContent=event.data.error+' Your existing board was kept.';return;}
      const extracted=event.data.result;
      remember();invalidate();board=extracted.board;
      const used=new Set(board.flat());
      extracted.palette.forEach((hex,i)=>{colors[i]=used.has(i)?{hex,name:colorName(hex)}:{...originalColors[i]};});
      refreshPalette();sizeSelect.value=String(extracted.size);drawGrid();
      el('upload-status').textContent=`Extracted ${extracted.size} × ${extracted.size} with ${used.size} colors. Review the board below; click any cell to correct it. Undo restores your previous board.`;
      status.textContent='Screenshot imported. Review the colors, then find the cats.';
    };
    extractionWorker.onerror=()=>{cancelExtraction();el('upload-status').textContent='Extraction failed. Try another screenshot; your existing board was kept.';};
    extractionWorker.postMessage({data:pixels.data,width:canvas.width,height:canvas.height,palette:originalPalette},[pixels.data.buffer]);
    extractionTimer=setTimeout(()=>{cancelExtraction();el('upload-status').textContent='Extraction timed out. Try a smaller, clearer screenshot. Your existing board was kept.';},10000);
  } catch(error) {
    cancelExtraction();el('upload-status').textContent=(error as Error).message;
  }
}
function loadScreenshot(file: File) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { el('upload-status').textContent='Choose a PNG, JPEG, or WebP image.'; return; }
  if (file.size>20*1024*1024) { el('upload-status').textContent='Choose an image smaller than 20 MB.'; return; }
  removeImage(); stop(); imageUrl=URL.createObjectURL(file);
  const image=el<HTMLImageElement>('reference-image');
  const loadVersion=extractionVersion;
  image.onload=()=>{ if(loadVersion===extractionVersion) runExtraction(); };
  image.onerror=()=>{ removeImage(); el('upload-status').textContent='This image could not be read. Try another screenshot.'; };
  image.src=imageUrl; image.hidden=false; el('preview-placeholder').hidden=true;
  el('remove-image').hidden=false;el('extract-again').hidden=false;el('upload-status').textContent='Loading screenshot…';
};
el<HTMLInputElement>('screenshot').onchange=event=>{
  const file=(event.target as HTMLInputElement).files?.[0]; if(file)loadScreenshot(file);
};
const dropZone=el('drop-zone');
dropZone.ondragover=event=>{event.preventDefault();dropZone.classList.add('drag-over');};
dropZone.ondragleave=()=>dropZone.classList.remove('drag-over');
dropZone.ondrop=event=>{event.preventDefault();dropZone.classList.remove('drag-over');const file=event.dataTransfer?.files[0];if(file)loadScreenshot(file);};
el('extract-again').onclick=runExtraction;
el('remove-image').onclick=removeImage;
window.addEventListener('pagehide',()=>{ stop();cancelExtraction();if(imageUrl)URL.revokeObjectURL(imageUrl); });
selectBrush(0); drawGrid();


}
