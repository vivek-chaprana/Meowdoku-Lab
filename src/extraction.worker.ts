import { extractBoard } from './board-extraction';
import type { Extraction } from './board-extraction';
export type ExtractionResponse = { result: Extraction } | { error: string };
self.onmessage=(event:MessageEvent<{data:Uint8ClampedArray;width:number;height:number;palette:string[]}>)=>{
  try { const {data,width,height,palette}=event.data;self.postMessage({result:extractBoard(data,width,height,palette)} satisfies ExtractionResponse); }
  catch(error) {self.postMessage({error:error instanceof Error?error.message:'Could not extract this board.'} satisfies ExtractionResponse);}
};
