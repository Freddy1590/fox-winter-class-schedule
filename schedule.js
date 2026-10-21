'use strict';
{
  const classes = [
    {id:'dis',name:'분해클래스',detail:'발견한 것을 나누고, 함께 새 쓰임과 이야기를 만드는 협력 프로젝트',mode:'방학클래스에 함께하는 프로젝트 · 단독 참여 가능 · 세부 편성 협의 중'},
    {id:'ai',name:'AI 클래스',detail:'생성형 AI 등으로 표현하고 만들기',mode:'매회 체험 / 이어가는 프로젝트'},
    {id:'sel',name:'SEL 클래스',detail:'감정카드·감정 표현, 글과 그림으로 책 만들기',mode:'이어가는 프로젝트 · 감정 표현을 책으로 모으기'},
    {id:'art',name:'Priscilla 영어·미술 클래스',detail:'표현 익히기, 협동 미술, 영어로 소개하기',mode:'체험·프로젝트 편성 협의 중'},
    {id:'play',name:'플레이팩트',detail:'교구를 조작하며 방법과 규칙 탐구하기',mode:'매회 체험 · 세부 진행 협의 중'},
    {id:'cook',name:'요리·베이킹 클래스',detail:'함께 만들고 순서와 역할 나누기',mode:'매회 체험 · 세부 진행 협의 중'}
  ];
  const focus = [
    {id:'both',name:'영어 + 수학 집중타임',detail:'스스로 공부하고, 서로 설명하고 질문하며 함께 이해 넓히기'},
    {id:'english',name:'영어 집중타임',detail:'배운 표현을 나누고 서로 설명하기 · 어휘·읽기·쓰기'},
    {id:'math',name:'수학 집중타임',detail:'풀이를 설명하고 친구의 질문으로 생각 다듬기 · 예습 또는 복습'},
    {id:'deep',name:'AI 심화 클래스',detail:'AI를 더 깊이 공부하고 작업 이어가기'},
    {id:'reading',name:'독서 집중타임',detail:'책을 읽고 생각 정리하기'},
    {id:'work',name:'개별 작업 집중타임',detail:'이어 하던 작업에 조용히 몰입하기'}
  ];
  const focusIds = ['english','math','deep','quiet'];
  const shared = [
    {id:'speaking',name:'영어 말하기 · 30분안',detail:'교재와 미술 활동에서 익힌 표현을 말해봅니다. 참여 시간 협의 중.'},
    {id:'stretch',name:'전문가 스트레칭·체조',detail:'집중타임 전 몸을 풀어줍니다.'},
    {id:'sport',name:'틈새 체육활동',detail:'활동 사이 몸을 움직입니다. 참여 시간 추후 안내.'}
  ];
  const events = [
    {id:'strawberry',name:'논산 딸기 체험',detail:'차량으로 다녀오는 딸기 체험 · 신청자 별도 비용'},
    {id:'america',name:'미리 만나는 미국',detail:'영상 또는 화상으로 만나는 미국'},
    {id:'choir',name:'합창 특강',detail:'학생과 연구원이 함께 노래하기'},
    {id:'baseball',name:'야구 체험 특강',detail:'야구 코치와 함께하는 활동'},
    {id:'soccer',name:'축구 활동',detail:'함께 몸을 움직이는 운동 활동'},
    {id:'music',name:'AI·음악 작곡 클래스',detail:'음악과 AI를 연결해 표현하기'},
    {id:'career',name:'미래 진로 특강',detail:'초청 전문가와 미래 이야기 나누기'},
    {id:'parent',name:'SEL 학부모 특강',detail:'양육·학습 방향·마음 돌봄'},
    {id:'gallery',name:'갤러리 작가와의 만남',detail:'작가와 작품 이야기 나누기'},
    {id:'picture',name:'그림책 작가 특강',detail:'학생·학부모가 함께하는 토요 활동'},
    {id:'green',name:'Green Book 토요 이벤트',detail:'Green Book 진행자와 함께하는 활동'},
    {id:'farmer',name:'농부 초청 · 파머스 활동',detail:'농부와 먹거리 이야기 나누기'},
    {id:'fair',name:'FOX Fair',detail:'방학 동안의 활동과 결과를 함께 나누기'},
    {id:'festival',name:'함께 즐기는 페스티벌',detail:'학생과 연구원이 함께 즐기는 행사'}
  ];
  const future = [
    {name:'영화 프로젝트',detail:'운영 여부 추후 안내'},
    {name:'태권도',detail:'운영 여부 추후 안내'},
    {name:'Life OS 연계 활동',detail:'활동 내용·운영 여부 추후 안내'}
  ];
  const basics = [
    {name:'베이직 영어·교재',detail:'Reading Gate·Spectrum Writing 등 이어가는 교재·진도'},
    {name:'베이직 수학·교재',detail:'기존 수학 교재·진도와 개별지도'}
  ];
  const week = [
    {am:['ai','art'],pm:['ai','play']},
    {am:['sel','art'],pm:['ai','art']},
    {am:['ai','play'],pm:['cook','art']},
    {am:['sel','art'],pm:['ai','art']},
    {am:['dis'],pm:['dis']}
  ];
  const weekdays = ['월요일','화요일','수요일','목요일','금요일'];
  const teams = [
    {name:'AI',names:['이준민','김기환','박성주']},
    {name:'SEL',names:['송지영','박미현','전은소','최명민']},
    {name:'언어',names:['한은비','프리실라']},
    {name:'수학',names:['김철병']},
    {name:'라이프 OS',names:['전우열','김지은']},
    {name:'센터장',names:['양준모']},
    {name:'운영실',names:['오하림','박지영']}
  ];
  // 소속 명단과 프로그램 역할 확인은 별도. 수학 메인만 사용자 확인.
  const owners = {
    art:{name:'프리실라'},speaking:{name:'프리실라'},english:{name:'한은비'},math:{name:'김철병',confirmed:true},
    ai:{name:'이준민'},sel:{name:'송지영'},dis:{name:'김기환'},deep:{name:'이준민'},quiet:{name:'송지영'},
    stretch:{name:'전우열'},sport:{name:'김지은'},life:{name:'오하림'},care:{name:'박지영'},lead:{name:'양준모'}
  };
  const staffing = {assistant:'미배정',careDuty:'미배정',work:'미편성',rest:'미편성'};
  const themes = [
    {id:'ai',name:'AI 집중요일',short:'AI',detail:'생성형 AI · 표현·제작'},
    {id:'sel',name:'SEL 집중요일',short:'SEL',detail:'감정카드 · 감정 표현'},
    {id:'play',name:'플레이팩트·요리',short:'놀이·요리',detail:'교구 탐구 · 요리·베이킹'},
    {id:'art',name:'SEL·영어미술',short:'SEL·미술',detail:'감정 표현 · 협동 미술'},
    {id:'dis',name:'분해클래스',short:'분해',detail:'공구 · 분해·관찰·재구성'}
  ];
  const blocks = [
    {key:'arrival',time:'등원–10:00',label:'등원 · 간식 · 개인 활동',kind:'fixed-time'},
    {key:'am',time:'10:00–12:00',kind:'class-time'},
    {key:'lunch',time:'12:00–12:30',label:'점심',kind:'fixed-time'},
    {key:'stretch',time:'12:30–13:00',label:'스트레칭·체조',ids:['stretch'],kind:'fixed-time'},
    {key:'focus1',time:'13:00–14:00',kind:'fixed-time'},
    {key:'break',time:'14:00–14:30',label:'학생 휴식 · 간식',kind:'fixed-time'},
    {key:'focus2',time:'14:30–15:30',kind:'fixed-time'},
    {key:'pm',time:'15:30–17:30',kind:'class-time'},
    {key:'departure',time:'17:30 이후',label:'정리 · 간식 · 귀가',kind:'fixed-time'}
  ];
  const projectSteps = [
    ['1주차 예시','표현할 감정 고르기','내가 표현할 감정과 이유를 고릅니다.'],
    ['2주차 예시','말·글·그림 모으기','감정카드와 내 경험을 말·글·그림으로 모읍니다.'],
    ['3주차 예시','책의 순서 정하기','모은 표현을 고르고 순서를 정합니다.'],
    ['4주차 예시','읽고 고쳐 나누기','다시 읽고 고친 뒤 원하는 방식으로 나눕니다.']
  ];
  const calendarMonths = [[2026,11],[2027,0],[2027,1]];
  // 기존 월력요항 표시를 보존. 센터 운영 여부는 별도 안내.
  const holidays = {'2026-12-25':'성탄절','2027-01-01':'신정','2027-02-06':'설 연휴','2027-02-07':'설날','2027-02-08':'설 연휴','2027-02-09':'대체공휴일'};
  const program = id => [...classes,...focus,...shared,...events,{id:'quiet',name:'독서·개별 작업',detail:'선택한 독서 또는 작업 이어가기'}].find(item=>item.id===id);
  const daysFor = id => week.flatMap((day,index)=>[...day.am,...day.pm].includes(id)?[index]:[]);
  const slotsFor = (day,id) => ['am','pm'].filter(key=>week[day][key].includes(id));
  const owner = id => owners[['reading','work'].includes(id)?'quiet':id];
  const ownerText = id => {const item=owner(id);return item?item.name+' · '+(item.confirmed?'메인 확인':'배정안'):'미배정';};
  function planForDay(day,date='',specials=events) {
    const special=specials.filter(item=>date && item.date===date);
    const unresolved=special.some(item=>!Array.isArray(item.replaces)||!item.replaces.length);
    return blocks.map(block=>{
      const replacing=special.filter(item=>item.replaces?.includes(block.key));
      if(replacing.length) return {...block,ids:[],special:replacing,kind:'special-time',mode:'기존 활동 대체안 · 담당·인원 확인 필요'};
      if(unresolved && ['am','focus1','focus2','pm'].includes(block.key)) return {...block,ids:[],pending:true,mode:'특별 일정의 대체 시간 미정'};
      const ids=['am','pm'].includes(block.key)?week[day][block.key]:block.key.startsWith('focus')?focusIds:block.ids||[];
      return {...block,ids,mode:block.key==='am'||block.key==='pm'?(day===4?'오전·오후 중 1회 · 참여 시간 협의 중':'동시 선택 운영안 · 개설 그룹 수 미정'):block.key.startsWith('focus')?'동시 선택 운영안 · 신청 시 정한 활동 참여':''};
    });
  }
  function personalPlan(day,classId,focusId,classSlot) {
    return planForDay(day).map(block=>{
      if(['am','pm'].includes(block.key)) return {...block,ids:block.key===classSlot&&block.ids.includes(classId)?[classId]:[],unselected:block.key!==classSlot||!block.ids.includes(classId)};
      if(block.key.startsWith('focus')) return {...block,ids:[focusId==='both'?(block.key==='focus1'?'english':'math'):focusId]};
      return block;
    });
  }
  globalThis.WinterSchedule = {classes,focus,focusIds,shared,events,future,basics,week,weekdays,teams,owners,staffing,themes,blocks,projectSteps,calendarMonths,holidays,program,daysFor,slotsFor,owner,ownerText,planForDay,personalPlan};
}
