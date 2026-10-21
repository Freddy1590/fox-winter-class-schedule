'use strict';
{
  const S=WinterSchedule;
  const minutes=value=>{const m=/^(\d{2}):(\d{2})$/.exec(value||'');return m&&Number(m[1])<24&&Number(m[2])<60?Number(m[1])*60+Number(m[2]):null;};
  const range=block=>{const m=block.time.match(/\d{2}:\d{2}/g);return m?.length===2?m.map(minutes):null;};
  const intersects=(a,b)=>a[0]<b[1]&&a[1]>b[0];
  const classSessions=id=>S.weekdays.flatMap((day,index)=>S.slotsFor(index,id).map(key=>({day:index,dayName:day,key,time:S.blocks.find(b=>b.key===key).time})));
  function build(config={}) {
    const days=[...new Set((config.days||[]).filter(d=>Number.isInteger(d)&&d>=0&&d<5))].sort();
    const preferences=[...new Set((config.preferences||[]).filter(id=>S.classes.some(c=>c.id===id&&id!=='dis')))];
    const allowed=[...preferences,...(config.includeDis?['dis']:[])];
    const focus=S.focus.some(f=>f.id===config.focus)?config.focus:'';
    const issues=[];
    if(!days.length)issues.push('참여요일을 선택해 주세요.');
    if(!focus)issues.push('집중 방식을 선택해 주세요.');
    if(!preferences.length)issues.push('원하는 클래스를 선택해 주세요.');
    const rows=S.weekdays.map((dayName,day)=>{
      const active=days.includes(day),window=config.dayTimes?.[day]||{};
      const start=minutes(window.start),end=minutes(window.end),validTime=start!==null&&end!==null&&start<end;
      if(active&&!validTime)issues.push(dayName+': 희망 등원·하원 시간을 확인해 주세요. 하원은 등원보다 늦어야 합니다.');
      const blocks=S.planForDay(day).map(block=>{
        const times=range(block),fits=active&&validTime&&!!times&&start<=times[0]&&end>=times[1];
        const overlaps=active&&validTime&&!!times&&intersects([start,end],times);
        const candidates=['am','pm'].includes(block.key)?block.ids.filter(id=>allowed.includes(id)):[];
        const requested=config.selections?.[day+':'+block.key]||'';
        let id='',problem='';
        if(active&&['am','pm'].includes(block.key)&&requested) {
          if(!candidates.includes(requested))problem='이전 선택이 현재 희망 활동·요일과 맞지 않습니다. 다시 선택해 주세요.';
          else if(!fits)problem='선택한 활동의 전체 시간이 희망시간에 들어오지 않습니다.';
          else id=requested;
        }
        if(problem)issues.push(dayName+' '+block.time+': '+problem);
        if(active&&block.key.startsWith('focus')&&focus) {
          if(fits)id=focus==='both'?(block.key==='focus1'?'english':'math'):focus;
          else issues.push(dayName+' '+block.time+' '+S.program(focus==='both'?(block.key==='focus1'?'english':'math'):focus).name+': 희망시간과 맞지 않아 협의가 필요합니다.');
        }
        return {...block,ids:id?[id]:[],selectedId:id,candidates,fits,overlaps,problem,requested,conflicts:[]};
      });
      return {day,dayName,active,start,end,startText:window.start||'',endText:window.end||'',validTime,blocks};
    });
    const basics=(config.basics||[]).map((item,index)=>{
      const name=String(item.name||'').trim().slice(0,80),owner=String(item.owner||'').trim().slice(0,40);
      const day=Number.isInteger(item.day)&&item.day>=0&&item.day<5?item.day:null;
      const start=minutes(item.start),end=minutes(item.end),validTime=start!==null&&end!==null&&start<end;
      const problems=[];
      if(day===null)problems.push('참여요일 미확정');
      if(!item.start||!item.end)problems.push('시간 미확정');
      else if(!validTime)problems.push('시간 확인 필요 · 종료는 시작보다 늦어야 합니다');
      if(day!==null) {
        const row=rows[day];
        if(!row.active)problems.push('참여요일 밖');
        else if(!row.validTime)problems.push('요일별 등하원 시간 확인 필요');
        else if(validTime&&(start<row.start||end>row.end))problems.push('희망 등하원 시간 밖');
      }
      const timed=problems.length===0;
      if(!name)problems.push('프로그램명 미입력');
      return {index,name,label:name||'베이직 '+(index+1)+' · 이름 미입력',owner,day,dayName:day===null?'요일 미확정':S.weekdays[day],start,end,validTime,startText:item.start||'',endText:item.end||'',time:!item.start&&!item.end?'시간 미확정':(item.start||'시작 미확정')+'–'+(item.end||'종료 미확정'),timed,problems,conflicts:[]};
    });
    for(const basic of basics.filter(item=>item.timed))for(const block of rows[basic.day].blocks) {
      const shared=['lunch','stretch','break'].includes(block.key);
      if((shared?!block.overlaps:!block.fits)||(!block.selectedId&&!shared))continue;
      if(intersects([basic.start,basic.end],range(block))) {
        basic.conflicts.push(block.time+' '+(block.selectedId?S.program(block.selectedId).name:block.label));
        block.conflicts.push(basic.label);
      }
    }
    for(let i=0;i<basics.length;i++)for(let j=i+1;j<basics.length;j++) {
      const a=basics[i],b=basics[j];
      if(a.validTime&&b.validTime&&a.day!==null&&a.day===b.day&&intersects([a.start,a.end],[b.start,b.end])) {
        a.conflicts.push(b.label+' '+b.time);b.conflicts.push(a.label+' '+a.time);
      }
    }
    for(const row of rows)for(const block of row.blocks)if(block.conflicts.length) {
      block.problem='베이직 시간 겹침: '+block.conflicts.join(' · ')+' · 조정 전 미편성';
      block.ids=[];issues.push(row.dayName+' '+block.time+': '+block.problem);
    }
    for(const basic of basics) {
      if(basic.conflicts.length)basic.problems.push('시간 겹침: '+basic.conflicts.join(' · '));
      basic.scheduled=basic.timed&&!!basic.name&&!basic.conflicts.length;
      basic.status=basic.scheduled?'시간 편성안'+(basic.owner?' · 담당 입력안':' · 담당 미확정'):'미편성 · '+basic.problems.join(' / ');
      if(!basic.scheduled)issues.push((basic.name||'베이직 '+(basic.index+1))+': '+basic.problems.join(' / '));
    }
    // 시간·베이직 충돌로 제외된 선택은 분해 주 1회에 포함하지 않습니다.
    let disCount=0;
    for(const row of rows.filter(r=>r.active))for(const block of row.blocks)if(block.ids.includes('dis')) {
      if(disCount) {block.ids=[];block.problem='분해클래스는 한 주에 오전·오후 중 1회 선택합니다.';issues.push(row.dayName+' '+block.time+': '+block.problem);}
      else disCount++;
    }
    const placements=id=>rows.filter(d=>d.active).flatMap(d=>d.blocks.filter(b=>b.ids.includes(id)).map(b=>({day:d.day,dayName:d.dayName,key:b.key,time:b.time})));
    for(const id of allowed)if(!days.some(day=>S.slotsFor(day,id).some(key=>rows[day].blocks.find(b=>b.key===key).fits)))issues.push(S.program(id).name+': 참여요일·희망시간에 맞는 전체 활동 시간이 없습니다. '+(id==='dis'?'금요일 오전 또는 오후 참여를 협의해 주세요.':'요일·시간을 협의해 주세요.'));
    const preferredActivities=preferences.map(id=>({id,name:S.program(id).name,placements:placements(id)}));
    const scheduledActivities=preferredActivities.filter(item=>item.placements.length),pendingActivities=preferredActivities.filter(item=>!item.placements.length);
    pendingActivities.forEach(item=>issues.push(item.name+': 희망 활동으로 선택했으나 아직 주간표에 편성하지 않았습니다.'));
    const focusPlacements=rows.filter(d=>d.active).flatMap(d=>d.blocks.filter(b=>b.key.startsWith('focus')&&b.ids.length));
    const big3=[
      {title:'분해클래스',name:'분해클래스',selected:!!config.includeDis,placements:placements('dis'),status:!config.includeDis?'미선택':disCount?'1회 편성안 · 실제 참여 시간 협의 중':'참여 시간 선택 필요'},
      {title:'매일 집중타임',name:focus?S.program(focus).name:'집중 방식 미선택',selected:!!focus,placements:focusPlacements,status:!focus?'미선택':!days.length?'참여요일 선택 필요':focusPlacements.length===days.length*2?'선택 요일 편성안':'미편성 시간 있음 · 협의 필요'},
      {title:'원하는 클래스',name:preferences.map(id=>S.program(id).name).join(' · ')||'클래스 미선택',selected:!!preferences.length,placements:preferences.flatMap(placements),scheduledActivities,pendingActivities,status:!preferences.length?'미선택':pendingActivities.length?'미편성 희망 활동 있음':'희망 클래스 모두 편성안'}
    ];
    return {days,validTime:days.length>0&&days.every(day=>rows[day].validTime),preferences,focus,allowed,rows,basics,scheduledBasics:basics.filter(b=>b.scheduled),pendingBasics:basics.filter(b=>!b.scheduled),issues:[...new Set(issues)],big3,placements};
  }
  function chooseSlot(config,key,value) {
    const selections={...config.selections};
    if(value==='dis') {
      const validKeys=new Set(build(config).placements('dis').map(slot=>slot.day+':'+slot.key));
      if([...validKeys].some(other=>other!==key))return {selections,error:'분해클래스는 한 주 1회입니다. 현재 편성된 분해 시간을 미선택으로 바꾼 뒤 다른 시간을 고르세요.'};
      for(const [other,id] of Object.entries(selections))if(id==='dis'&&other!==key&&!validKeys.has(other))delete selections[other];
    }
    selections[key]=value;
    return {selections,error:''};
  }
  globalThis.WinterPlanner={minutes,range,classSessions,build,chooseSlot};
}
