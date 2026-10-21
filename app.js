'use strict';
{
  const S = WinterSchedule;
  const e = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const name = id => S.program(id).name;
  const owner = id => '<span class="assignment">'+e(S.ownerText(id))+'</span>';
  const names = ids => ids.map(name).join(' / ');
  function activity(block,staff=false) {
    if(block.special) return block.special.map(item=>'<div class="activity special-time">'+e(item.name)+(staff?'<small>담당 · 미배정</small>':'')+'</div>').join('')+'<small>'+e(block.mode)+'</small>';
    if(block.pending) return '<strong>특별 일정 조정 미정</strong><small>'+e(block.mode)+'</small>';
    if(block.unselected) return '<span class="unselected">참여 활동 미선택</span><small>추가 참여는 신청 시 협의</small>';
    if(block.ids.length) return block.ids.map(id=>'<div class="activity">'+e(name(id))+(staff?'<small>'+owner(id)+'</small>':'')+'</div>').join('')+(block.mode?'<small class="slot-mode">'+e(block.mode)+'</small>':'');
    return e(block.label||'미편성');
  }
  function compactRows(plan,personal=false) {
    const rows=[];
    plan.forEach(block=>{
      if(['break','focus2'].includes(block.key)) return;
      if(block.key==='focus1') {
        const second=plan.find(item=>item.key==='focus2');
        const content=block.pending||second.pending||block.special||second.special
          ? activity(block)+(JSON.stringify(block.special)!==JSON.stringify(second.special)||block.pending!==second.pending?activity(second):'')
          : e(personal?[...new Set([...block.ids,...second.ids].map(name))].join(' → '):names(S.focusIds));
        rows.push(['13:00–15:30',content+'<small>14:00–14:30 휴식·간식 · '+(personal?'신청 시 정한 집중 활동':'동시 선택 운영안')+'</small>','fixed-time']);
      } else rows.push([block.time,activity(block),block.kind]);
    });
    return rows.map(([time,content,kind])=>'<tr><th scope="row">'+e(time)+'</th><td class="'+kind+'">'+content+'</td></tr>').join('');
  }
  if(document.getElementById('basic-daily-rows')) {
    document.getElementById('basic-daily-rows').innerHTML=compactRows(S.planForDay(1));
  } else {
    const tabs=[...document.querySelectorAll('[role="tab"]')];
    let selectedClass='sel',selectedFocus='both',selectedDay=1,selectedSlot='am';
    let calendarMonth=1,calendarDate='2027-01-04';
    const dayChoice=document.getElementById('day-choice'),slotChoice=document.getElementById('class-session');
    function showTab(id) {
      tabs.forEach(tab=>{const active=tab.id===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
      document.querySelectorAll('[role="tabpanel"]').forEach(panel=>{panel.hidden=panel.getAttribute('aria-labelledby')!==id;});
      document.querySelector('.chosen').hidden=!['programs-tab','day-tab'].includes(id);
      document.getElementById('view-day').hidden=id==='day-tab';
      document.querySelector('.entry-actions').hidden=id==='intro-tab';
      document.getElementById('planning-note').hidden=!['builder-tab','day-tab','week-tab','month-tab','operations-tab','calendar-tab'].includes(id);
      document.querySelector('footer').hidden=id==='intro-tab';
    }
    function choices(items,group,selected) {
      return items.map(item=>'<label class="choice"><input type="radio" name="'+group+'" value="'+item.id+'" '+(item.id===selected?'checked':'')+'><span><strong>'+e(item.name)+'</strong><small>'+e(item.detail)+'</small>'+(group==='class'?'<small>'+e(item.mode)+'</small><small class="pending-state">대상·참여 조건 협의 중</small>':'')+'</span></label>').join('');
    }
    function updateDays() {
      const days=S.daysFor(selectedClass);
      if(!days.includes(selectedDay)) selectedDay=days[0];
      dayChoice.innerHTML=days.map(day=>'<option value="'+day+'" '+(day===selectedDay?'selected':'')+'>'+S.weekdays[day]+'</option>').join('');
      const available=S.slotsFor(selectedDay,selectedClass);
      if(!available.includes(selectedSlot)) selectedSlot=available.length===1?available[0]:'';
      slotChoice.innerHTML='<option value="">참여 시간 미선택</option>'+available.map(key=>'<option value="'+key+'" '+(key===selectedSlot?'selected':'')+'>'+(key==='am'?'오전 10:00–12:00':'오후 15:30–17:30')+' · 참여 예시</option>').join('');
      slotChoice.value=selectedSlot;
    }
    function updatePersonal() {
      document.getElementById('chosen').textContent=name(selectedClass)+' · '+name(selectedFocus);
      document.getElementById('daily-rows').innerHTML=compactRows(S.personalPlan(selectedDay,selectedClass,selectedFocus,selectedSlot),true);
      document.getElementById('day-note').textContent=S.weekdays[selectedDay]+'의 개인 참여 예시입니다. '+(selectedClass==='dis'?'분해클래스는 오전·오후 중 1회, 실제 참여 시간은 협의 중입니다. ':'')+'선택하지 않은 시간에는 다른 클래스를 자동 배정하지 않습니다.';
    }
    function renderWeek() {
      const plans=S.weekdays.map((_,day)=>S.planForDay(day));
      document.getElementById('weekly-rows').innerHTML='<tr class="week-themes"><th scope="row">요일 집중안</th>'+S.themes.map(theme=>'<td><strong>'+e(theme.name)+'</strong><small>'+e(theme.detail)+'</small></td>').join('')+'</tr>'+S.blocks.map((block,index)=>'<tr><th scope="row">'+e(block.time)+'</th>'+plans.map(plan=>'<td class="'+block.kind+'">'+activity(plan[index],['am','pm','focus1','focus2','stretch'].includes(block.key))+'</td>').join('')+'</tr>').join('')+'<tr><th scope="row">상시 개별</th><td colspan="5" class="open-time">기존 베이직·교재·진도 유지<small>아이별 주간표에서 예약시간 입력 · 집중타임 공동 활동과 겹침 확인</small></td></tr><tr><th scope="row">특별 일정</th><td colspan="5" class="special-time">논산 딸기 체험 · 초청 특강 · FOX Fair 등<small>날짜·대체 시간·담당을 정한 뒤 해당 날짜 운영에 반영</small></td></tr>';
    }
    function renderBig3() {
      document.getElementById('big3-rows').innerHTML=S.weekdays.map((day,index)=>'<tr><th scope="row">'+day+'</th><td>'+(index===1||index===3?'오전 SEL 클래스':index===4?'분해클래스 · 오전·오후 중 1회':'추가 클래스 미선택')+'</td><td>영어 + 수학 집중타임</td><td>'+(index===4?'분해 참여 시간 협의 중':index===1||index===3?'나머지 반일은 참여 활동 미선택':'오전·오후 참여 활동 미선택')+'</td></tr>').join('');
      document.querySelectorAll('[data-project-steps]').forEach(target=>{target.innerHTML=S.projectSteps.map(([week,title,detail])=>'<div><span class="text-small">'+e(week)+'</span><h3>'+e(title)+'</h3><p>'+e(detail)+'</p></div>').join('');});
    }
    function mainStaff(block) {
      if(block.special||block.pending) return '미배정';
      const ids=block.ids.length?block.ids:['arrival','lunch','break','departure'].includes(block.key)?['life']:[];
      return ids.map(id=>'<span class="main-assignment">'+e((S.program(id)?name(id).replace(' 집중타임',''):'생활 담당')+' · '+S.ownerText(id))+'</span>').join('')||'미배정';
    }
    function operationActivity(block) {
      if(block.special||block.pending) return activity(block);
      return (block.ids.length?block.ids.map(id=>e(name(id))).join('<br>'):e(block.label))+
        (['am','pm'].includes(block.key)?'<small>'+e(block.mode)+'</small>':'');
    }
    function renderOperations() {
      const day=Number(document.getElementById('operations-day').value),staff=S.staffing;
      document.getElementById('operations-status').innerHTML=
        '<div><dt>메인 역할'+'</dt><dd>수학 확인 · 나머지 배정안/미배정</dd></div>'+
        '<div><dt>시간별 당번</dt><dd><span>보조 · '+e(staff.assistant)+'</span> <span>생활 · '+e(staff.careDuty)+'</span></dd></div>'+
        '<div><dt>작업·휴식</dt><dd><span>연구원 개인작업 · '+e(staff.work)+'</span> <span>교대휴식 · '+e(staff.rest)+'</span></dd></div>';
      document.getElementById('care-role').innerHTML='생활지원 역할안: '+e(S.ownerText('care'))+' <span>시간별 생활 당번: '+e(staff.careDuty)+'</span>';
      document.getElementById('operations-rows').innerHTML=S.planForDay(day).map(block=>{
        const teaching=['am','pm','focus1','focus2'].includes(block.key);
        return '<tr role="row"><th role="rowheader" scope="row">'+e(block.time)+'</th><td role="cell" data-label="활동" class="'+block.kind+'">'+operationActivity(block)+'</td><td role="cell" data-label="메인 담당">'+mainStaff(block)+'</td><td role="cell" data-label="시간별 당번">'+(teaching?'<span>보조 · '+e(staff.assistant)+'</span>':'')+'<span>생활 · '+e(staff.careDuty)+'</span></td><td role="cell" data-label="연구원 개인작업·교대휴식" class="rest-time"><span>연구원 개인작업 · '+e(staff.work)+'</span> <span>교대휴식 · '+e(staff.rest)+'</span></td></tr>';
      }).join('');
      document.getElementById('duty-rows').innerHTML=S.weekdays.map(day=>'<tr><th scope="row">'+day+'</th><td>보조 · '+e(staff.assistant)+'<small>필요 인원 미정</small></td><td>생활 당번 · '+e(staff.careDuty)+'</td><td>보조 · '+e(staff.assistant)+'<small>필요 인원 미정</small></td><td>연구원 개인작업 · '+e(staff.work)+'<br>교대휴식 · '+e(staff.rest)+'</td></tr>').join('');
    }
    const eventStatus=item=>item.date?item.date.replace(/-/g,'.')+' · 예정 · '+(item.replaces?.length?'기존 활동 대체안':'대체 시간 미정'):'운영·일정 추후 안내';
    function renderRoster() {
      const rows=[];
      const add=(kind,label,time,main,support,status)=>rows.push('<tr role="row" data-kind="'+e(kind)+'"><td role="cell" data-label="구분">'+e(kind)+'</td><th role="rowheader" scope="row">'+e(label)+'</th><td role="cell" data-label="요일·시간">'+time+'</td><td role="cell" data-label="메인 담당">'+main+'</td><td role="cell" data-label="보조·협업">'+support+'</td><td role="cell" data-label="편성 상태">'+e(status)+'</td></tr>');
      S.classes.forEach(item=>add('요일 클래스',item.name,WinterPlanner.classSessions(item.id).map(slot=>'<span class="roster-session">'+e(slot.dayName+' '+slot.time)+'</span>').join(''),owner(item.id),'보조 '+e(S.staffing.assistant),'시간 편성안 · 대상·개설 협의 중'+(item.id==='dis'?' · 오전·오후 중 1회':'')));
      S.focus.forEach(item=>add('고정 집중',item.name,'매일 13:00–14:00<br>14:30–15:30<small>14:00–14:30 휴식·간식</small>',item.id==='both'?owner('english')+'<br>'+owner('math'):owner(item.id),'보조 당번 '+e(S.staffing.assistant),'시간 편성안 · 개설 협의 중'));
      S.shared.forEach(item=>add('공동·연계',item.name,item.id==='stretch'?'매일 12:30–13:00':'참여 시간 협의 중',owner(item.id),'지원 미배정',item.id==='stretch'?'시간 편성안':'시간·운영 협의 중'));
      S.basics.forEach(item=>add('기존 베이직',item.name,'아이별 요일·시간 미확정<small>'+e(item.detail)+'</small>','개별지도 담당 미확정','교재·진도·참여 시간 확인 필요','시간·담당 미확정 · 아이별 편성'));
      add('상시 개별','독서·이어 하던 작업','담당·공간이 배정된 시간',owner('quiet'),'생활 지원 미배정','시간·공간 협의 중');
      S.events.forEach(item=>add('특별 프로그램',item.name,e(eventStatus(item)),'미배정','대체 활동·외부 강사·내부 책임자 협의','운영·날짜·대체 시간 협의 중'));
      S.future.forEach(item=>add('추후 안내',item.name,'운영 여부 추후 안내','미배정','미배정','내용·운영 협의 중'));
      add('신청자 혜택','해피클래스·해피아워','이용일·시간 별도 안내',owner('life'),'생활 지원 미배정','이용 조건 협의 중');
      add('기록·평가','월별 평가·성장 리포트','월별안','프로그램별 담당 배정 필요','취합 담당 미배정','진행·취합 협의 중');
      document.getElementById('program-roster').innerHTML=rows.join('');
      function filterRoster(){
        const kind=document.getElementById('roster-filter').value,query=document.getElementById('roster-search').value.trim().toLocaleLowerCase();let count=0;
        document.querySelectorAll('#program-roster tr').forEach(row=>{row.hidden=!!((kind&&row.dataset.kind!==kind)||(query&&!row.textContent.toLocaleLowerCase().includes(query)));if(!row.hidden)count++;});
        document.getElementById('roster-count').textContent=count+'개 프로그램 · 전체 '+rows.length+'개';
      }
      document.getElementById('roster-filter').addEventListener('change',filterRoster);
      document.getElementById('roster-search').addEventListener('input',filterRoster);filterRoster();
      document.getElementById('staff-teams').innerHTML=S.teams.map(team=>'<div><strong>'+e(team.name)+'</strong><span>'+team.names.map(e).join(' · ')+'</span></div>').join('');
    }
    function eventButton(item){return '<button type="button" class="program-item event" data-event="'+item.id+'"><strong>'+e(item.name)+'</strong><span>'+e(item.detail)+'</span><small>'+e(eventStatus(item))+' · 담당 미배정</small></button>';}
    document.getElementById('reservation-rows').innerHTML=['english','math'].map(id=>'<tr><th scope="row">'+e(name(id))+' 연계</th><td>집중시간 외 예약 · 시간 미배정<br>예약 담당 미배정<small>집중 메인: '+owner(id)+'</small></td><td>이어갈 교재·진도 지점 확인 필요</td></tr>').join('');
    document.getElementById('class-choices').innerHTML=choices(S.classes,'class',selectedClass);
    document.getElementById('focus-choices').innerHTML=choices(S.focus,'focus',selectedFocus);
    const list=items=>items.map(item=>'<div class="program-item"><h3>'+e(item.name)+'</h3><p>'+e(item.detail)+'</p></div>').join('');
    document.getElementById('shared-programs').innerHTML=list(S.shared);
    document.getElementById('future-programs').innerHTML=list(S.future);
    document.getElementById('event-programs').innerHTML=S.events.map(eventButton).join('');
    document.getElementById('monthly-events').innerHTML=S.events.map(item=>'<article id="event-'+item.id+'" tabindex="-1"><div><h3>'+e(item.name)+'</h3><p>'+e(item.detail)+'</p><p>담당 미배정 · 참여 대상·방법 협의 중</p></div><span class="event-date">'+e(eventStatus(item))+'</span></article>').join('');
    const dateKey=(year,month,day)=>year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    function calendarInfo(day) {
      const [year,month]=S.calendarMonths[calendarMonth],date=dateKey(year,month,day),weekday=new Date(year,month,day).getDay();
      const active=date>='2027-01-04'&&weekday>0&&weekday<6&&!S.holidays[date];
      return {date,day,weekday,theme:active?S.themes[weekday-1]:null,holiday:S.holidays[date],special:S.events.filter(item=>item.date===date)};
    }
    function renderCalendarDetail() {
      const info=calendarInfo(Number(calendarDate.slice(-2))),[year,month]=S.calendarMonths[calendarMonth];
      const plan=info.theme?S.planForDay(info.weekday-1,info.date):null;
      document.getElementById('calendar-detail').innerHTML='<h3>'+year+'년 '+(month+1)+'월 '+info.day+'일 · '+['일','월','화','수','목','금','토'][info.weekday]+'요일</h3>'+info.special.map(item=>'<p class="calendar-special">'+e(item.name)+' · '+e(eventStatus(item))+' · 담당 미배정</p>').join('')+(info.holiday?'<p>'+e(info.holiday)+' · 센터 운영 별도 안내</p>':plan?'<p class="calendar-theme-name">'+e(info.theme.name)+' · 편성안</p><div class="calendar-day-programs">'+['am','focus1','focus2','pm'].map(key=>{const block=plan.find(item=>item.key===key);return '<div><small>'+e(block.time)+'</small>'+activity(block,true)+'</div>';}).join('')+'</div>':month===11?'<p>해피클래스 · 해피아워 이용일 추후 안내</p>':'<p>예정된 정규 프로그램이 없습니다.</p>');
    }
    function renderCalendar() {
      const [year,month]=S.calendarMonths[calendarMonth],length=new Date(year,month+1,0).getDate(),offset=new Date(year,month,1).getDay();
      if(!calendarDate.startsWith(dateKey(year,month,1).slice(0,7))) calendarDate=dateKey(year,month,month===0?4:1);
      document.getElementById('calendar-month').value=String(calendarMonth);
      document.getElementById('calendar-title').textContent=year+'년 '+(month+1)+'월 달력';
      document.getElementById('calendar-prev').disabled=calendarMonth===0;document.getElementById('calendar-next').disabled=calendarMonth===S.calendarMonths.length-1;
      document.getElementById('calendar-focus').textContent=month===11?'12월 · 해피클래스·해피아워 이용일 추후 안내':'센터 기본 편성안 · 매일 집중 활동: '+names(S.focusIds);
      let html='';
      const cells=Math.ceil((offset+length)/7)*7;
      for(let cell=0;cell<cells;cell++) {
        if(cell%7===0) html+='<tr>';
        const day=cell-offset+1;
        if(day<1||day>length) html+='<td class="calendar-empty"></td>';
        else {
          const info=calendarInfo(day),label=year+'년 '+(month+1)+'월 '+day+'일'+(info.theme?' · '+info.theme.name:'')+(info.holiday?' · '+info.holiday:'')+info.special.map(item=>' · '+item.name).join('');
          html+='<td><button type="button" class="calendar-day '+(info.theme?info.theme.id:'')+(info.holiday?' holiday':'')+(info.weekday===0?' sunday':'')+(info.weekday===6?' saturday':'')+'" data-calendar-date="'+info.date+'" aria-label="'+e(label)+'" aria-pressed="'+(info.date===calendarDate)+'"><span class="calendar-number">'+day+'</span>'+(info.theme?'<span class="calendar-label"><span class="theme-long">'+e(info.theme.name)+'</span><span class="theme-short">'+e(info.theme.short)+'</span></span>':'')+(info.holiday?'<span class="calendar-holiday">'+e(info.holiday)+'</span>':'')+info.special.map(item=>'<span class="calendar-special">'+e(item.name)+'</span>').join('')+'</button></td>';
        }
        if(cell%7===6) html+='</tr>';
      }
      document.getElementById('calendar-days').innerHTML=html;
      document.getElementById('calendar-pending').innerHTML=S.events.filter(item=>!item.date).map(item=>'<button type="button" data-event="'+item.id+'">'+e(item.name)+'</button>').join('');
      renderCalendarDetail();
    }
    document.getElementById('calendar-themes').innerHTML=S.themes.map((theme,index)=>'<div class="'+theme.id+'"><small>'+['월','화','수','목','금'][index]+'</small><strong>'+e(theme.name)+'</strong><span>'+e(theme.detail)+' · 편성안</span></div>').join('');
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>showTab(tab.id));
      tab.addEventListener('keydown',event=>{const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];if(next===undefined)return;event.preventDefault();tabs[next].focus();showTab(tabs[next].id);});
    });
    document.querySelectorAll('[data-tab-target]').forEach(button=>button.addEventListener('click',()=>{
      showTab(button.dataset.tabTarget);
      document.getElementById(button.dataset.tabTarget).focus();
    }));
    document.querySelectorAll('input[name="class"],input[name="focus"]').forEach(input=>input.addEventListener('change',()=>{
      if(input.name==='class'){selectedClass=input.value;selectedSlot='';updateDays();}else selectedFocus=input.value;
      updatePersonal();
    }));
    dayChoice.addEventListener('change',()=>{selectedDay=Number(dayChoice.value);selectedSlot='';updateDays();updatePersonal();});
    slotChoice.addEventListener('change',()=>{selectedSlot=slotChoice.value;updatePersonal();});
    document.getElementById('operations-day').addEventListener('change',renderOperations);
    document.getElementById('open-builder').addEventListener('click',()=>{showTab('builder-tab');document.getElementById('builder-tab').focus();});
    document.getElementById('open-overview').addEventListener('click',()=>{showTab('operations-tab');const target=document.getElementById('roster-heading');target.focus();target.scrollIntoView({block:'start'});});
    document.getElementById('view-day').addEventListener('click',()=>{showTab('day-tab');document.getElementById('day-tab').focus();});
    document.getElementById('view-operations').addEventListener('click',()=>{showTab('operations-tab');const target=document.getElementById('operations-heading');target.focus();target.scrollIntoView({block:'start'});});
    document.getElementById('view-program-roster').addEventListener('click',()=>{showTab('operations-tab');const target=document.getElementById('roster-heading');target.focus();target.scrollIntoView({block:'start'});});
    document.getElementById('view-big3-week').addEventListener('click',()=>{showTab('week-tab');const target=document.getElementById('big3-heading');target.focus();target.scrollIntoView({block:'start'});});
    document.getElementById('view-sel-month').addEventListener('click',()=>{showTab('month-tab');const target=document.getElementById('sel-month-heading');target.focus();target.scrollIntoView({block:'start'});});
    document.addEventListener('click',event=>{const button=event.target.closest('[data-event]');if(!button)return;showTab('month-tab');const target=document.getElementById('event-'+button.dataset.event);target.focus();target.scrollIntoView({block:'center'});});
    document.getElementById('calendar-month').addEventListener('change',event=>{calendarMonth=Number(event.target.value);renderCalendar();});
    document.getElementById('calendar-prev').addEventListener('click',()=>{if(calendarMonth>0){calendarMonth--;renderCalendar();}});
    document.getElementById('calendar-next').addEventListener('click',()=>{if(calendarMonth<S.calendarMonths.length-1){calendarMonth++;renderCalendar();}});
    document.getElementById('calendar-days').addEventListener('click',event=>{const button=event.target.closest('[data-calendar-date]');if(!button)return;calendarDate=button.dataset.calendarDate;document.querySelectorAll('[data-calendar-date]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderCalendarDetail();});
    updateDays();updatePersonal();renderWeek();renderBig3();renderOperations();renderRoster();renderCalendar();showTab('intro-tab');
  }
}
