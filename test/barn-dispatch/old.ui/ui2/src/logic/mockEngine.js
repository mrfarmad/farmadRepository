import { CONTROLLERS } from '../config/controllers';

export function generateInitialState(){
 return CONTROLLERS.map(c=>({
   ...c,
   comm:'OK',
   sensors:{temperature:20,humidity:55,nh3:10},
   history:{
     temperature:[20],humidity:[55],nh3:[10],
     times:[new Date().toISOString()]
   },
   channels:[
     {id:'fan',name:'Вентиляторы',state:'ON',vfd:null,
      devices:[
        {id:'d1',name:'Фан 1',state:'ON',vfd:null},
        {id:'d2',name:'Фан 2',state:'OFF',vfd:{type:'GF',setFreq:35,runFreq:34,alarmCode:null}}
      ]
     }
   ]
 }));
}

export function updateMockControllers(list){
 const next=list.map(c=>{
   const t=c.sensors.temperature + (Math.random()*2-1);
   const rh=c.sensors.humidity + (Math.random()*4-2);
   const nh3=Math.max(0,c.sensors.nh3 + Math.round(Math.random()*4-2));
   const time=new Date().toISOString();

   return {
     ...c,
     sensors:{temperature:+t.toFixed(1),humidity:+rh.toFixed(1),nh3},
     history:{
       temperature:[...c.history.temperature.slice(-199),+t.toFixed(1)],
       humidity:[...c.history.humidity.slice(-199),+rh.toFixed(1)],
       nh3:[...c.history.nh3.slice(-199),nh3],
       times:[...c.history.times.slice(-199),time]
     }
   };
 });
 return {next,faults:[]};
}
