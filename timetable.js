'use strict';
{
  const weekdays=['월요일','화요일','수요일','목요일','금요일'];
  const basicLabs=['AI연구소','SEL연구소','언어연구소'];
  const basicNote='정해진 베이직 활동 시간에 운영하며, 연구소별 세부 편성은 미확정입니다.';
  const isBasic=block=>block.name==='베이직 활동'||basicLabs.includes(block.name);
  const description=block=>[...(block.name==='베이직 활동'?[basicLabs.join(' · ')]:[]),block.detail].filter(Boolean).join(' · ');
  const minutes=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
  const formatTime=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
  const copy=value=>JSON.parse(JSON.stringify(value));
  const dayBlocks=(state,day)=>state.blocks.filter(block=>block.day===day).sort((a,b)=>minutes(a.start)-minutes(b.start)||minutes(a.end)-minutes(b.end)||a.id.localeCompare(b.id));
  function createDefault(){
    const rows=[
      ['09:00','09:30','아침 간식·플래너 작성'],
      ['09:30','10:00','자율학습','방학숙제, 독서, 개인 자습지'],
      ['10:00','11:00','수학 몰입'],
      ['11:00','12:30','베이직 활동'],
      ['12:30','13:10','점심시간'],
      ['13:10','13:50','튼튼 부스터'],
      ['13:50','14:50','영어 몰입'],
      ['14:50','16:20','베이직 활동'],
      ['16:20','16:40','간식'],
      ['16:40','18:10','베이직 활동'],
      ['18:10','19:00','베이직 활동']
    ];
    return {version:1,blocks:weekdays.flatMap((_,day)=>rows.map(([start,end,name,detail=''],index)=>({
      id:'day-'+day+'-'+index,day,start,end,
      name:index===3&&[2,4].includes(day)?'분해 프로젝트(오전)':index===7&&[1,3].includes(day)?'분해 프로젝트(오후)':index===7&&day===2?'합창':name,
      detail
    })))};
  }
  function validate(state){
    if(!state||state.version!==1||!Array.isArray(state.blocks))return ['시간표 형식을 확인해 주세요.'];
    if(state.blocks.length>1000)return ['일정은 1,000개까지 입력할 수 있습니다.'];
    const errors=[],ids=new Set();
    state.blocks.forEach((block,index)=>{
      const label='일정 '+(index+1);
      if(!block||typeof block!=='object'){errors.push(label+': 입력을 확인해 주세요.');return;}
      if(typeof block.id!=='string'||!block.id||block.id.length>100||ids.has(block.id))errors.push(label+': 일정 ID를 확인해 주세요.');
      ids.add(block.id);
      if(!Number.isInteger(block.day)||block.day<0||block.day>4)errors.push(label+': 월~금 중 요일을 선택해 주세요.');
      const start=minutes(block.start),end=minutes(block.end);
      if(start===null||end===null)errors.push(label+': 시작·종료시간을 입력해 주세요.');
      else if(end<=start)errors.push(label+': 종료시간은 시작시간보다 늦어야 합니다.');
      if(typeof block.name!=='string'||!block.name.trim()||block.name.length>200)errors.push(label+': 프로그램명을 200자 이내로 입력해 주세요.');
      if(typeof block.detail!=='string'||block.detail.length>4000)errors.push(label+': 내용은 4,000자 이내로 입력해 주세요.');
    });
    return errors;
  }
  function checked(state){
    const errors=validate(state);
    if(errors.length)throw new Error(errors.join('\n'));
    return {version:1,blocks:state.blocks.map(({id,day,start,end,name,detail})=>({id,day,start,end,name,detail}))};
  }
  function upsert(state,block){
    const next=checked(state),index=next.blocks.findIndex(item=>item.id===block.id);
    if(index<0)next.blocks.push(copy(block));else next.blocks[index]=copy(block);
    return checked(next);
  }
  function remove(state,id){return checked({version:1,blocks:checked(state).blocks.filter(block=>block.id!==id)});}
  function conflicts(state){
    const result=[];
    for(let day=0;day<5;day++){
      const blocks=dayBlocks(state,day);
      for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
        const a=blocks[i],b=blocks[j],start=Math.max(minutes(a.start),minutes(b.start)),end=Math.min(minutes(a.end),minutes(b.end));
        if(start<end)result.push({day,a:a.id,b:b.id,names:[a.name,b.name],start:formatTime(start),end:formatTime(end)});
      }
    }
    return result;
  }
  function bounds(state,day){
    const blocks=day===undefined?state.blocks:dayBlocks(state,day);
    return {start:Math.min(540,...blocks.map(b=>minutes(b.start))),end:Math.max(1140,...blocks.map(b=>minutes(b.end)))};
  }
  function sessionLabels(blocks){
    const groups=new Map();
    for(const block of blocks){
      const key=block.start+'–'+block.end;
      if(!groups.has(key))groups.set(key,new Set());
      groups.get(key).add(block.day);
    }
    return [...groups].sort(([a],[b])=>minutes(a.slice(0,5))-minutes(b.slice(0,5))).map(([time,days])=>[...days].sort((a,b)=>a-b).map(day=>weekdays[day].slice(0,1)).join('·')+' '+time);
  }
  function rows(state){
    const points=[...new Set(state.blocks.flatMap(b=>[minutes(b.start),minutes(b.end)]))].sort((a,b)=>a-b);
    return points.slice(0,-1).map((start,index)=>({start:formatTime(start),end:formatTime(points[index+1]),cells:weekdays.map((_,day)=>dayBlocks(state,day).filter(b=>minutes(b.start)<points[index+1]&&minutes(b.end)>start))}));
  }
  const api={weekdays,basicLabs,basicNote,isBasic,description,minutes,formatTime,createDefault,validate,checked,dayBlocks,upsert,remove,conflicts,bounds,sessionLabels,rows};
  globalThis.WinterTimetable=api;
  if(typeof module!=='undefined')module.exports=api;
}
