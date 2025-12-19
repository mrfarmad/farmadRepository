import React,{useState,useEffect} from 'react';
import { MODE } from './logic/dataMode';
import { generateInitialState } from './logic/mockEngine';
import { startUpdateLoop } from './logic/updateEngine';
import ControllerCard from './components/ControllerCard';

export default function App(){
 const [mockMode,setMockMode]=useState(true);
 const [controllers,setControllers]=useState(generateInitialState());

 useEffect(()=>{
   if(mockMode) setControllers(generateInitialState());
   else setControllers([]);
 },[mockMode]);

 useEffect(()=>{
   const id=startUpdateLoop(mockMode?MODE.MOCK:MODE.SERVER,controllers,setControllers);
   return ()=>clearInterval(id);
 },[mockMode,controllers]);

 return (
   <div className='p-4 grid grid-cols-3 gap-4'>
     <button onClick={()=>setMockMode(m=>!m)} className='col-span-3 bg-blue-600 text-white px-4 py-2 rounded'>
       {mockMode?'Mock ON':'Server mode'}
     </button>
     {controllers.map(c=><ControllerCard key={c.code} controller={c}/>)}
   </div>
 );
}
