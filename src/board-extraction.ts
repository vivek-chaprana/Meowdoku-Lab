import type { Board } from './puzzle-solver';
export type RGB = [number, number, number];
export type Extraction = { board: Board; palette: string[]; bounds: { x:number; y:number; width:number; height:number }; size:number };
type Tile = { x:number; y:number; w:number; h:number; area:number };
const distance = (a:RGB,b:RGB) => a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);

// Detect the repeated, separated colored squares, rather than assuming a screen
// resolution, fixed board location, or reading the decorative color legend.
export function extractBoard(data: Uint8ClampedArray, width:number, height:number, palette:string[]): Extraction {
  const visited=new Uint8Array(width*height);
  const queue=new Int32Array(width*height);
  const rgb=(p:number):RGB=>[data[p*4],data[p*4+1],data[p*4+2]];
  const colored=(p:number)=>{
    const [r,g,b]=rgb(p), high=Math.max(r,g,b),low=Math.min(r,g,b);
    return data[p*4+3]>200 && high-low>25 && high>75 && low<235;
  };
  const tiles:Tile[]=[];
  for(let start=0;start<visited.length;start++) {
    if(visited[start] || !colored(start)) continue;
    let head=0,tail=1; queue[0]=start; visited[start]=1;
    let left=width,right=0,top=height,bottom=0;
    const seed=rgb(start);
    while(head<tail) {
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      const neighbors=[x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1];
      for(const next of neighbors) {
        if(next<0 || visited[next] || !colored(next) || distance(seed,rgb(next))>45**2) continue;
        visited[next]=1;queue[tail++]=next;
      }
    }
    const w=right-left+1,h=bottom-top+1;
    if(w>=width*.025 && h>=width*.025 && w/h>.78 && w/h<1.28 && tail/(w*h)>.6)
      tiles.push({x:left,y:top,w,h,area:tail});
  }
  let best:Tile[][]|undefined, score=0;
  for(const seed of tiles) {
    const similar=tiles.filter(t=>Math.abs(t.w-seed.w)<seed.w*.18 && Math.abs(t.h-seed.h)<seed.h*.18);
    const rows:Tile[][]=[];
    for(const tile of similar.sort((a,b)=>a.y-b.y)) {
      let row=rows.find(row=>Math.abs(row[0].y-tile.y)<seed.h*.22);
      if(!row) { row=[];rows.push(row); } row.push(tile);
    }
    for(const row of rows) row.sort((a,b)=>a.x-b.x);
    for(let start=0;start<rows.length;start++) {
      const first=rows[start],n=first.length;
      if(n<4 || n>12 || start+n>rows.length) continue;
      const pitch=(first[n-1].x-first[0].x)/(n-1);
      if(pitch<seed.w*.95 || pitch>seed.w*1.35) continue;
      const square=rows.slice(start,start+n);
      if(!square.every((row,r)=>row.length===n && row.every((tile,c)=>
        Math.abs(tile.x-(first[0].x+c*pitch))<pitch*.12 && Math.abs(tile.y-(first[0].y+r*pitch))<pitch*.12))) continue;
      const area=n*n*seed.w*seed.h;
      if(area>score) {score=area;best=square;}
    }
  }
  if(!best) throw new Error('Could not find a clear 4×4–12×12 grid. Use a straight, unobstructed screenshot with all board edges visible.');
  const sample=(tile:Tile):RGB=>{
    const bins=new Map<string,{count:number;sum:RGB}>();
    for(let y=Math.ceil(tile.y+tile.h*.2);y<tile.y+tile.h*.8;y++) for(let x=Math.ceil(tile.x+tile.w*.2);x<tile.x+tile.w*.8;x++) {
      const value=rgb(y*width+x),key=value.map(v=>Math.floor(v/16)).join(',');
      const bin=bins.get(key)??{count:0,sum:[0,0,0] as RGB};
      bin.count++;value.forEach((v,i)=>{bin.sum[i]+=v;});bins.set(key,bin);
    }
    const largest=[...bins.values()].sort((a,b)=>b.count-a.count)[0];
    return largest.sum.map(v=>Math.round(v/largest.count)) as RGB;
  };
  const groups:RGB[]=[];
  const grouped=best.map(row=>row.map(tile=>{
    const value=sample(tile);
    let group=groups.findIndex(color=>distance(color,value)<32**2);
    if(group<0) {group=groups.length;groups.push(value);} return group;
  }));
  const size=best.length;
  if(groups.length!==size) throw new Error(`Detected a ${size}×${size} grid but ${groups.length} colors; expected ${size}. Try a clearer screenshot or recreate the regions manually.`);
  // Assign distinct palette slots globally: two similar screenshot colors must
  // never be merged simply because they are nearest the same paint swatch.
  const anchors=palette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as RGB);
  const memo=new Map<string,{cost:number;slots:number[]}>();
  function assign(group:number,used:number):{cost:number;slots:number[]} {
    if(group===groups.length)return {cost:0,slots:[]};
    const key=`${group}:${used}`,cached=memo.get(key);if(cached)return cached;
    let best={cost:Infinity,slots:[] as number[]};
    anchors.forEach((anchor,slot)=>{
      if(used&(1<<slot))return;
      const rest=assign(group+1,used|(1<<slot));
      const cost=distance(groups[group],anchor)+rest.cost;
      if(cost<best.cost)best={cost,slots:[slot,...rest.slots]};
    });memo.set(key,best);return best;
  }
  const slots=assign(0,0).slots, sampledPalette=[...palette];
  groups.forEach((color,i)=>{sampledPalette[slots[i]]='#'+color.map(v=>v.toString(16).padStart(2,'0')).join('');});
  const left=best[0][0],right=best[size-1][size-1];
  return {board:grouped.map(row=>row.map(group=>slots[group])),palette:sampledPalette,size,
    bounds:{x:left.x/width,y:left.y/height,width:(right.x+right.w-left.x)/width,height:(right.y+right.h-left.y)/height}};
}
