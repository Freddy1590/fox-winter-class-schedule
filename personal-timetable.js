'use strict';
(()=>{
  const T=globalThis.WinterTimetable;
  const names=['월요일','화요일','수요일','목요일','금요일'];
  const overlap=(a,b)=>a[0]<b[1]&&a[1]>b[0];
  function kind(block){
    if(['분해클래스','분해 프로젝트(오전)','분해 프로젝트(오후)'].includes(block.name))return 'dis';
    if(T.isBasic(block))return 'basic';
    if(['수학 몰입','영어 몰입'].includes(block.name))return 'focus';
    if(['아침 간식·플래너 작성','자율학습','점심시간','튼튼 부스터','간식'].includes(block.name))return 'common';
    return 'activity';
  }
  const signature=block=>({id:block.id,day:block.day,start:block.start,end:block.end,name:block.name});
  const same=(selection,block)=>!!selection&&['id','day','start','end','name'].every(key=>selection[key]===block[key]);
  function covered(start,end,blocks){
    let cursor=start;
    for(const block of blocks){const a=T.minutes(block.start),b=T.minutes(block.end);if(a>cursor)break;if(b>cursor)cursor=b;if(cursor>=end)return true;}
    return false;
  }
  function build(state,config={}){
    const errors=T.validate(state);
    if(errors.length)return {rows:[],basics:[],issues:errors,scheduledActivities:[],pendingActivities:[],validSelections:[]};
    const days=[...new Set((config.days||[]).filter(day=>Number.isInteger(day)&&day>=0&&day<5))];
    const issues=[],selections=config.selections||{};
    if(!days.length)issues.push('참여요일을 선택해 주세요.');
    const rows=names.map((dayName,day)=>{
      const window=config.dayTimes?.[day]||{},start=T.minutes(window.start),end=T.minutes(window.end),active=days.includes(day),validTime=start!==null&&end!==null&&start<end;
      if(active&&!validTime)issues.push(dayName+': 등하원 시간을 확인해 주세요. 미입력 값은 미확정입니다.');
      const entries=T.dayBlocks(state,day).map(block=>{
        const a=T.minutes(block.start),b=T.minutes(block.end),role=kind(block),fits=active&&validTime&&start<=a&&end>=b,overlaps=active&&validTime&&overlap([start,end],[a,b]);
        const requested=!!selections[block.id],selected=same(selections[block.id],block),problems=[];
        if(requested&&!selected)problems.push('센터 일정 변경 · 참여 시간을 다시 선택해 주세요');
        if(requested&&(!active||!validTime||!fits))problems.push(!active?'참여요일 밖 · 미편성':!validTime?'등하원 시간 미확정 · 미편성':'희망시간 밖 · 미편성');
        if(role==='common'&&overlaps&&!fits)problems.push('부분 참여 협의 필요');
        return {...block,kind:role,a,b,fits,overlaps,requested,selected,problems,conflicts:[],scheduled:(role==='common'||selected)&&fits,requestedStart:overlaps?T.formatTime(Math.max(start,a)):'',requestedEnd:overlaps?T.formatTime(Math.min(end,b)):''};
      });
      return {day,dayName,active,start,end,startText:window.start||'',endText:window.end||'',validTime,entries};
    });
    const basics=(config.basics||[]).map((item,index)=>{
      const name=String(item.name||'').trim().slice(0,80),day=Number.isInteger(item.day)&&item.day>=0&&item.day<5?item.day:null,start=T.minutes(item.start),end=T.minutes(item.end),validTime=start!==null&&end!==null&&start<end,problems=[];
      if(!name)problems.push('프로그램명 미입력');
      if(day===null)problems.push('요일 미확정');
      if(start===null||end===null)problems.push('시간 미확정');else if(!validTime)problems.push('종료시간은 시작시간보다 늦어야 합니다');
      if(day!==null){
        const row=rows[day];
        if(!row.active)problems.push('참여요일 밖');
        else if(!row.validTime)problems.push('등하원 시간 미확정');
        else if(validTime&&(start<row.start||end>row.end))problems.push('희망 등하원 시간 밖');
        if(validTime&&!covered(start,end,row.entries.filter(entry=>entry.kind==='basic')))problems.push('센터 베이직 활동 시간 밖 · 협의 필요');
      }
      return {index,name,label:name||'베이직 '+(index+1)+' · 이름 미입력',day,dayName:day===null?'요일 미확정':names[day],start,end,startText:item.start||'',endText:item.end||'',validTime,problems,conflicts:[],scheduled:false};
    });
    for(let i=0;i<basics.length;i++)for(let j=i+1;j<basics.length;j++){
      const a=basics[i],b=basics[j];
      if(a.day!==null&&a.day===b.day&&a.validTime&&b.validTime&&overlap([a.start,a.end],[b.start,b.end])){a.conflicts.push(b.label+' '+b.startText+'–'+b.endText);b.conflicts.push(a.label+' '+a.startText+'–'+a.endText);}
    }
    for(const basic of basics.filter(item=>item.day!==null&&item.validTime))for(const entry of rows[basic.day].entries){
      if(entry.kind==='basic'||(!['common','focus'].includes(entry.kind)&&!entry.scheduled))continue;
      if(overlap([basic.start,basic.end],[entry.a,entry.b])){
        basic.conflicts.push(entry.name+' '+entry.start+'–'+entry.end);
        entry.conflicts.push(basic.label+' '+basic.startText+'–'+basic.endText);
      }
    }
    for(const row of rows){
      const occupied=row.entries.filter(entry=>entry.scheduled||entry.kind==='common'&&entry.overlaps);
      for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++){
        const a=occupied[i],b=occupied[j];
        if(overlap([a.a,a.b],[b.a,b.b])){a.conflicts.push(b.name+' '+b.start+'–'+b.end);b.conflicts.push(a.name+' '+a.start+'–'+a.end);}
      }
      for(const entry of row.entries){
        if(entry.conflicts.length){entry.scheduled=false;entry.problems.push('시간 겹침: '+entry.conflicts.join(' · ')+' · 조정 전 미편성');}
      }
    }
    let disCount=0;
    for(const row of rows)for(const entry of row.entries){
      if(entry.kind==='dis'&&entry.scheduled&&++disCount>1){entry.scheduled=false;entry.problems.push('분해 프로젝트는 한 주 1회 선택합니다');}
      entry.status=entry.kind==='basic'?'개별 활동 입력':entry.scheduled?(entry.kind==='common'?'센터 공통시간':'시간 편성안'):entry.problems.length?entry.problems.join(' / '):'미선택';
      if(entry.problems.length)issues.push(row.dayName+' '+entry.start+'–'+entry.end+' '+entry.name+': '+entry.problems.join(' / '));
    }
    for(const basic of basics){
      if(basic.conflicts.length)basic.problems.push('시간 겹침: '+basic.conflicts.join(' · '));
      basic.scheduled=!basic.problems.length;
      basic.status=basic.scheduled?'시간 편성안':'미편성 · '+basic.problems.join(' / ');
      if(basic.problems.length)issues.push(basic.label+': '+basic.problems.join(' / '));
    }
    const entries=rows.flatMap(row=>row.entries),validSelections=entries.filter(entry=>entry.selected&&entry.scheduled),wishes=[...new Set([...(config.preferences||[]).map(name=>String(name).trim()).filter(Boolean),...Object.values(selections).map(item=>item.name).filter(Boolean)])];
    const scheduledActivities=wishes.filter(name=>validSelections.some(entry=>entry.name===name)||basics.some(basic=>basic.scheduled&&basic.name===name)),pendingActivities=wishes.filter(name=>!scheduledActivities.includes(name));
    for(const name of pendingActivities)issues.push(name+': 아직 주간표에 편성하지 않은 희망 활동입니다.');
    for(const id of Object.keys(selections))if(!entries.some(entry=>entry.id===id))issues.push((selections[id].name||'선택 활동')+': 센터 일정이 삭제되어 미편성입니다.');
    return {rows,basics,issues:[...new Set(issues)],scheduledActivities,pendingActivities,validSelections};
  }
  function choose(state,config,id,selected=true){
    const selections={...config.selections},block=state.blocks.find(item=>item.id===id);
    if(!selected){delete selections[id];return {selections,error:''};}
    if(!block)return {selections,error:'현재 시간표에 없는 일정입니다.'};
    if(kind(block)==='dis'){
      const valid=build(state,config).validSelections.filter(entry=>entry.kind==='dis');
      if(valid.some(entry=>entry.id!==id))return {selections,error:'분해 프로젝트는 한 주 1회입니다. 현재 편성한 시간을 해제한 뒤 선택해 주세요.'};
      for(const [key,value] of Object.entries(selections)){const old=state.blocks.find(item=>item.id===key)||value;if(key!==id&&old&&kind(old)==='dis'&&!valid.some(entry=>entry.id===key))delete selections[key];}
    }
    selections[id]=signature(block);return {selections,error:''};
  }
  globalThis.WinterPersonal={build,choose,kind};
  if(typeof module!=='undefined')module.exports=globalThis.WinterPersonal;
  if(typeof document==='undefined')return;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let mountNode,selectionSnapshots={},basicCounter=0;
  function mount(){
    mountNode=document.getElementById('personal-timetable');if(!mountNode||mountNode.dataset.mounted)return;mountNode.dataset.mounted='true';
    mountNode.innerHTML='<p class="caption">현재 센터 시간표에서 참여할 활동을 선택합니다. 아이 정보는 이 화면에서만 사용하며 새로고침하면 지워집니다.</p><form id="pt-form"><fieldset><legend>아이 기본정보</legend><div class="pt-fields"><label>아이 이름·별칭<input id="pt-name" maxlength="40" autocomplete="off"></label><label>학년<select id="pt-grade"><option value="">미입력</option>'+['유아',1,2,3,4,5,6].map(value=>'<option>'+ (value==='유아'?value:'초등 '+value+'학년')+'</option>').join('')+'</select></label></div></fieldset><fieldset><legend>요일별 참여·등하원</legend>'+names.map((name,day)=>'<div class="attendance-row"><label class="check-option"><input type="checkbox" data-pt-day="'+day+'">'+name+'</label><label>등원<input type="time" data-pt-start="'+day+'" aria-label="'+name+' 희망 등원"></label><label>하원<input type="time" data-pt-end="'+day+'" aria-label="'+name+' 희망 하원"></label></div>').join('')+'</fieldset><fieldset><legend>기존 베이직</legend><p class="caption">AI연구소 · SEL연구소 · 언어연구소의 베이직을 입력합니다. '+escape(T.basicNote)+' 모르는 활동명·요일·시간은 비워 두세요.</p><div id="pt-basics"></div><div id="pt-basic-warnings" class="student-messages" role="status" hidden></div><button type="button" class="secondary" id="pt-add-basic">베이직 활동 추가</button></fieldset><fieldset><legend>원하는 활동</legend><div id="pt-wishes" class="pt-wishes"></div><details><summary>추가 프로그램 예시에서 희망 활동 선택</summary><div id="pt-extra-wishes" class="pt-wishes"></div></details></fieldset><fieldset><legend>현재 시간표에서 참여 시간 선택</legend><p class="caption">센터에 편성된 실제 시간을 고릅니다. 분해 프로젝트는 한 주 1회 선택합니다. 선택하지 않은 활동은 자동 편성하지 않습니다.</p><div id="pt-slots" class="pt-slots"></div><p id="pt-select-status" class="plan-problem" role="status"></p></fieldset></form><div id="pt-result"><button type="button" class="secondary pt-print" id="pt-print">개인 주간표 인쇄</button><h2 id="pt-title">개인 주간 편성안</h2><p id="pt-profile" class="caption"></p><div id="pt-summary" class="pt-summary"></div><div id="pt-basic-summary"></div><div id="pt-issues" class="student-messages"></div><div id="pt-week" class="pt-week"></div></div>';
    mountNode.querySelector('#pt-form').addEventListener('submit',event=>event.preventDefault());
    mountNode.querySelector('#pt-form').addEventListener('input',event=>{if(event.target.type!=='checkbox'&&event.target.tagName!=='SELECT')refresh();});
    mountNode.querySelector('#pt-form').addEventListener('change',event=>{
      const id=event.target.dataset.ptBlock;
      if(id){const result=choose(currentState(),config(),id,event.target.checked);if(result.error){event.target.checked=false;mountNode.querySelector('#pt-select-status').textContent=result.error;return;}selectionSnapshots=result.selections;mountNode.querySelector('#pt-select-status').textContent='';}
      const wish=event.target.hasAttribute('data-pt-wish')?event.target.value:null;
      refresh();
      const target=id?[...mountNode.querySelectorAll('[data-pt-block]')].find(input=>input.dataset.ptBlock===id):wish!==null?[...mountNode.querySelectorAll('[data-pt-wish]')].find(input=>input.value===wish):null;
      target?.focus();
    });
    mountNode.querySelector('#pt-add-basic').addEventListener('click',()=>{
      const id=++basicCounter,row=document.createElement('div');row.className='pt-basic';row.dataset.ptBasic=String(id);
      row.innerHTML='<label>프로그램명<input data-pt-field="name" maxlength="80" aria-label="베이직 '+id+' 프로그램명"></label><label>요일<select data-pt-field="day" aria-label="베이직 '+id+' 요일"><option value="">미확정</option>'+names.map((name,day)=>'<option value="'+day+'">'+name+'</option>').join('')+'</select></label><label>시작<input type="time" data-pt-field="start" aria-label="베이직 '+id+' 시작"></label><label>종료<input type="time" data-pt-field="end" aria-label="베이직 '+id+' 종료"></label><button type="button" class="text-button" data-pt-remove="'+id+'">삭제</button>';
      mountNode.querySelector('#pt-basics').append(row);refresh();row.querySelector('input').focus();
    });
    mountNode.querySelector('#pt-basics').addEventListener('click',event=>{const button=event.target.closest('[data-pt-remove]');if(button){button.closest('.pt-basic').remove();refresh();}});
    mountNode.querySelector('#pt-print').addEventListener('click',()=>window.print());
    globalThis.WinterTimetableUI?.onChange(refresh);
    refresh();
  }
  const currentState=()=>globalThis.WinterTimetableUI?.getState()||T.createDefault();
  function config(){
    const q=selector=>mountNode.querySelector(selector);
    return {days:[...mountNode.querySelectorAll('[data-pt-day]:checked')].map(input=>Number(input.dataset.ptDay)),dayTimes:Object.fromEntries(names.map((_,day)=>[day,{start:q('[data-pt-start="'+day+'"]').value,end:q('[data-pt-end="'+day+'"]').value}])),basics:[...mountNode.querySelectorAll('.pt-basic')].map(row=>({name:row.querySelector('[data-pt-field="name"]').value,day:row.querySelector('[data-pt-field="day"]').value===''?null:Number(row.querySelector('[data-pt-field="day"]').value),start:row.querySelector('[data-pt-field="start"]').value,end:row.querySelector('[data-pt-field="end"]').value})),preferences:[...mountNode.querySelectorAll('[data-pt-wish]:checked')].map(input=>input.value),selections:selectionSnapshots};
  }
  function refresh(){
    if(!mountNode)return;
    const state=currentState(),c=config(),plan=build(state,c),q=selector=>mountNode.querySelector(selector);
    const actual=[...new Set(state.blocks.filter(block=>!['common','basic'].includes(kind(block))).map(block=>block.name))];
    const S=globalThis.WinterSchedule,examples=S?[...S.classes,...S.focus,...S.shared,...S.events,...S.future,...S.basics].map(item=>item.name):[];
    const wishes=values=>values.map(name=>'<label class="check-option"><input type="checkbox" data-pt-wish value="'+escape(name)+'" '+(c.preferences.includes(name)?'checked':'')+'>'+escape(name)+'</label>').join('');
    q('#pt-wishes').innerHTML=wishes(actual);
    q('#pt-extra-wishes').innerHTML=wishes([...new Set([...examples,...c.preferences])].filter(name=>!actual.includes(name)));
    q('#pt-slots').innerHTML=plan.rows.map(row=>'<div><strong>'+row.dayName+'</strong>'+row.entries.filter(entry=>!['common','basic'].includes(entry.kind)).map(entry=>'<label class="pt-slot"><input type="checkbox" data-pt-block="'+escape(entry.id)+'" '+(entry.requested?'checked':'')+'><span>'+escape(entry.start+'–'+entry.end+' '+entry.name)+'<small>'+escape(entry.status)+'</small></span></label>').join('')+'</div>').join('');
    const conflicts=plan.basics.filter(basic=>basic.conflicts.length);
    q('#pt-basic-warnings').hidden=!conflicts.length;q('#pt-basic-warnings').innerHTML=conflicts.length?'<strong>시간 겹침 · 조정 전 미편성</strong><ul>'+conflicts.map(basic=>'<li>'+escape(basic.label+' · '+basic.dayName+' '+basic.startText+'–'+basic.endText+': '+basic.conflicts.join(' · '))+'</li>').join('')+'</ul>':'';
    const child=q('#pt-name').value.trim();q('#pt-title').textContent=(child?child+' · ':'')+'개인 주간 편성안';q('#pt-profile').textContent=[q('#pt-grade').value||'학년 미입력',...plan.rows.filter(row=>row.active).map(row=>row.dayName+' '+(row.validTime?row.startText+'–'+row.endText:'등하원 미확정'))].join(' / ');
    const dis=plan.validSelections.filter(entry=>entry.kind==='dis'),focus=plan.validSelections.filter(entry=>entry.kind==='focus');
    q('#pt-summary').innerHTML='<div><h3>분해 프로젝트</h3><p>'+ (dis.map(entry=>escape(names[entry.day]+' '+entry.start+'–'+entry.end+' '+entry.name)).join('<br>')||'미편성 · 참여 시간 선택 필요')+'</p></div><div><h3>수학 몰입·영어 몰입</h3><p>'+(focus.map(entry=>escape(names[entry.day]+' '+entry.start+'–'+entry.end+' '+entry.name)).join('<br>')||'미편성 · 참여 시간 선택 필요')+'</p></div><div><h3>원하는 활동</h3><p><strong>편성된 활동</strong><br>'+escape(plan.scheduledActivities.join(' · ')||'없음')+'</p><p><strong>아직 미편성인 희망 활동</strong><br>'+escape(plan.pendingActivities.join(' · ')||'없음')+'</p></div>';
    q('#pt-basic-summary').innerHTML=plan.basics.length?'<h3>기존 베이직 편성</h3>'+plan.basics.map(basic=>'<p class="caption"><strong>'+escape(basic.name||'프로그램명 미입력')+'</strong> · '+escape(basic.dayName+' '+(basic.startText||'시작 미확정')+'–'+(basic.endText||'종료 미확정'))+'<br><span class="'+(!basic.scheduled?'plan-problem':'')+'">'+escape(basic.status)+'</span></p>').join(''):'';
    q('#pt-issues').innerHTML=plan.issues.length?'<strong>편성 전 확인할 사항</strong><ul>'+plan.issues.map(issue=>'<li>'+escape(issue)+'</li>').join('')+'</ul>':'<p>입력 조건의 시간 편성안입니다. 실제 참여 확정은 별도로 확인합니다.</p>';
    const entryCard=entry=>'<div class="pt-entry '+(!entry.scheduled?'pt-open':'')+'"><small>'+escape(entry.start+'–'+entry.end)+'</small><strong>'+escape(entry.name)+'</strong>'+(T.description(entry)?'<p>'+escape(T.description(entry))+'</p>':'')+'<p class="'+(entry.problems.length?'plan-problem':'')+'">'+escape(entry.status)+'</p>'+(!entry.fits&&entry.overlaps?'<small>희망 구간 '+escape(entry.requestedStart+'–'+entry.requestedEnd)+'</small>':'')+'</div>';
    q('#pt-week').innerHTML=plan.rows.map(row=>'<article class="pt-day"><h3>'+row.dayName+'</h3><small>'+escape(!row.active?'참여요일 미선택':row.validTime?row.startText+'–'+row.endText:'등하원 시간 미확정')+'</small>'+ (row.active?row.entries.filter(entry=>entry.overlaps||entry.requested).map(entryCard).join(''):'')+plan.basics.filter(basic=>basic.day===row.day).map(basic=>'<div class="pt-entry"><small>'+escape((basic.startText||'시작 미확정')+'–'+(basic.endText||'종료 미확정'))+'</small><strong>'+escape(basic.name||'프로그램명 미입력')+'</strong><p class="'+(!basic.scheduled?'plan-problem':'')+'">'+escape(basic.status)+'</p></div>').join('')+'</article>').join('');
  }
  globalThis.WinterPersonalUI={mount,refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
