import { MODE,DISPLAY_UPDATE_MS } from './dataMode';
import { updateMockControllers } from './mockEngine';
import { fetchServerState } from './serverEngine';

export function startUpdateLoop(mode,controllers,setControllers){
 if(mode===MODE.MOCK){
   return setInterval(()=>{
     const {next}=updateMockControllers(controllers);
     setControllers(next);
   },DISPLAY_UPDATE_MS);
 }
 if(mode===MODE.SERVER){
   return setInterval(async()=>{
     const data=await fetchServerState();
     if(!data){
       setControllers(c=>c.map(x=>({...x,comm:'ALARM'})));
       return;
     }
     setControllers(data);
   },DISPLAY_UPDATE_MS);
 }
}
