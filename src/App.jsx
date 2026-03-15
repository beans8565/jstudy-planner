import { useState, useRef } from "react";

const ADMIN_ID = "admin";
const ADMIN_PW = "jstudy2026";
const defaultStudents = [
  { id: 1, name: "김민준", password: "1234" },
  { id: 2, name: "이서연", password: "1234" },
  { id: 3, name: "박지호", password: "1234" },
];
const PERIODS = [
  { label: "1교시", time: "8:40~10:00(80분)" },
  { label: "2교시", time: "10:20~12:00(100분)" },
  { label: "점심", time: "12:00~13:10", break: true },
  { label: "3교시", time: "13:10~14:20(70분)" },
  { label: "4교시", time: "14:40~15:50(70분)" },
  { label: "5교시", time: "16:00~17:00(60분)" },
  { label: "저녁", time: "17:00~18:00", break: true },
  { label: "6교시", time: "18:00~19:20(80분)" },
  { label: "7교시", time: "19:40~21:00(80분)" },
  { label: "8교시", time: "21:20~22:40(80분)" },
  { label: "9교시", time: "23:00~24:00(60분)" },
];
const DAYS = ["월","화","수","목","금","토","일"];
const P_LABELS = PERIODS.filter(p=>!p.break).map(p=>p.label);
const SUBJECTS = ["국어","수학","영어","과학","사회","한국사","탐구","기타","일정"];
const SUBJECT_COLORS = {
  "국어":"#ec4899","수학":"#6366f1","영어":"#3b82f6","과학":"#10b981",
  "사회":"#f59e0b","한국사":"#ef4444","탐구":"#8b5cf6","기타":"#64748b","일정":"#94a3b8"
};
const EXCLUDED_SUBJECTS = ["일정"];
const RATES = [0,25,50,75,100];
const RATE_COLOR = {0:"#e5e7eb",25:"#fbbf24",50:"#fb923c",75:"#60a5fa",100:"#34d399"};
const RATE_LABEL = {0:"0%",25:"25%",50:"50%",75:"75%",100:"100%"};

