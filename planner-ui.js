'use strict';
{
  const S=WinterSchedule,P=WinterPlanner;
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  const form=$('student-form'),selections={};
  let started=false,basicCounter=0;
  $('student-days').innerHTML=S.weekdays.map((name,day)=>'<div class="attendance-row"><label class="check-option"><input type="checkbox" name="student-day" value="'+day+'">'+name+'</label><label>등원<input id="student-start-'+day+'" type="time" aria-label="'+name+' 희망 등원" aria-describedby="time-guide" disabled></label><label>하원<input id="student-end-'+day+'" type="time" aria-label="'+name+' 희망 하원" aria-describedby="time-guide" disabled></label></div>').join('');
  $('student-preferences').innerHTML=S.classes.filter(c=>c.id!=='dis').map(c=>'<label class="check-option"><input type="checkbox" name="student-preference" value="'+c.id+'">'+e(c.name)+'</label>').join('');
  $('student-focus').insertAdjacentHTML('beforeend',S.focus.map(f=>'<option value="'+f.id+'">'+e(f.name)+'</option>').join(''));
  $('basic-program-names').innerHTML=[...S.basics.map(b=>b.name),'Reading Gate','Spectrum Writing'].map(name=>'<option value="'+e(name)+'"></option>').join('');
  $('basic-owner-names').innerHTML=S.teams.flatMap(team=>team.names).map(name=>'<option value="'+e(name)+'"></option>').join('');
  function config(){
    return {days:[...form.querySelectorAll('[name="student-day"]:checked')].map(i=>Number(i.value)),dayTimes:Object.fromEntries(S.weekdays.map((_,day)=>[day,{start:$('student-start-'+day).value,end:$('student-end-'+day).value}])),basics:[...form.querySelectorAll('.basic-entry')].map(row=>({name:row.querySelector('[data-basic="name"]').value,day:row.querySelector('[data-basic="day"]').value===''?null:Number(row.querySelector('[data-basic="day"]').value),start:row.querySelector('[data-basic="start"]').value,end:row.querySelector('[data-basic="end"]').value,owner:row.querySelector('[data-basic="owner"]').value})),preferences:[...form.querySelectorAll('[name="student-preference"]:checked')].map(i=>i.value),focus:$('student-focus').value,includeDis:$('student-dis').checked,selections};
  }
  function addBasic(){
    const n=++basicCounter;
    $('student-basics').insertAdjacentHTML('beforeend','<div class="basic-entry" data-basic-entry="'+n+'"><div class="basic-entry-heading"><strong>베이직 '+n+'</strong><button type="button" class="text-button" data-remove-basic="'+n+'" aria-label="베이직 '+n+' 삭제">삭제</button></div><div class="basic-fields"><label>프로그램명<input data-basic="name" list="basic-program-names" maxlength="80" aria-label="베이직 '+n+' 프로그램명" placeholder="기존 활동 이름"></label><label>요일<select data-basic="day" aria-label="베이직 '+n+' 요일"><option value="">미확정</option>'+S.weekdays.map((day,i)=>'<option value="'+i+'">'+day+'</option>').join('')+'</select></label><label>시작<input data-basic="start" type="time" aria-label="베이직 '+n+' 시작"></label><label>종료<input data-basic="end" type="time" aria-label="베이직 '+n+' 종료"></label><label>담당<input data-basic="owner" list="basic-owner-names" maxlength="40" aria-label="베이직 '+n+' 담당" placeholder="미확정"></label></div></div>');
    refresh();$('student-basics').lastElementChild.querySelector('input').focus();
  }
  function choiceCell(day,block){
    const id=day.day+':'+block.key,label=day.dayName+' '+(block.key==='am'?'오전':'오후')+' 클래스';
    let options='<option value="">참여 활동 미선택</option>';
    if(block.requested&&!block.candidates.includes(block.requested))options+='<option value="'+e(block.requested)+'" selected>'+e(S.program(block.requested)?.name||'이전 선택')+' · 재선택 필요</option>';
    options+=block.candidates.map(candidate=>'<option value="'+candidate+'" '+(block.requested===candidate?'selected ':'')+(!block.fits?'disabled':'')+'>'+e(S.program(candidate).name)+(!block.fits?' · 희망시간과 맞지 않음':'')+'</option>').join('');
    const assigned=block.ids[0];
    return '<span class="cell-time">'+e(block.time)+'안</span><select data-student-slot="'+id+'" aria-label="'+label+'">'+options+'</select><span class="print-slot">'+e(assigned?S.program(assigned).name:block.requested?(S.program(block.requested)?.name||'이전 선택')+' · 미편성':'미선택')+'</span>'+(assigned?'<small>'+e(S.ownerText(assigned))+'</small>':block.problem?'':'<small>'+(!block.fits?(block.overlaps?'부분 시간 겹침 · 협의 필요':'희망시간 밖 · 미편성'):!block.candidates.length?'희망 활동의 해당 시간 편성안 없음':'가능한 활동에서 직접 선택')+'</small>')+(block.problem?'<p class="plan-problem">'+e(block.problem)+'</p>':'');
  }
  const basicLabel=b=>e(b.name||'프로그램명 미입력')+' · '+e(b.dayName)+' '+e(b.time);
  function basicCard(b){return '<div class="student-basic-item"><strong>'+e(b.name||'프로그램명 미입력')+'</strong><span class="cell-time">'+e(b.time)+'</span><small>담당 '+e(b.owner?b.owner+' · 입력안':'미확정')+'</small><small class="'+(b.scheduled?'plan-state':'plan-problem')+'">'+e(b.status)+'</small></div>';}
  function renderBasicOverview(plan){
    const conflicts=plan.basics.filter(b=>b.conflicts.length);
    $('student-basic-warnings').hidden=!conflicts.length;
    $('student-basic-warnings').innerHTML=conflicts.length?'<p><strong>시간 겹침 · 조정 전 미편성</strong></p><ul>'+conflicts.map(b=>'<li>'+e(b.label+' · '+b.dayName+' '+b.time)+': '+e(b.conflicts.join(' · '))+'</li>').join('')+'</ul>':'';
    const name=$('student-name').value.trim();
    $('student-basic-roster-profile').textContent=(name?name+' · ':'')+'이 아이의 베이직 입력안입니다. 센터 전체의 개설·근무 확정은 별도로 확인합니다.';
    $('student-basic-roster').innerHTML=plan.basics.length?plan.basics.map(b=>'<tr><th scope="row">'+e(b.name||'프로그램명 미입력')+'</th><td data-label="요일·시간">'+e(b.dayName)+'<br>'+e(b.time)+'</td><td data-label="담당">'+e(b.owner?b.owner+' · 입력안':'미확정')+'</td><td data-label="편성 상태" class="'+(b.scheduled?'plan-state':'plan-problem')+'">'+e(b.status)+'</td></tr>').join(''):'<tr><td colspan="4">입력된 베이직 없음</td></tr>';
  }
  function focusCell(block,focus){
    let content='<span>'+(!focus?'집중 방식 미선택':'희망시간 밖 · 미편성')+'</span>';
    if(block.selectedId){
      const name=e(S.program(block.selectedId).name),owner=e(S.ownerText(block.selectedId));
      content=block.ids.length?'<strong>'+name+'</strong><small>'+owner+'</small>':'<strong class="plan-problem">미편성</strong><span> · 선택한 활동: '+name+'</span><small>메인 역할: '+owner+'</small>';
    }
    return '<div class="student-focus-block"><span class="cell-time">'+e(block.time)+'안</span>'+content+(block.problem?'<p class="plan-problem">'+e(block.problem)+'</p>':'')+'</div>';
  }
  function render(){
    const c=config(),plan=P.build(c),name=$('student-name').value.trim();
    $('student-result').hidden=false;
    $('student-plan-title').textContent=(name?name+' · ':'')+'개인 주간 편성안';
    $('student-profile').textContent=[name||'아이 이름·별칭 미입력',$('student-grade').value||'학년 미입력',$('student-period').value||'참여 기간 협의 중',...plan.rows.filter(r=>r.active).map(r=>r.dayName+' '+(r.validTime?r.startText+'–'+r.endText:'등하원 시간 미확정'))].join(' / ');
    $('student-big3').innerHTML=plan.big3.map(item=>{
      const preferred=item.scheduledActivities;
      const groups=preferred&&item.selected?'<dl class="preference-summary"><div><dt>편성된 활동</dt><dd>'+e(preferred.map(activity=>activity.name).join(' · ')||'없음')+'</dd></div><div><dt>아직 미편성인 희망 활동</dt><dd>'+e(item.pendingActivities.map(activity=>activity.name).join(' · ')||'없음')+'</dd></div></dl>':'';
      return '<div><h3>'+e(item.title)+'</h3>'+(groups||'<p>'+e(item.name)+'</p>')+'<strong class="plan-state">'+e(item.status)+'</strong>'+(item.title==='분해클래스'&&item.placements.length?'<small>금요일 '+e(item.placements[0].time)+'</small>':'')+'</div>';
    }).join('');
    $('student-basic-summary').innerHTML='<h3>기존 베이직 편성</h3>'+(plan.basics.length?'<dl class="preference-summary"><div><dt>시간 편성안</dt><dd>'+ (plan.scheduledBasics.map(b=>basicLabel(b)+' · 담당 '+e(b.owner?b.owner+' 입력안':'미확정')).join('<br>')||'없음')+'</dd></div><div><dt>미편성·조정 필요</dt><dd>'+(plan.pendingBasics.map(b=>basicLabel(b)+'<small class="plan-problem">'+e(b.problems.join(' / '))+'</small>').join('<br>')||'없음')+'</dd></div></dl>':'<p class="caption">입력된 베이직 없음</p>');
    const first=plan.issues.slice(0,4),rest=plan.issues.slice(4);
    const restItems=rest.map(t=>'<li>'+e(t)+'</li>').join('');
    $('student-messages').innerHTML=plan.issues.length?'<p><strong>편성 전 확인할 사항</strong></p><ul>'+first.map(t=>'<li>'+e(t)+'</li>').join('')+'</ul>'+(rest.length?'<details><summary>추가 확인 '+rest.length+'건</summary><ul>'+restItems+'</ul></details><ul class="print-issues">'+restItems+'</ul>':''):'<p>선택한 조건으로 가능한 시간입니다. 베이직·Big 3와 협의 사항을 확인해 주세요.</p>';
    $('student-week-rows').innerHTML=plan.rows.map(day=>{
      const basics=plan.basics.filter(b=>b.day===day.day).map(basicCard).join('')||'<span class="caption">입력된 베이직 없음</span>';
      if(!day.active)return '<tr role="row" class="non-participation"><th scope="row" role="rowheader">'+day.dayName+'</th><td role="cell" data-label="기존 베이직" class="open-time">'+basics+'</td><td role="cell" colspan="4">참여요일 미선택</td></tr>';
      const focus=day.blocks.filter(b=>b.key.startsWith('focus')).map(b=>focusCell(b,c.focus)).join('');
      const shared=day.blocks.filter(b=>['lunch','stretch','break'].includes(b.key)&&(b.overlaps||b.conflicts.length)).map(b=>{
        const [start,end]=b.time.match(/\d{2}:\d{2}/g);
        const partial=b.fits?'':'<small class="plan-problem">희망 구간 '+e(day.start>P.minutes(start)?day.startText:start)+'–'+e(day.end<P.minutes(end)?day.endText:end)+' · 부분 참여 협의 필요</small>';
        return '<span>'+e(b.time)+' '+e(b.label)+partial+(b.problem?'<small class="plan-problem">'+e(b.problem)+'</small>':'')+'</span>';
      }).join('');
      const needs=[day.start!==null&&day.start<600?'오전 생활지원·운영시간 협의':'',day.end!==null&&day.end>1050?'오후 생활지원·운영시간 협의':''].filter(Boolean).map(e).join('<br>');
      return '<tr role="row"><th scope="row" role="rowheader">'+day.dayName+'<small>'+e(day.validTime?day.startText+'–'+day.endText:'등하원 시간 미확정')+'</small></th><td role="cell" data-label="기존 베이직" class="open-time">'+basics+'</td><td role="cell" data-label="오전 클래스" class="class-time">'+choiceCell(day,day.blocks.find(b=>b.key==='am'))+'</td><td role="cell" data-label="매일 집중타임" class="fixed-time">'+focus+'</td><td role="cell" data-label="오후 클래스" class="class-time">'+choiceCell(day,day.blocks.find(b=>b.key==='pm'))+'</td><td role="cell" data-label="공동시간·확인 사항">'+(shared||(day.validTime?'희망시간에 포함되는 공동시간 없음':'등하원 시간 확인 필요'))+(needs?'<small class="plan-problem">'+needs+'</small>':'')+'</td></tr>';
    }).join('');
    $('student-member-note').hidden=!$('student-member').checked;
    $('student-live-status').textContent='개인 주간 편성안 갱신. 확인 사항 '+plan.issues.length+'건. 모든 일정은 편성안입니다.';
    renderBasicOverview(plan);
  }
  function refresh(){if(started)render();else renderBasicOverview(P.build(config()));}
  form.addEventListener('submit',event=>{event.preventDefault();started=true;render();$('student-plan-title').focus();$('student-result').scrollIntoView({block:'start'});});
  form.addEventListener('input',refresh);
  form.addEventListener('change',event=>{
    if(event.target.name==='student-day')for(const kind of ['start','end'])$('student-'+kind+'-'+event.target.value).disabled=!event.target.checked;
    refresh();
  });
  $('add-basic').addEventListener('click',addBasic);
  $('student-basics').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-basic]');if(!button)return;
    button.closest('.basic-entry').remove();refresh();$('add-basic').focus();
  });
  $('student-week-rows').addEventListener('change',event=>{
    const key=event.target.dataset.studentSlot;if(!key)return;
    const change=P.chooseSlot(config(),key,event.target.value);
    if(change.error){event.target.value=selections[key]||'';$('student-live-status').textContent=change.error;$('student-messages').innerHTML='<p class="plan-problem">'+e(change.error)+'</p>';return;}
    Object.keys(selections).forEach(oldKey=>delete selections[oldKey]);Object.assign(selections,change.selections);render();
    $('student-week-rows').querySelector('[data-student-slot="'+key+'"]').focus();
  });
  $('print-student').addEventListener('click',()=>window.print());
}
