'use strict';
{
  const T=WinterTimetable,e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=T.createDefault(),selectedDay=0,selectedId='',mounted=false;
  const subscribers=new Set(),$=id=>document.getElementById(id);
  function examples(){
    const S=globalThis.WinterSchedule;
    const old=S?[...S.classes,...S.focus,...S.shared,...S.events,...S.future,...S.basics]:[];
    const all=[...old,...T.createDefault().blocks];
    return [...new Map(all.map(item=>[item.name,{name:item.name,detail:item.detail||''}])).values()];
  }
  function color(block){return block.name==='베이직 활동'?'basic':block.name.startsWith('분해 프로젝트')||block.name==='합창'?'project':'fixed';}
  function message(list){return list.length?'<div class="tt-warnings" role="status"><strong>시간 겹침 · 조정 필요</strong><ul>'+list.map(c=>'<li>'+e(T.weekdays[c.day]+' '+c.start+'–'+c.end)+' · '+c.names.map((name,index)=>'<button type="button" class="tt-conflict-link" data-tt-edit="'+e([c.a,c.b][index])+'">'+e(name)+'</button>').join(' / ')+'</li>').join('')+'</ul></div>':'';}
  function grid(blocks,days,range){
    const height=range.end-range.start;
    const boundaries=[...new Set([range.start,range.end,...blocks.flatMap(b=>[T.minutes(b.start),T.minutes(b.end)])])].sort((a,b)=>a-b);
    const headers='<div class="tt-grid-heading tt-axis-heading" style="grid-column:1">시간</div>'+days.map((day,index)=>'<div class="tt-grid-heading" style="grid-column:'+(index+2)+'">'+e(T.weekdays[day])+'</div>').join('');
    const backgrounds=days.map((_,index)=>'<div class="tt-grid-column" style="grid-column:'+(index+2)+';grid-row:2 / span '+height+'"></div>').join('');
    const ticks=boundaries.slice(0,-1).map((start,index)=>'<div class="tt-time-label" title="'+e(T.formatTime(start)+'–'+T.formatTime(boundaries[index+1]))+'" style="grid-column:1;grid-row:'+(start-range.start+2)+' / span '+(boundaries[index+1]-start)+'">'+e(T.formatTime(start))+'<span>–'+e(T.formatTime(boundaries[index+1]))+'</span></div>').join('');
    const overlapIds=new Set(T.conflicts(state).flatMap(c=>[c.a,c.b]));
    const items=blocks.map(block=>{
      const duration=T.minutes(block.end)-T.minutes(block.start),column=days.indexOf(block.day)+2;
      return '<button type="button" class="tt-block tt-'+color(block)+(overlapIds.has(block.id)?' tt-overlap':'')+'" data-tt-edit="'+e(block.id)+'" style="grid-column:'+column+';grid-row:'+(T.minutes(block.start)-range.start+2)+' / span '+duration+'" aria-label="'+e(T.weekdays[block.day]+' '+block.start+'–'+block.end+' '+block.name+' · '+duration+'분 · 수정')+'" title="'+e(block.name+'\n'+block.start+'–'+block.end+' · '+duration+'분'+(block.detail?'\n'+block.detail:''))+'"><strong>'+e(block.name)+'</strong>'+(days.length===1?'<span class="tt-block-time">'+e(block.start+'–'+block.end+' · '+duration+'분')+'</span>':'')+(block.detail?'<span class="tt-block-detail">'+e(block.detail)+'</span>':'')+'</button>';
    }).join('');
    return '<div class="tt-grid '+(days.length===1?'tt-single-grid':'tt-week-grid')+'" style="--tt-days:'+days.length+';grid-template-rows:42px repeat('+height+',2px)" aria-label="'+(days.length===1?'하루':'주간')+' 시간표">'+headers+backgrounds+ticks+items+'</div>';
  }
  function exactTable(){
    const rows=T.rows(state),skip=new Set();
    return '<table class="tt-exact-table"><caption>2027년 겨울 방클 고정 블록 시간표</caption><thead><tr><th scope="col">시간</th>'+T.weekdays.map(day=>'<th scope="col">'+day.slice(0,1)+'</th>').join('')+'</tr></thead><tbody>'+rows.map((row,index)=>'<tr><th scope="row">'+e(row.start+'–'+row.end)+'</th>'+row.cells.map((blocks,day)=>{
      const key=index+':'+day;if(skip.has(key))return '';
      const signature=blocks.map(b=>b.id).join('|');let span=1;
      while(index+span<rows.length&&rows[index+span].cells[day].map(b=>b.id).join('|')===signature){skip.add((index+span)+':'+day);span++;}
      return '<td rowspan="'+span+'">'+blocks.map(block=>'<button type="button" data-tt-edit="'+e(block.id)+'"><strong>'+e(block.name)+'</strong>'+(block.detail?'<small>'+e(block.detail)+'</small>':'')+'</button>').join('')+'</td>';
    }).join('')+'</tr>').join('')+'</tbody></table>';
  }
  function renderWeek(){
    if(!$('timetable-week'))return;
    const table=exactTable();
    $('timetable-week').innerHTML='<p class="tt-guide">프로그램을 누르면 시간과 내용을 고칠 수 있습니다.</p>'+message(T.conflicts(state))+'<div class="tt-week-scroll">'+grid(state.blocks,[0,1,2,3,4],T.bounds(state))+'</div><details class="tt-table-details"><summary>주간표를 표로 보기</summary><div class="tt-week-scroll">'+table+'</div></details><div class="tt-print-table">'+table+'</div>';
  }
  function editor(block){
    const current=block||{day:selectedDay,start:'',end:'',name:'',detail:''};
    return '<form id="tt-editor" class="tt-editor" novalidate><h3>'+(block?'일정 수정':'일정 추가')+'</h3><label>요일<select id="tt-edit-day">'+T.weekdays.map((day,index)=>'<option value="'+index+'" '+(current.day===index?'selected':'')+'>'+day+'</option>').join('')+'</select></label><div class="tt-time-fields"><label>시작시간<input type="time" id="tt-edit-start" required value="'+e(current.start)+'"></label><label>종료시간<input type="time" id="tt-edit-end" required value="'+e(current.end)+'"></label></div><label>프로그램 예시<select id="tt-example"><option value="">선택하여 제목·내용 가져오기</option>'+examples().map((item,index)=>'<option value="'+index+'">'+e(item.name)+'</option>').join('')+'</select></label><label>프로그램명<input id="tt-edit-name" type="text" required maxlength="200" value="'+e(current.name)+'"></label><label>내용<textarea id="tt-edit-detail" rows="5" maxlength="4000">'+e(current.detail)+'</textarea></label><p id="tt-edit-duration" class="tt-duration" role="status"></p><p id="tt-form-error" class="tt-form-error" role="alert"></p><div class="tt-editor-actions"><button class="primary" type="submit">일정에 적용</button><button class="secondary" type="button" id="tt-new">새 일정</button>'+(block?'<button type="button" id="tt-delete" class="tt-delete">이 일정 삭제</button>':'')+'</div><p class="tt-guide">적용한 뒤 공유 저장 버튼으로 저장합니다.</p></form>';
  }
  function renderDay(){
    if(!$('timetable-day'))return;
    const blocks=T.dayBlocks(state,selectedDay),block=state.blocks.find(b=>b.id===selectedId);
    $('timetable-day').innerHTML='<div class="tt-day-toolbar"><label>요일<select id="tt-day-choice">'+T.weekdays.map((day,index)=>'<option value="'+index+'" '+(selectedDay===index?'selected':'')+'>'+day+'</option>').join('')+'</select></label><span>'+blocks.length+'개 일정 · '+blocks.reduce((sum,b)=>sum+T.minutes(b.end)-T.minutes(b.start),0)+'분</span></div>'+message(T.conflicts(state).filter(c=>c.day===selectedDay))+'<div class="tt-day-layout"><div class="tt-day-scroll">'+grid(blocks,[selectedDay],T.bounds(state,selectedDay))+'</div>'+editor(block)+'</div>';
    updateDuration();
  }
  function updateDuration(){
    if(!$('tt-edit-duration'))return;
    const start=T.minutes($('tt-edit-start').value),end=T.minutes($('tt-edit-end').value);
    $('tt-edit-duration').textContent=start!==null&&end!==null&&end>start?'소요시간 '+(end-start)+'분':'';
  }
  function render(){renderWeek();renderDay();}
  function changed(next){
    state=T.checked(next);render();
    const data=JSON.parse(JSON.stringify(state));
    subscribers.forEach(fn=>fn(data));
    document.dispatchEvent(new CustomEvent('winter-timetable-change',{detail:{state:data}}));
  }
  function open(id){
    const block=state.blocks.find(b=>b.id===id);if(!block)return;
    selectedDay=block.day;selectedId=id;renderDay();
    $('day-tab')?.click();$('tt-edit-name')?.focus();
  }
  function mount(){
    if(mounted||!$('timetable-week')&&!$('timetable-day'))return;
    mounted=true;render();
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-tt-edit]');if(button){open(button.dataset.ttEdit);return;}
      if(event.target.id==='tt-new'){selectedId='';renderDay();$('tt-edit-name')?.focus();}
      if(event.target.id==='tt-delete'&&selectedId){const id=selectedId;selectedId='';changed(T.remove(state,id));}
    });
    document.addEventListener('change',event=>{
      if(event.target.id==='tt-day-choice'){selectedDay=Number(event.target.value);selectedId='';renderDay();}
      if(event.target.id==='tt-example'&&event.target.value!==''){
        const item=examples()[Number(event.target.value)];if(item){$('tt-edit-name').value=item.name;$('tt-edit-detail').value=item.detail;}
      }
    });
    document.addEventListener('input',event=>{if(['tt-edit-start','tt-edit-end'].includes(event.target.id))updateDuration();});
    document.addEventListener('submit',event=>{
      if(event.target.id!=='tt-editor')return;event.preventDefault();
      const block={id:selectedId||'block-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),day:Number($('tt-edit-day').value),start:$('tt-edit-start').value,end:$('tt-edit-end').value,name:$('tt-edit-name').value,detail:$('tt-edit-detail').value};
      try{const next=T.upsert(state,block);selectedDay=block.day;selectedId=block.id;changed(next);$('tt-form-error').textContent='일정에 적용했습니다.';}
      catch(error){$('tt-form-error').textContent=error.message;}
    });
  }
  const api={mount,getState:()=>JSON.parse(JSON.stringify(state)),setState(next){state=T.checked(next);const selected=state.blocks.find(b=>b.id===selectedId);if(selected)selectedDay=selected.day;else selectedId='';if(mounted)render();},serialize:()=>JSON.stringify(state),onChange(fn){subscribers.add(fn);return ()=>subscribers.delete(fn);},examples,open,useExample(name,detail=''){selectedId='';renderDay();$('day-tab')?.click();if($('tt-edit-name')){$('tt-edit-name').value=String(name);$('tt-edit-detail').value=String(detail);$('tt-edit-start').focus();}},selectDay(day){if(!Number.isInteger(day)||day<0||day>4)return;selectedDay=day;selectedId='';renderDay();$('day-tab')?.click();}};
  globalThis.WinterTimetableUI=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
}
