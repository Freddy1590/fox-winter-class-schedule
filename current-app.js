'use strict';
{
  const T=WinterTimetable,U=WinterTimetableUI,S=WinterSchedule;
  const $=id=>document.getElementById(id),e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  function show(id,focus=false){
    if(!$(id+'-tab'))id='week';
    tabs.forEach(tab=>{const active=tab.id===id+'-tab';tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    document.querySelectorAll('[role="tabpanel"]').forEach(panel=>panel.hidden=panel.id!==id);
    $('timetable-savebar').hidden=!['week','day','operations','calendar'].includes(id);
    if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);
    if(focus)$(id+'-tab').focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>show(tab.getAttribute('aria-controls')));
    tab.addEventListener('keydown',event=>{
      const n={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
      if(n===undefined)return;event.preventDefault();show(tabs[n].getAttribute('aria-controls'),true);
    });
  });
  document.addEventListener('click',event=>{const button=event.target.closest('[data-tab-target]');if(button)show(button.dataset.tabTarget.replace(/-tab$/,''),true);});
  window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
  const groups=[['클래스',S.classes],['집중 활동',S.focus],['함께하는 활동',S.shared],['특별 프로그램',S.events],['추가 예시',S.future],['베이직 · 연구소별 활동',S.basics]];
  const examples=groups.flatMap(([group,items])=>items.map(item=>({...item,group})));
  function renderExamples(){
    const query=$('program-search').value.trim().toLocaleLowerCase();
    const filtered=examples.map((item,index)=>({...item,index})).filter(item=>item.name.toLocaleLowerCase().includes(query));
    $('current-program-examples').innerHTML=filtered.length?'<p class="caption">'+filtered.length+'개 프로그램 예시</p>'+groups.map(([group])=>{
      const items=filtered.filter(item=>item.group===group);return items.length?'<h2>'+e(group)+'</h2><div class="current-example-list">'+items.map(item=>'<article><div><h3>'+e(item.name)+'</h3><p>'+e(item.detail)+'</p><small>프로그램 예시 · 시간 미입력</small></div><button type="button" class="secondary" data-current-example="'+item.index+'">일정에 가져오기</button></article>').join('')+'</div>':'';
    }).join(''):'<p>해당 프로그램 예시가 없습니다. 하루 일정에서 직접 입력할 수 있습니다.</p>';
  }
  $('program-search').addEventListener('input',renderExamples);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-current-example]');if(button){const item=examples[Number(button.dataset.currentExample)];if(item)U.useExample(item.name,item.detail);}});
  function renderPrograms(){
    const state=U.getState(),groups=new Map(),conflicts=new Set(T.conflicts(state).flatMap(c=>[c.a,c.b]));
    for(const block of [...state.blocks].sort((a,b)=>a.day-b.day||T.minutes(a.start)-T.minutes(b.start))){
      if(!groups.has(block.name))groups.set(block.name,[]);groups.get(block.name).push(block);
    }
    $('current-program-rows').innerHTML=[...groups].map(([name,blocks])=>'<tr><th scope="row">'+e(name)+'</th><td data-label="요일·시간">'+T.sessionLabels(blocks).map(label=>'<span class="roster-session">'+e(label)+'</span>').join('')+'</td><td data-label="내용">'+e([...new Set(blocks.map(b=>T.description(b)).filter(Boolean))].join(' / ')||'내용 미입력')+'</td><td data-label="편성 상태">'+ (blocks.some(b=>conflicts.has(b.id))?'시간 겹침 · 조정 필요':'시간표 입력됨')+'</td></tr>').join('')||'<tr><td colspan="4">입력된 일정이 없습니다.</td></tr>';
  }
  let selectedDate='2027-01-04';
  function renderCalendarDetail(){
    const date=new Date(selectedDate+'T12:00:00'),day=date.getDay()-1,holiday=S.holidays[selectedDate];
    const active=selectedDate>='2027-01-04'&&day>=0&&day<5&&!holiday;
    const blocks=active?T.dayBlocks(U.getState(),day):[];
    $('current-calendar-detail').innerHTML='<h2>'+e(selectedDate+' · '+['일','월','화','수','목','금','토'][date.getDay()]+'요일')+'</h2>'+(holiday?'<p>'+e(holiday)+' · 센터 운영 별도 확인</p>':blocks.length?'<table class="current-day-table"><thead><tr><th scope="col">시간</th><th scope="col">프로그램</th><th scope="col">내용</th></tr></thead><tbody>'+blocks.map(b=>'<tr><th scope="row">'+e(b.start+'–'+b.end)+'</th><td>'+e(b.name)+'</td><td>'+e(T.description(b))+'</td></tr>').join('')+'</tbody></table><button class="secondary" type="button" data-current-day="'+day+'">'+T.weekdays[day]+' 시간표 수정</button>':'<p>정규 시간표 적용일을 별도로 확인해 주세요.</p>');
  }
  function renderCalendar(){
    const month=$('current-calendar-month').value,[year,m]=month.split('-').map(Number),length=new Date(year,m,0).getDate(),offset=new Date(year,m-1,1).getDay(),state=U.getState();
    if(!selectedDate.startsWith(month))selectedDate=month+(month==='2027-01'?'-04':'-01');
    let rows='';
    for(let cell=0;cell<Math.ceil((length+offset)/7)*7;cell++){
      if(cell%7===0)rows+='<tr>';
      const n=cell-offset+1;
      if(n<1||n>length)rows+='<td></td>';
      else{
        const date=month+'-'+String(n).padStart(2,'0'),weekday=cell%7,holiday=S.holidays[date],blocks=date>='2027-01-04'&&weekday>0&&weekday<6&&!holiday?T.dayBlocks(state,weekday-1):[];
        const special=blocks.filter(b=>!T.createDefault().blocks.some(seed=>seed.id===b.id&&['아침 간식·플래너 작성','자율학습','수학 몰입','베이직 활동','점심시간','튼튼 부스터','영어 몰입','간식'].includes(seed.name)&&seed.name===b.name));
        const summary=[...new Set(special.map(b=>b.name))].join(' · ')||(blocks.length?blocks.length+'개 일정':'');
        rows+='<td><button type="button" class="'+(holiday?'is-holiday':'')+'" data-current-date="'+date+'" aria-pressed="'+(date===selectedDate)+'" aria-label="'+e(date+(holiday?' '+holiday:summary?' '+summary:''))+'"><strong>'+n+'</strong><span class="current-calendar-summary">'+e(holiday||summary)+'</span>'+(!holiday&&blocks.length?'<span class="current-calendar-mobile-count" aria-hidden="true">'+blocks.length+'개</span>':'')+'</button></td>';
      }
      if(cell%7===6)rows+='</tr>';
    }
    $('current-calendar').innerHTML='<table class="current-calendar-table"><caption>'+year+'년 '+m+'월</caption><thead><tr>'+['일','월','화','수','목','금','토'].map(d=>'<th scope="col">'+d+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>';
    renderCalendarDetail();
  }
  $('current-calendar-month').addEventListener('change',renderCalendar);
  document.addEventListener('click',event=>{
    const date=event.target.closest('[data-current-date]');if(date){selectedDate=date.dataset.currentDate;renderCalendar();}
    const day=event.target.closest('[data-current-day]');if(day)U.selectDay(Number(day.dataset.currentDay));
  });
  function currentChanged(){renderPrograms();renderCalendar();}
  U.onChange(currentChanged);
  document.addEventListener('winter-timetable-loaded',currentChanged);
  function init(){
    U.mount();renderExamples();currentChanged();
    $('current-project-steps').innerHTML=S.projectSteps.map(([week,name,detail])=>'<div><small>'+e(week)+'</small><h3>'+e(name)+'</h3><p>'+e(detail)+'</p></div>').join('');
    $('current-special-programs').innerHTML=S.events.map(item=>'<article><div><h3>'+e(item.name)+'</h3><p>'+e(item.detail)+'</p></div><span class="event-date">날짜 미정</span></article>').join('');
    $('current-calendar-pending').innerHTML=S.events.map(item=>'<div class="program-item"><h3>'+e(item.name)+'</h3><p>날짜 미정</p></div>').join('');
    show(location.hash.slice(1)||document.body.dataset.defaultTab||'week');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  globalThis.WinterCurrentApp={refresh:currentChanged,show};
}