const getWeekRange = (offset=0) => {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate()-(day===0?6:day-1)+offset*7);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const fmt = d=>`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
  const fmtS = d=>`${d.getMonth()+1}월 ${d.getDate()}일`;
  return `${fmt(mon)} ~ ${fmtS(sun)}`;
};
const buildLabel = ({subject,textbook,amount}) => {
  const p=[];
  if(subject) p.push(`[${subject}]`);
  if(textbook) p.push(textbook);
  if(amount) p.push(`📄 ${amount}`);
  return p.join("\n");
};
const emptyForm = {subject:"수학",textbook:"",amount:""};

export default function App() {
  const [screen, setScreen]       = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState("");
  const [loginPw, setLoginPw]     = useState("");
  const [loginError, setLoginError] = useState("");

  // students
  const [students, setStudents]   = useState(defaultStudents);
  const studentNextId             = useRef(10);
  const [showStudentMgmt, setShowStudentMgmt] = useState(false);
  const [newStudentName, setNewStudentName]   = useState("");
  const [newStudentPw, setNewStudentPw]       = useState("");
  const [studentMgmtError, setStudentMgmtError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId]   = useState(null);

  // schedule
  const [weekOffset, setWeekOffset]           = useState(0);
  const [adminWeekOffset, setAdminWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState({});
  const [submitted, setSubmitted] = useState(new Set());
  const [feedbacks, setFeedbacks] = useState({});
  const [fbDraft, setFbDraft]     = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);

  // library
  const [library, setLibrary] = useState([
    {id:1,subject:"수학",textbook:"수학의 정석",amount:"p.100~120",color:SUBJECT_COLORS["수학"]},
    {id:2,subject:"영어",textbook:"수능특강",amount:"Unit 3~4",color:SUBJECT_COLORS["영어"]},
    {id:3,subject:"국어",textbook:"문학 개념서",amount:"20문제",color:SUBJECT_COLORS["국어"]},
    {id:4,subject:"일정",textbook:"학교 수업",amount:"",color:SUBJECT_COLORS["일정"]},
  ]);
  const [form, setForm]           = useState(emptyForm);
  const [editingLibId, setEditingLibId] = useState(null);
  const [editForm, setEditForm]   = useState(emptyForm);
  const [showLibrary, setShowLibrary] = useState(false);

  // lib drag-to-cell
  const [libDragging, setLibDragging] = useState(null);
  const [dragOver, setDragOver]       = useState(null);
  const [editingCell, setEditingCell] = useState(null);

  // range drag
  const [dragStart, setDragStart]         = useState(null);
  const [dragEnd, setDragEnd]             = useState(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [pickerPos, setPickerPos]         = useState({x:0,y:0});

  // check mode
  const [checkMode, setCheckMode]     = useState(false);
  const [achievement, setAchievement] = useState({});

  const nextLibId = useRef(100);

  /* ── helpers ── */
  const sKey  = (u,w)     => `${u}_${w}`;
  const cKey  = (d,p)     => `${d}_${p}`;
  const fKey  = (u,w,d,p) => `${u}_${w}_${d}_${p}`;
  const aKey  = (u,w,d,p) => `${u}_${w}_${d}_${p}`;

  const getCell  = (u,w,d,p) => (schedules[sKey(u,w)]||{})[cKey(d,p)]||null;
  const setCell  = (u,w,d,p,v) => {
    const k=sKey(u,w);
    setSchedules(prev=>({...prev,[k]:{...(prev[k]||{}),[cKey(d,p)]:v}}));
  };
  const clearCell = (u,w,d,p) => {
    const k=sKey(u,w);
    setSchedules(prev=>{const n={...(prev[k]||{})};delete n[cKey(d,p)];return{...prev,[k]:n};});
  };
  const isSub   = (u,w) => submitted.has(sKey(u,w));
  const getRate = (u,w,d,p) => achievement[aKey(u,w,d,p)]??0;
  const cycleRate = (u,w,d,p) => {
    const cur=getRate(u,w,d,p);
    const next=RATES[(RATES.indexOf(cur)+1)%RATES.length];
    setAchievement(prev=>({...prev,[aKey(u,w,d,p)]:next}));
  };

  /* range helpers */
  const getRangeSet = (ds,de) => {
    if(!ds||!de) return new Set();
    const minD=Math.min(ds.di,de.di), maxD=Math.max(ds.di,de.di);
    const minP=Math.min(ds.pi,de.pi), maxP=Math.max(ds.pi,de.pi);
    const s=new Set();
    for(let d=minD;d<=maxD;d++) for(let p=minP;p<=maxP;p++) s.add(`${d}_${p}`);
    return s;
  };
  const applyRangeFill = (uid,wo,item) => {
    if(!dragStart||!dragEnd) return;
    const minD=Math.min(dragStart.di,dragEnd.di), maxD=Math.max(dragStart.di,dragEnd.di);
    const minP=Math.min(dragStart.pi,dragEnd.pi), maxP=Math.max(dragStart.pi,dragEnd.pi);
    for(let d=minD;d<=maxD;d++) for(let p=minP;p<=maxP;p++)
      setCell(uid,wo,DAYS[d],P_LABELS[p],{...item,label:buildLabel(item)});
    setShowRangePicker(false); setDragStart(null); setDragEnd(null);
  };
  const clearRangeFill = (uid,wo) => {
    if(!dragStart||!dragEnd) return;
    const minD=Math.min(dragStart.di,dragEnd.di), maxD=Math.max(dragStart.di,dragEnd.di);
    const minP=Math.min(dragStart.pi,dragEnd.pi), maxP=Math.max(dragStart.pi,dragEnd.pi);
    for(let d=minD;d<=maxD;d++) for(let p=minP;p<=maxP;p++) clearCell(uid,wo,DAYS[d],P_LABELS[p]);
    setShowRangePicker(false); setDragStart(null); setDragEnd(null);
  };

  /* login */
  const handleLogin = () => {
    if(loginName===ADMIN_ID&&loginPw===ADMIN_PW){setScreen("admin");setLoginError("");}
    else{
      const f=students.find(s=>s.name===loginName&&s.password===loginPw);
      if(f){setCurrentUser(f);setScreen("student");setLoginError("");}
      else setLoginError("이름 또는 비밀번호가 올바르지 않습니다.");
    }
    setLoginName("");setLoginPw("");
  };

  /* library */
  const addLibItem = () => {
    if(!form.textbook.trim()) return;
    setLibrary(prev=>[...prev,{id:nextLibId.current++,...form,color:SUBJECT_COLORS[form.subject]||"#64748b"}]);
    setForm(emptyForm);
  };
  const saveLibEdit = (id) => {
    setLibrary(prev=>prev.map(i=>i.id===id?{...i,...editForm,color:SUBJECT_COLORS[editForm.subject]||"#64748b"}:i));
    setEditingLibId(null);
  };

  /* student mgmt */
  const addStudent = () => {
    const name=newStudentName.trim(), pw=newStudentPw.trim();
    if(!name){setStudentMgmtError("이름을 입력해주세요.");return;}
    if(!pw){setStudentMgmtError("비밀번호를 입력해주세요.");return;}
    if(students.find(s=>s.name===name)){setStudentMgmtError("이미 등록된 이름입니다.");return;}
    setStudents(prev=>[...prev,{id:studentNextId.current++,name,password:pw}]);
    setNewStudentName("");setNewStudentPw("");setStudentMgmtError("");
  };
  const deleteStudent = (id) => {
    if(selectedStudent?.id===id) setSelectedStudent(null);
    setStudents(prev=>prev.filter(s=>s.id!==id));
    setConfirmDeleteId(null);
  };

  /* ── LOGIN ── */
  if(screen==="login") return (
    <div style={{minHeight:"100vh",background:"#f8f9fb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:340,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:28,fontWeight:800,color:"#1e1e2e"}}>J<span style={{color:"#6366f1"}}>Study</span></div>
          <div style={{fontSize:13,color:"#9ca3af",marginTop:4}}>주간 학습 플래너</div>
        </div>
        <label style={{fontSize:12,color:"#6b7280",fontWeight:600,display:"block",marginBottom:6}}>이름 (관리자: admin)</label>
        <input value={loginName} onChange={e=>setLoginName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="이름을 입력하세요"
          style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        <label style={{fontSize:12,color:"#6b7280",fontWeight:600,display:"block",marginBottom:6}}>비밀번호</label>
        <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="비밀번호를 입력하세요"
          style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:16}}/>
        {loginError&&<div style={{color:"#ef4444",fontSize:12,marginBottom:12,textAlign:"center"}}>{loginError}</div>}
        <button onClick={handleLogin} style={{width:"100%",padding:12,borderRadius:10,background:"#6366f1",color:"#fff",fontWeight:700,fontSize:15,border:"none",cursor:"pointer"}}>로그인</button>
        <div style={{marginTop:20,padding:"12px 14px",background:"#f3f4f6",borderRadius:10,fontSize:11,color:"#9ca3af"}}>
          <div style={{fontWeight:700,marginBottom:4,color:"#6b7280"}}>테스트 계정</div>
          <div>학생: 김민준 / 이서연 / 박지호 — 비밀번호: 1234</div>
          <div>관리자: admin / jstudy2026</div>
        </div>
      </div>
    </div>
  );

  /* ── STUDENT ── */
  if(screen==="student") {
    const uid=currentUser.id, wo=weekOffset, sub=isSub(uid,wo);
    const allCells=PERIODS.filter(p=>!p.break).flatMap(p=>DAYS.map(d=>({d,p:p.label})));
    const filledCells=allCells.filter(({d,p})=>getCell(uid,wo,d,p));
    const scorable=filledCells.filter(({d,p})=>!EXCLUDED_SUBJECTS.includes(getCell(uid,wo,d,p)?.subject));
    const avgRate=scorable.length>0?Math.round(scorable.reduce((a,{d,p})=>a+getRate(uid,wo,d,p),0)/scorable.length):0;

    const selectedRange = getRangeSet(dragStart, dragEnd);
    const selCount = dragStart&&dragEnd ? (Math.abs(dragStart.di-dragEnd.di)+1)*(Math.abs(dragStart.pi-dragEnd.pi)+1) : 0;

    const handleCellMouseDown = (di,pi,e) => {
      if(sub||checkMode) return;
      e.preventDefault();
      setDragStart({di,pi}); setDragEnd({di,pi}); setIsDraggingRange(true); setShowRangePicker(false);
    };
    const handleCellMouseEnter = (di,pi) => { if(isDraggingRange) setDragEnd({di,pi}); };
    const handleTableMouseUp = (e) => {
      if(!isDraggingRange) return;
      setIsDraggingRange(false);
      if(dragStart&&dragEnd){
        const count=(Math.abs(dragStart.di-dragEnd.di)+1)*(Math.abs(dragStart.pi-dragEnd.pi)+1);
        if(count>0){
          setPickerPos({x:Math.min(e.clientX, window.innerWidth-270), y:Math.min(e.clientY+8, window.innerHeight-330)});
          setShowRangePicker(true);
        }
      }
    };

    const LibPanel = (
      <div style={{width:230,flexShrink:0,marginRight:14,background:"#fff",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",overflow:"hidden",position:"sticky",top:70,maxHeight:"calc(100vh - 90px)",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #f3f4f6"}}>
          <div style={{fontWeight:800,fontSize:14,color:"#1e1e2e"}}>📚 셀 라이브러리</div>
          <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>드래그해서 개별 셀에 넣거나<br/>표 범위를 드래그해서 한번에 적용</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
          {library.map(item=>(
            <div key={item.id} style={{marginBottom:8}}>
              {editingLibId===item.id ? (
                <div style={{border:`1.5px solid ${item.color}`,borderRadius:10,padding:10,background:`${item.color}08`}}>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
                    {SUBJECTS.map(s=>(
                      <button key={s} onClick={()=>setEditForm(f=>({...f,subject:s}))}
                        style={{padding:"3px 7px",borderRadius:12,fontSize:10,fontWeight:700,border:"none",cursor:"pointer",background:editForm.subject===s?SUBJECT_COLORS[s]:"#f3f4f6",color:editForm.subject===s?"#fff":"#6b7280"}}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {[["textbook","교재명/인강명"],["amount","분량"]].map(([k,ph])=>(
                    <input key={k} value={editForm[k]} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                      style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:4}}/>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:2}}>
                    <button onClick={()=>saveLibEdit(item.id)} style={{flex:1,padding:"5px",borderRadius:6,background:"#6366f1",color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>저장</button>
                    <button onClick={()=>setEditingLibId(null)} style={{flex:1,padding:"5px",borderRadius:6,background:"#f3f4f6",color:"#6b7280",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>취소</button>
                  </div>
                </div>
              ) : (
                <div draggable onDragStart={()=>setLibDragging(item)} onDragEnd={()=>{setLibDragging(null);setDragOver(null);}}
                  style={{padding:"8px 10px",borderRadius:10,background:`${item.color}12`,border:`1.5px solid ${item.color}30`,cursor:"grab",userSelect:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <span style={{fontSize:10,fontWeight:800,color:item.color,background:`${item.color}22`,padding:"1px 7px",borderRadius:10}}>{item.subject}</span>
                    <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                      <button onClick={()=>{setEditingLibId(item.id);setEditForm({subject:item.subject,textbook:item.textbook,amount:item.amount});}}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:11,padding:0}}>✏️</button>
                      <button onClick={()=>setLibrary(prev=>prev.filter(i=>i.id!==item.id))}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:12,padding:0}}>✕</button>
                    </div>
                  </div>
                  {item.textbook&&<div style={{fontSize:11,fontWeight:700,color:"#1e1e2e",lineHeight:1.4}}>{item.textbook}</div>}
                  {item.amount&&<div style={{fontSize:10,color:"#6b7280",marginTop:1}}>📄 {item.amount}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{borderTop:"1px solid #f3f4f6",padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#374151",marginBottom:8}}>+ 새 셀 추가</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:7}}>
            {SUBJECTS.map(s=>(
              <button key={s} onClick={()=>setForm(f=>({...f,subject:s}))}
                style={{padding:"3px 7px",borderRadius:12,fontSize:10,fontWeight:700,border:"none",cursor:"pointer",background:form.subject===s?SUBJECT_COLORS[s]:"#f3f4f6",color:form.subject===s?"#fff":"#6b7280"}}>
                {s}
              </button>
            ))}
          </div>
          {[["textbook","✏️ 교재명 / 인강명"],["amount","📄 분량 (예: p.100~120)"]].map(([k,ph])=>(
            <input key={k} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addLibItem()} placeholder={ph}
              style={{width:"100%",padding:"6px 9px",borderRadius:7,border:"1.5px solid #e5e7eb",fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:6,background:"#fafafa"}}/>
          ))}
          <button onClick={addLibItem} disabled={!form.textbook.trim()}
            style={{width:"100%",padding:"8px",borderRadius:8,background:form.textbook.trim()?"#6366f1":"#e5e7eb",color:form.textbook.trim()?"#fff":"#9ca3af",fontWeight:700,fontSize:12,border:"none",cursor:form.textbook.trim()?"pointer":"not-allowed"}}>
            라이브러리에 추가
          </button>
        </div>
      </div>
    );

    return (
      <div style={{minHeight:"100vh",background:"#f0f1f8",fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif"}}>
        {/* Header */}
        <div style={{background:"#fff",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0,zIndex:30,flexWrap:"wrap",gap:8}}>
          <div style={{fontWeight:800,fontSize:16,color:"#1e1e2e"}}>J<span style={{color:"#6366f1"}}>Study</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={()=>{setCheckMode(v=>!v);setShowLibrary(false);}}
              style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:checkMode?"#10b981":"#ecfdf5",color:checkMode?"#fff":"#10b981",border:`1.5px solid ${checkMode?"#10b981":"#6ee7b7"}`,cursor:"pointer",whiteSpace:"nowrap"}}>
              ✅ 달성률 체크{checkMode?" ON":""}
            </button>
            <button onClick={()=>{setShowLibrary(v=>!v);setCheckMode(false);}}
              style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,background:showLibrary?"#6366f1":"#eef2ff",color:showLibrary?"#fff":"#6366f1",border:`1.5px solid ${showLibrary?"#6366f1":"#a5b4fc"}`,cursor:"pointer",whiteSpace:"nowrap"}}>
              📚 셀 라이브러리
            </button>
            <button onClick={()=>{setScreen("login");setCurrentUser(null);}} style={{fontSize:12,color:"#9ca3af",background:"none",border:"none",cursor:"pointer"}}>로그아웃</button>
          </div>
        </div>

        <div style={{display:"flex",maxWidth:1120,margin:"0 auto",padding:"16px 12px",alignItems:"flex-start"}}>
          {showLibrary && LibPanel}
          <div style={{flex:1,minWidth:0}}>

            {/* 범위 선택 팝업 */}
            {showRangePicker && (
              <div style={{position:"fixed",top:pickerPos.y,left:pickerPos.x,zIndex:200,background:"#fff",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",padding:"14px 16px",width:255,border:"1.5px solid #e0e7ff"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1e1e2e",marginBottom:3}}>📌 {selCount}칸 선택됨</div>
                <div style={{fontSize:10,color:"#9ca3af",marginBottom:10}}>적용할 셀을 선택하세요</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:210,overflowY:"auto",marginBottom:10}}>
                  {library.map(item=>(
                    <div key={item.id} onClick={()=>applyRangeFill(uid,wo,item)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:9,background:`${item.color}10`,border:`1.5px solid ${item.color}30`,cursor:"pointer"}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:item.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:10,fontWeight:800,color:item.color}}>[{item.subject}] </span>
                        <span style={{fontSize:11,fontWeight:700,color:"#1e1e2e"}}>{item.textbook}</span>
                        {item.amount&&<div style={{fontSize:10,color:"#9ca3af"}}>📄 {item.amount}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>clearRangeFill(uid,wo)} style={{flex:1,padding:"6px",borderRadius:8,background:"#fff0f0",color:"#ef4444",fontWeight:700,fontSize:11,border:"1px solid #fecaca",cursor:"pointer"}}>🗑 비우기</button>
                  <button onClick={()=>{setShowRangePicker(false);setDragStart(null);setDragEnd(null);}} style={{flex:1,padding:"6px",borderRadius:8,background:"#f3f4f6",color:"#6b7280",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>취소</button>
                </div>
              </div>
            )}

            {/* Week nav */}
            <div style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
              <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#6366f1",padding:"0 8px"}}>‹</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,color:"#9ca3af"}}>이름: <strong style={{color:"#1e1e2e"}}>{currentUser.name}</strong></div>
                <div style={{fontSize:13,fontWeight:700,color:"#1e1e2e",marginTop:2}}>{getWeekRange(wo)}</div>
                {sub&&<div style={{fontSize:11,color:"#10b981",marginTop:2,fontWeight:700}}>✅ 제출 완료</div>}
                {!sub&&!checkMode&&<div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>표를 드래그해서 범위 선택 후 셀 적용</div>}
              </div>
              <button onClick={()=>setWeekOffset(w=>w+1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#6366f1",padding:"0 8px"}}>›</button>
            </div>

            {/* 달성률 패널 */}
            {checkMode && (
              <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#1e1e2e"}}>📊 이번 주 전체 달성률</span>
                  <span style={{fontSize:22,fontWeight:900,color:"#10b981"}}>{avgRate}%</span>
                </div>
                <div style={{height:10,background:"#e5e7eb",borderRadius:6,overflow:"hidden",marginBottom:14}}>
                  <div style={{height:"100%",width:`${avgRate}%`,background:"linear-gradient(90deg,#34d399,#10b981)",borderRadius:6,transition:"width 0.5s"}}/>
                </div>
                {(()=>{
                  const sm={};
                  filledCells.forEach(({d,p})=>{
                    const cell=getCell(uid,wo,d,p);
                    if(!cell||EXCLUDED_SUBJECTS.includes(cell.subject)) return;
                    const s=cell.subject||"기타";
                    if(!sm[s]) sm[s]={color:cell.color,total:0,rateSum:0};
                    sm[s].total++; sm[s].rateSum+=getRate(uid,wo,d,p);
                  });
                  const entries=Object.entries(sm);
                  if(!entries.length) return <div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"8px 0"}}>계획표에 셀을 채워주세요</div>;
                  return (
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8}}>과목별 달성률</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {entries.map(([subj,{color,rateSum,total}])=>{
                          const avg=total>0?Math.round(rateSum/total):0;
                          return (
                            <div key={subj}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:10,fontWeight:800,color,background:`${color}20`,padding:"2px 8px",borderRadius:10}}>{subj}</span>
                                  <span style={{fontSize:10,color:"#9ca3af"}}>{total}칸</span>
                                </div>
                                <span style={{fontSize:13,fontWeight:800,color}}>{avg}%</span>
                              </div>
                              <div style={{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${avg}%`,background:color,borderRadius:4,transition:"width 0.4s",opacity:0.85}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap",paddingTop:12,borderTop:"1px solid #f3f4f6"}}>
                  {Object.entries(RATE_COLOR).map(([r,c])=>(
                    <div key={r} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#6b7280"}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:c}}/>{RATE_LABEL[r]}
                    </div>
                  ))}
                  <span style={{fontSize:10,color:"#c4c9d4",marginLeft:4}}>← 셀 클릭으로 순환</span>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{background:"#fff",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",overflow:"auto"}}
              onMouseUp={handleTableMouseUp}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:560,userSelect:"none"}}>
                <thead>
                  <tr style={{background:"#6366f1"}}>
                    <th style={{padding:"10px 8px",fontSize:12,fontWeight:700,color:"#fff",border:"1px solid #5254cc",width:86,textAlign:"center"}}>교시</th>
                    {DAYS.map(d=><th key={d} style={{padding:"10px 5px",fontSize:13,fontWeight:700,color:"#fff",border:"1px solid #5254cc",textAlign:"center"}}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p,rawI)=>{
                    if(p.break) return (
                      <tr key={rawI} style={{background:"#f3f4f6"}}>
                        <td colSpan={8} style={{padding:"7px 12px",fontSize:12,color:"#6b7280",fontWeight:700,textAlign:"center",border:"1px solid #e5e7eb"}}>{p.label} {p.time}</td>
                      </tr>
                    );
                    const pi = P_LABELS.indexOf(p.label);
                    return (
                      <tr key={rawI}>
                        <td style={{padding:"6px 8px",border:"1px solid #e5e7eb",textAlign:"center",background:"#fafafa",verticalAlign:"middle"}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>{p.label}</div>
                          <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{p.time}</div>
                        </td>
                        {DAYS.map((d,di)=>{
                          const cell = getCell(uid,wo,d,p.label);
                          const inRange = selectedRange.has(`${di}_${pi}`);
                          const isOver  = dragOver===cKey(d,p.label);
                          const ck      = `${uid}_${wo}_${d}_${p.label}`;
                          const isExcluded = EXCLUDED_SUBJECTS.includes(cell?.subject);
                          const rate    = cell ? getRate(uid,wo,d,p.label) : 0;
                          return (
                            <td key={d}
                              onMouseDown={e=>handleCellMouseDown(di,pi,e)}
                              onMouseEnter={()=>handleCellMouseEnter(di,pi)}
                              onDragOver={e=>{if(!sub){e.preventDefault();setDragOver(cKey(d,p.label));}}}
                              onDragLeave={()=>setDragOver(null)}
                              onDrop={()=>{if(!libDragging||sub)return;setCell(uid,wo,d,p.label,{...libDragging,label:buildLabel(libDragging)});setLibDragging(null);setDragOver(null);}}
                              style={{border:`1.5px solid ${inRange?"#6366f1":isOver?"#a5b4fc":"#e5e7eb"}`,padding:4,verticalAlign:"top",minWidth:70,
                                background:inRange?"#eef2ff":isOver?"#f5f3ff":"#fff",
                                transition:"background 0.08s",
                                cursor:checkMode?"pointer":isDraggingRange?"crosshair":"default"}}>
                              {cell ? (
                                <div style={{position:"relative"}}>
                                  <div onClick={()=>checkMode&&!isExcluded&&cycleRate(uid,wo,d,p.label)}
                                    style={{padding:"5px 7px",borderRadius:7,
                                      background:checkMode&&!isExcluded?`${RATE_COLOR[rate]}30`:`${cell.color}14`,
                                      borderLeft:`3px solid ${checkMode&&!isExcluded?RATE_COLOR[rate]:cell.color}`,
                                      cursor:checkMode&&!isExcluded?"pointer":"default",transition:"all 0.15s"}}>
                                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                                      <span style={{fontSize:9,fontWeight:800,color:cell.color,background:`${cell.color}20`,padding:"1px 5px",borderRadius:8}}>{cell.subject}</span>
                                      {checkMode&&(isExcluded
                                        ?<span style={{fontSize:9,fontWeight:700,color:"#94a3b8",background:"#f1f5f9",padding:"1px 5px",borderRadius:8}}>제외</span>
                                        :<span style={{fontSize:9,fontWeight:900,color:"#fff",background:RATE_COLOR[rate],padding:"1px 5px",borderRadius:8}}>{RATE_LABEL[rate]}</span>
                                      )}
                                    </div>
                                    <div style={{fontSize:11,fontWeight:700,color:"#1e1e2e",lineHeight:1.4}}>{cell.textbook}</div>
                                    {editingCell===ck&&!sub&&!checkMode ? (
                                      <input autoFocus defaultValue={cell.amount||""}
                                        onBlur={e=>{setCell(uid,wo,d,p.label,{...cell,amount:e.target.value});setEditingCell(null);}}
                                        onKeyDown={e=>{if(e.key==="Enter"){setCell(uid,wo,d,p.label,{...cell,amount:e.target.value});setEditingCell(null);}if(e.key==="Escape")setEditingCell(null);}}
                                        placeholder="분량 입력..."
                                        style={{width:"100%",fontSize:10,border:"none",borderBottom:"1.5px solid #6366f1",outline:"none",background:"transparent",color:"#6b7280",boxSizing:"border-box",padding:"2px 0",marginTop:3}}/>
                                    ) : (
                                      <div onClick={e=>{if(!sub&&!checkMode){e.stopPropagation();setEditingCell(ck);}}}
                                        style={{fontSize:10,color:cell.amount?"#6b7280":"#c4c9d4",marginTop:2,cursor:sub||checkMode?"default":"pointer"}}>
                                        📄 {cell.amount||(!sub&&!checkMode&&<span style={{fontSize:9,color:"#c4c9d4"}}>분량 추가...</span>)}
                                      </div>
                                    )}
                                  </div>
                                  {!sub&&!checkMode&&(
                                    <button onClick={()=>clearCell(uid,wo,d,p.label)}
                                      style={{position:"absolute",top:2,right:2,background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:12,lineHeight:1,padding:"0 2px"}}>✕</button>
                                  )}
                                </div>
                              ) : (
                                !sub&&<div style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,
                                  color:inRange?"#6366f1":isOver?"#a5b4fc":"transparent"}}>
                                  {inRange?"✓":isOver?"놓기":""}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
              {!sub ? (
                <button onClick={()=>setSubmitted(prev=>new Set([...prev,sKey(uid,wo)]))}
                  style={{padding:"11px 28px",borderRadius:10,background:"#6366f1",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer",boxShadow:"0 4px 12px rgba(99,102,241,0.3)"}}>
                  실장님께 제출하기 →
                </button>
              ) : (
                <div style={{padding:"11px 24px",borderRadius:10,background:"#d1fae5",color:"#059669",fontWeight:700,fontSize:14}}>✅ 제출 완료</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── ADMIN ── */
  if(screen==="admin") {
    const wo=adminWeekOffset, uid=selectedStudent?.id;
    const adminAll=PERIODS.filter(p=>!p.break).flatMap(p=>DAYS.map(d=>({d,p:p.label})));
    const adminFilled=uid?adminAll.filter(({d,p})=>getCell(uid,wo,d,p)):[];
    const adminScorable=adminFilled.filter(({d,p})=>!EXCLUDED_SUBJECTS.includes(getCell(uid,wo,d,p)?.subject));
    const adminAvg=adminScorable.length>0?Math.round(adminScorable.reduce((a,{d,p})=>a+getRate(uid,wo,d,p),0)/adminScorable.length):0;
    const adminSM={};
    adminFilled.forEach(({d,p})=>{
      const cell=getCell(uid,wo,d,p);
      if(!cell||EXCLUDED_SUBJECTS.includes(cell.subject)) return;
      const s=cell.subject||"기타";
      if(!adminSM[s]) adminSM[s]={color:cell.color,total:0,rateSum:0};
      adminSM[s].total++; adminSM[s].rateSum+=getRate(uid,wo,d,p);
    });

    return (
      <div style={{minHeight:"100vh",background:"#f0f1f8",fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif"}}>
        <div style={{background:"#fff",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e5e7eb",position:"sticky",top:0,zIndex:20}}>
          <div style={{fontWeight:800,fontSize:16,color:"#1e1e2e"}}>J<span style={{color:"#6366f1"}}>Study</span> <span style={{fontSize:13,fontWeight:500,color:"#6b7280"}}>관리자</span></div>
          <button onClick={()=>{setScreen("login");setSelectedStudent(null);setShowStudentMgmt(false);}} style={{fontSize:12,color:"#9ca3af",background:"none",border:"none",cursor:"pointer"}}>로그아웃</button>
        </div>
        <div style={{padding:"16px 12px",maxWidth:1000,margin:"0 auto"}}>

          {/* 학생 탭 */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {students.map(s=>(
              <button key={s.id} onClick={()=>setSelectedStudent(s)}
                style={{padding:"8px 18px",borderRadius:20,fontSize:13,fontWeight:700,border:"2px solid",borderColor:selectedStudent?.id===s.id?"#6366f1":"#e5e7eb",background:selectedStudent?.id===s.id?"#6366f1":"#fff",color:selectedStudent?.id===s.id?"#fff":"#374151",cursor:"pointer"}}>
                {s.name}{isSub(s.id,wo)&&<span style={{marginLeft:6,fontSize:10,background:"#d1fae5",color:"#059669",padding:"1px 6px",borderRadius:10}}>제출</span>}
              </button>
            ))}
            <button onClick={()=>setShowStudentMgmt(v=>!v)}
              style={{padding:"8px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:`2px solid ${showStudentMgmt?"#6366f1":"#e5e7eb"}`,background:showStudentMgmt?"#eef2ff":"#fff",color:showStudentMgmt?"#6366f1":"#9ca3af",cursor:"pointer",marginLeft:"auto"}}>
              ⚙️ 학생 관리
            </button>
          </div>

          {/* 학생 관리 패널 */}
          {showStudentMgmt && (
            <div style={{background:"#fff",borderRadius:14,padding:"18px 20px",marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1.5px solid #e0e7ff"}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1e1e2e",marginBottom:14}}>⚙️ 학생 관리</div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8}}>등록된 학생 ({students.length}명)</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {students.map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,background:"#f9fafb",border:"1px solid #e5e7eb"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#6366f1"}}>{s.name[0]}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"#1e1e2e"}}>{s.name}</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>비밀번호: {s.password}</div>
                        </div>
                      </div>
                      {confirmDeleteId===s.id ? (
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>정말 삭제?</span>
                          <button onClick={()=>deleteStudent(s.id)} style={{padding:"4px 10px",borderRadius:8,background:"#ef4444",color:"#fff",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>삭제</button>
                          <button onClick={()=>setConfirmDeleteId(null)} style={{padding:"4px 10px",borderRadius:8,background:"#f3f4f6",color:"#6b7280",fontWeight:700,fontSize:11,border:"none",cursor:"pointer"}}>취소</button>
                        </div>
                      ) : (
                        <button onClick={()=>setConfirmDeleteId(s.id)} style={{padding:"5px 12px",borderRadius:8,background:"#fff0f0",color:"#ef4444",fontWeight:700,fontSize:11,border:"1px solid #fecaca",cursor:"pointer"}}>삭제</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{borderTop:"1px solid #f3f4f6",paddingTop:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8}}>새 학생 추가</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input value={newStudentName} onChange={e=>{setNewStudentName(e.target.value);setStudentMgmtError("");}} onKeyDown={e=>e.key==="Enter"&&addStudent()} placeholder="이름"
                    style={{flex:1,minWidth:100,padding:"8px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,outline:"none"}}/>
                  <input value={newStudentPw} onChange={e=>{setNewStudentPw(e.target.value);setStudentMgmtError("");}} onKeyDown={e=>e.key==="Enter"&&addStudent()} placeholder="비밀번호"
                    style={{flex:1,minWidth:100,padding:"8px 12px",borderRadius:8,border:"1.5px solid #e5e7eb",fontSize:13,outline:"none"}}/>
                  <button onClick={addStudent} style={{padding:"8px 18px",borderRadius:8,background:"#6366f1",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>+ 추가</button>
                </div>
                {studentMgmtError&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{studentMgmtError}</div>}
              </div>
            </div>
          )}

          {/* 주차 nav */}
          <div style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <button onClick={()=>setAdminWeekOffset(w=>w-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#6366f1",padding:"0 8px"}}>‹</button>
            <div style={{textAlign:"center"}}>
              {selectedStudent&&<div style={{fontSize:11,color:"#9ca3af"}}>이름: <strong style={{color:"#1e1e2e"}}>{selectedStudent.name}</strong></div>}
              <div style={{fontSize:13,fontWeight:700,color:"#1e1e2e",marginTop:2}}>{getWeekRange(wo)}</div>
              {uid&&(isSub(uid,wo)?<div style={{fontSize:11,color:"#10b981",fontWeight:700,marginTop:2}}>✅ 제출됨</div>:<div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginTop:2}}>⏳ 미제출</div>)}
            </div>
            <button onClick={()=>setAdminWeekOffset(w=>w+1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#6366f1",padding:"0 8px"}}>›</button>
          </div>

          {/* 달성률 패널 */}
          {selectedStudent&&adminFilled.length>0&&(
            <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:800,color:"#1e1e2e"}}>📊 {selectedStudent.name} 달성률</span>
                <span style={{fontSize:22,fontWeight:900,color:"#10b981"}}>{adminAvg}%</span>
              </div>
              <div style={{height:10,background:"#e5e7eb",borderRadius:6,overflow:"hidden",marginBottom:14}}>
                <div style={{height:"100%",width:`${adminAvg}%`,background:"linear-gradient(90deg,#34d399,#10b981)",borderRadius:6,transition:"width 0.5s"}}/>
              </div>
              {Object.entries(adminSM).length>0&&(
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8}}>과목별 달성률</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {Object.entries(adminSM).map(([subj,{color,rateSum,total}])=>{
                      const avg=total>0?Math.round(rateSum/total):0;
                      return (
                        <div key={subj}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:10,fontWeight:800,color,background:`${color}20`,padding:"2px 8px",borderRadius:10}}>{subj}</span>
                              <span style={{fontSize:10,color:"#9ca3af"}}>{total}칸</span>
                            </div>
                            <span style={{fontSize:13,fontWeight:800,color}}>{avg}%</span>
                          </div>
                          <div style={{height:7,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${avg}%`,background:color,borderRadius:4,transition:"width 0.4s",opacity:0.85}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedStudent ? (
            <div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:14}}>위에서 학생을 선택하세요</div>
          ) : (
            <div style={{background:"#fff",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
                <thead>
                  <tr style={{background:"#6366f1"}}>
                    <th style={{padding:"10px 8px",fontSize:12,fontWeight:700,color:"#fff",border:"1px solid #5254cc",width:86,textAlign:"center"}}>교시</th>
                    {DAYS.map(d=><th key={d} style={{padding:"10px 5px",fontSize:13,fontWeight:700,color:"#fff",border:"1px solid #5254cc",textAlign:"center"}}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p,i)=>{
                    if(p.break) return (
                      <tr key={i} style={{background:"#f3f4f6"}}>
                        <td colSpan={8} style={{padding:"7px 12px",fontSize:12,color:"#6b7280",fontWeight:700,textAlign:"center",border:"1px solid #e5e7eb"}}>{p.label} {p.time}</td>
                      </tr>
                    );
                    return (
                      <tr key={i}>
                        <td style={{padding:"6px 8px",border:"1px solid #e5e7eb",textAlign:"center",background:"#fafafa",verticalAlign:"middle"}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#374151"}}>{p.label}</div>
                          <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{p.time}</div>
                        </td>
                        {DAYS.map(d=>{
                          const cell=getCell(uid,wo,d,p.label);
                          const fk=fKey(uid,wo,d,p.label);
                          const savedFb=feedbacks[fk]||"";
                          const draftFb=fbDraft[fk]!==undefined?fbDraft[fk]:savedFb;
                          return (
                            <td key={d} style={{border:"1px solid #e5e7eb",padding:4,verticalAlign:"top",minWidth:80}}>
                              {cell&&(
                                <div style={{padding:"4px 7px",borderRadius:7,background:`${cell.color}14`,borderLeft:`3px solid ${cell.color}`,marginBottom:4}}>
                                  <span style={{fontSize:9,fontWeight:800,color:cell.color,background:`${cell.color}20`,padding:"1px 5px",borderRadius:8,display:"inline-block",marginBottom:2}}>{cell.subject}</span>
                                  <div style={{fontSize:11,fontWeight:700,color:"#1e1e2e",lineHeight:1.4}}>{cell.textbook}</div>
                                  {cell.amount&&<div style={{fontSize:10,color:"#6b7280",marginTop:1}}>📄 {cell.amount}</div>}
                                  {!EXCLUDED_SUBJECTS.includes(cell.subject)&&(
                                    <div style={{fontSize:9,fontWeight:700,color:"#fff",background:RATE_COLOR[getRate(uid,wo,d,p.label)],display:"inline-block",padding:"1px 6px",borderRadius:8,marginTop:3}}>
                                      {RATE_LABEL[getRate(uid,wo,d,p.label)]}
                                    </div>
                                  )}
                                </div>
                              )}
                              {cell&&(
                                <textarea value={draftFb} onChange={e=>setFbDraft(prev=>({...prev,[fk]:e.target.value}))}
                                  onBlur={()=>setFeedbacks(prev=>({...prev,[fk]:draftFb}))}
                                  placeholder="피드백..." rows={2}
                                  style={{width:"100%",border:"1px dashed #6366f1",outline:"none",resize:"none",fontSize:10,color:"#6366f1",background:"#f5f5ff",boxSizing:"border-box",padding:"3px 4px",borderRadius:4,lineHeight:1.5}}/>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
}