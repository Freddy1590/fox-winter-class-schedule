'use strict';
{
  const T=WinterTimetable,U=WinterTimetableUI,$=id=>document.getElementById(id),key='fox-winter-2027-timetable-draft-v1';
  let endpoint='',revision=null,dirty=false,busy=false,blocked=false,localFailed=false;
  function status(text){$('timetable-status').textContent=text;}
  function controls(){const disabled=busy||!endpoint||blocked;$('timetable-save').disabled=disabled;$('timetable-reload').disabled=busy||!endpoint;}
  function refresh(){globalThis.WinterCurrentApp?.refresh();globalThis.WinterPersonalUI?.refresh();document.dispatchEvent(new CustomEvent('winter-timetable-loaded'));}
  function backup(){
    try{localStorage.setItem(key,JSON.stringify({state:U.getState(),baseRevision:revision,endpoint}));localFailed=false;}
    catch{localFailed=true;status('미저장 · 이 기기 임시 보관도 실패했습니다. 백업 파일을 받아 주세요.');}
  }
  function changed(){dirty=true;backup();if(!localFailed)status(endpoint?(blocked?'다른 저장본이 있습니다 · 백업 후 저장본을 다시 불러와 주세요.':'미저장 변경 · 공유 저장을 눌러 주세요.'):'공유 저장 연결 전 · 변경 내용은 이 기기에 임시 보관됩니다.');controls();}
  async function request(options={}){
    const response=await fetch(endpoint,{...options,credentials:'omit',redirect:'follow',signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw new Error('공유 저장 서버 응답을 확인해 주세요.');
    const data=await response.json();
    if(!data.ok){const error=new Error(data.message||'저장하지 못했습니다. 입력 내용은 유지됩니다.');error.code=data.code;throw error;}
    if(!Number.isInteger(data.revision)||data.revision<0)throw new Error('저장본 번호를 확인할 수 없습니다.');
    data.state=T.checked(data.state);return data;
  }
  async function load(discard=false){
    if(!endpoint)return;
    if(discard&&dirty&&!window.confirm('이 기기의 변경 내용 대신 공유 저장본을 불러올까요? 필요한 내용은 먼저 백업 파일로 받아 주세요.'))return;
    const before=U.serialize();busy=true;controls();status('공유 저장본을 불러오는 중입니다.');
    try{
      const data=await request();
      if(U.serialize()!==before||(!discard&&dirty&&revision!==data.revision)){
        blocked=true;status('다른 저장본이 있습니다 · 입력은 유지했습니다. 백업 후 저장본을 다시 불러와 주세요.');
      }else if(!discard&&dirty){revision=data.revision;status('미저장 변경을 복구했습니다 · 공유 저장을 눌러 주세요.');}
      else{U.setState(data.state);revision=data.revision;dirty=false;blocked=false;try{localStorage.removeItem(key);}catch{}refresh();status(data.revision?'공유 저장본 불러오기 완료':'공유 저장 연결됨 · 기본 시간표');}
    }catch(error){status('불러오기 실패 · '+error.message+' 현재 입력은 유지됩니다.');}
    finally{busy=false;controls();}
  }
  async function save(){
    if(!endpoint||blocked||busy)return;
    const input=$('timetable-edit-code');
    if(!input.value){$('timetable-code-field').hidden=false;input.focus();status('편집코드를 입력한 뒤 공유 저장을 눌러 주세요.');return;}
    if(revision===null){status('공유 저장본을 먼저 불러와 주세요. 현재 입력은 유지됩니다.');return;}
    const submitted=U.getState(),snapshot=JSON.stringify(submitted);busy=true;controls();status('공유 저장 중입니다.');
    try{
      const data=await request({method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'save',revision,state:submitted,editCode:input.value})});
      revision=data.revision;blocked=false;
      if(U.serialize()===snapshot){dirty=false;try{localStorage.removeItem(key);}catch{}status('공유 저장 완료 · '+new Date(data.savedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}));}
      else{dirty=true;backup();status('직전 내용은 공유 저장됐습니다 · 이후 변경은 다시 저장해 주세요.');}
    }catch(error){
      if(error.code==='conflict')blocked=true;
      if(error.code==='unauthorized'){$('timetable-code-field').hidden=false;input.focus();}
      dirty=true;backup();status('저장 실패 · '+error.message+' 입력 내용은 유지됩니다.');
    }finally{busy=false;controls();}
  }
  function init(){
    const field=document.createElement('label');field.id='timetable-code-field';field.hidden=true;field.textContent='편집코드';
    const input=document.createElement('input');input.id='timetable-edit-code';input.type='password';input.autocomplete='current-password';field.append(input);$('timetable-savebar').append(field);
    let draft=null;
    try{const raw=localStorage.getItem(key);if(raw){draft=JSON.parse(raw);U.setState(T.checked(draft.state));revision=Number.isInteger(draft.baseRevision)?draft.baseRevision:null;dirty=true;refresh();}}catch{status('임시 보관본을 읽지 못했습니다 · 기본 시간표를 표시합니다.');}
    U.onChange(changed);
    $('timetable-save').addEventListener('click',save);$('timetable-reload').addEventListener('click',()=>load(true));
    $('timetable-backup').addEventListener('click',()=>{const blob=new Blob([U.serialize()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='2027-겨울방클-시간표.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    $('timetable-import').addEventListener('click',()=>$('timetable-file').click());
    $('timetable-file').addEventListener('change',async event=>{
      const file=event.target.files[0];if(!file)return;
      try{if(file.size>5000000)throw new Error('파일은 5MB 이내로 선택해 주세요.');const parsed=JSON.parse(await file.text());U.setState(T.checked(parsed.state||parsed));refresh();changed();}
      catch(error){status('불러오기 실패 · '+error.message+' 현재 시간표는 유지됩니다.');}finally{event.target.value='';}
    });
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    controls();
    fetch('./shared-config.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error();return response.json();}).then(config=>{
      if(typeof config.endpoint!=='string'||!config.endpoint.startsWith('https://')){status('공유 저장 연결 전 · 변경 내용은 이 기기에 임시 보관됩니다.');return;}
      endpoint=config.endpoint;if(draft&&draft.endpoint&&draft.endpoint!==endpoint)revision=null;controls();load();
    }).catch(()=>status('공유 저장 연결 전 · 변경 내용은 이 기기에 임시 보관됩니다.'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}
