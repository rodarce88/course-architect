'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const YouTubePlayer = dynamic(() => import('@/components/YouTubePlayer'), { ssr: false })

type Video={id:string;iid:string;title:string;thumbnail:string;channel:string;channelImg:string;subscribers:string;views:string;viewsShort?:string;likes:string;likesShort?:string;duration:string;url:string;completed:boolean;notes:Note[];votes:number;votedBy:string[]}
type Note={id:string;minute:string;text:string;author:string;authorImg:string;ts:number;isPublic:boolean}
type Sub={id:string;name:string;videos:Video[]}
type Mod={id:string;name:string;subs:Sub[]}
type Course={id:string;name:string;modules:Mod[];isPublic:boolean}

let _c=0;const uid=()=>`u${++_c}${Date.now()}`;const swap=(a:any[],i:number,j:number)=>{const n=[...a];[n[i],n[j]]=[n[j],n[i]];return n}
function parseDur(d:string){if(!d)return 0;const p=d.split(':').map(Number);if(p.length===3)return p[0]*3600+p[1]*60+p[2];if(p.length===2)return p[0]*60+p[1];return p[0]||0}
function fmtS(s:number){if(s<=0)return'0m';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`}
function fmtTime(s:number){const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=Math.floor(s%60);if(h>0)return`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;return`${m}:${String(sec).padStart(2,'0')}`}
function timeToSec(t:string){const p=t.split(':').map(Number);if(p.length===3)return p[0]*3600+p[1]*60+p[2];if(p.length===2)return p[0]*60+p[1];return p[0]||0}
function subDur(s:Sub){return s.videos.reduce((a,v)=>a+parseDur(v.duration),0)}
function modDur(m:Mod){return m.subs.reduce((a,s)=>a+subDur(s),0)}
function cDur(c:Course){return c.modules.reduce((a,m)=>a+modDur(m),0)}
function cVC(c:Course){return c.modules.reduce((a,m)=>a+m.subs.reduce((b,s)=>b+s.videos.length,0),0)}
function cComp(c:Course){return c.modules.reduce((a,m)=>a+m.subs.reduce((b,s)=>b+s.videos.filter(v=>v.completed).length,0),0)}
function subComp(s:Sub){return s.videos.filter(v=>v.completed).length}
function modComp(m:Mod){return m.subs.reduce((a,s)=>a+subComp(s),0)}

function PBar({done,total,t}:{done:number;total:number;t:any}){const p=total===0?0:Math.round(done/total*100);return(<div className="flex items-center gap-2 w-full"><div className={`flex-1 h-1.5 rounded-full ${t.progBg} overflow-hidden`}><div className={`h-1.5 rounded-full transition-all duration-500 ${p===100?'bg-emerald-400':t.progFill}`} style={{width:`${p}%`}}/></div><span className={`text-[10px] font-medium tabular-nums ${p===100?'text-emerald-400':t.muted}`}>{p}%</span></div>)}
function VoteBtn({votes,voted,onVote,t}:{votes:number;voted:boolean;onVote:()=>void;t:any}){return(<button onClick={e=>{e.stopPropagation();onVote()}} disabled={voted} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${voted?`${t.votedBg} ${t.voteBtnBorder} cursor-default`:`${t.voteBtnBg} ${t.voteBtnHover} ${t.voteBtnBorder} cursor-pointer`}`}><svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1L9 6H1L5 1Z" fill={voted?t.votedFill:t.voteFill}/></svg><span className={voted?t.votedText:t.voteText}>{votes||0}</span></button>)}

function NumpadModal({value,onChange,onClose,onCapture,currentTime,t}:{value:string;onChange:(v:string)=>void;onClose:()=>void;onCapture:()=>void;currentTime:string;t:any}){
  const[raw,setRaw]=useState(value.replace(/:/g,''))
  const fmt=(r:string)=>{const d=r.replace(/\D/g,'');if(d.length<=2)return d;if(d.length<=4)return d.slice(0,-2)+':'+d.slice(-2);return d.slice(0,-4)+':'+d.slice(-4,-2)+':'+d.slice(-2)}
  const press=(n:string)=>{if(raw.length>=6)return;const next=raw+n;setRaw(next);onChange(fmt(next))}
  const del=()=>{const next=raw.slice(0,-1);setRaw(next);onChange(next?fmt(next):'')}
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`${t.card} border ${t.border} rounded-2xl p-5 w-72 ${t.shadow}`} onClick={e=>e.stopPropagation()}>
        <p className="text-xs font-bold text-center mb-3">Timestamp</p>
        <div className={`text-center py-3 mb-3 rounded-xl ${t.surface} border ${t.border} text-2xl font-mono font-bold tracking-wider`}>{value||'0:00'}</div>
        <button onClick={()=>{onCapture();onClose()}} className={`w-full mb-3 py-2.5 rounded-xl text-xs font-bold border ${t.border} ${t.btn} flex items-center justify-center gap-2`}>⏱ Capture current ({currentTime})</button>
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} onClick={()=>press(n)} className={`py-3.5 rounded-xl text-base font-bold ${t.btn} border ${t.border} active:scale-95 transition-all`}>{n}</button>)}
          <button onClick={()=>{setRaw('');onChange('')}} className={`py-3.5 rounded-xl text-xs font-bold text-rose-400 ${t.btn} border ${t.border}`}>CLR</button>
          <button onClick={()=>press('0')} className={`py-3.5 rounded-xl text-base font-bold ${t.btn} border ${t.border}`}>0</button>
          <button onClick={del} className={`py-3.5 rounded-xl text-xs font-bold ${t.btn} border ${t.border}`}>⌫</button>
        </div>
        <button onClick={onClose} className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold ${t.accent} ${t.btnText}`}>Done</button>
      </div>
    </div>
  )
}

export default function Home(){
  const[dark,setDark]=useState(false)
  const[user,setUser]=useState<any>(null)
  const[loading,setLoading]=useState(true)
  const[courses,setCourses]=useState<Course[]>([])
  const[activeId,setActiveId]=useState<string|null>(null)
  const[modal,setModal]=useState<any>(null)
  const[inputVal,setInputVal]=useState('')
  const[fetching,setFetching]=useState(false)
  const[preview,setPreview]=useState<any>(null)
  const[fetchError,setFetchError]=useState('')
  const[coll,setColl]=useState<Record<string,boolean>>({})
  const[pv,setPV]=useState<any>(null)
  const[noteMin,setNoteMin]=useState('')
  const[noteDesc,setNoteDesc]=useState('')
  const[noteTab,setNoteTab]=useState<'public'|'mine'>('public')
  const[editId,setEditId]=useState<string|null>(null)
  const[editVal,setEditVal]=useState('')
  const[numpad,setNumpad]=useState(false)
  const[playerTime,setPlayerTime]=useState(0)
  const[authMode,setAuthMode]=useState<'google'|'email'>('google')
  const[emailInput,setEmailInput]=useState('')
  const[otpSent,setOtpSent]=useState(false)
  const[otpCode,setOtpCode]=useState('')
  const[authLoading,setAuthLoading]=useState(false)
  const[authError,setAuthError]=useState('')
  const ytRef=useRef<any>(null)

  const active=courses.find(c=>c.id===activeId)
  const togColl=(id:string)=>setColl(p=>({...p,[id]:!p[id]}))
  const upC=(fn:(c:Course)=>Course)=>setCourses(p=>p.map(c=>c.id===activeId?fn(c):c))
  const userName=user?.user_metadata?.full_name||user?.email||'Anon'
  const userImg=user?.user_metadata?.avatar_url||''

  const t=dark?{
    bg:'bg-[#07070d]',card:'bg-[#0f0f18]',surface:'bg-[#131320]',border:'border-[#1c1c2e]',text:'text-[#e4e4ec]',muted:'text-[#5e5e78]',accent:'bg-amber-400',accentText:'text-amber-400',btn:'bg-[#181828] hover:bg-[#22223a] text-[#c4c4d4]',btnText:'text-[#07070d]',input:'bg-[#0b0b14] border-[#22223a] text-[#e4e4ec] placeholder-[#3e3e58]',shadow:'shadow-xl shadow-black/30',progBg:'bg-[#1a1a2a]',progFill:'bg-amber-400',hover:'hover:border-amber-400/20',danger:'text-rose-400/60 hover:text-rose-400',completedBg:'bg-emerald-400/15 text-emerald-400',checkDone:'text-emerald-400',checkUndone:'text-[#3a3a50]',notesBg:'bg-[#12121e]',noteBadge:'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 cursor-pointer',tabActive:'bg-amber-400/15 text-amber-400 border-amber-400/30',tabInactive:'text-[#5e5e78] hover:text-[#8e8ea8]',headerBg:'bg-[#07070d]/80',sidebarBg:'bg-[#0e0e18]',playerBg:'bg-[#0a0a12]',voteBtnBg:'bg-[#181828]',voteBtnHover:'hover:bg-amber-400/10',voteBtnBorder:'border-[#2a2a3a]',voteFill:'#d97706',voteText:'text-amber-400',votedBg:'bg-amber-400/20',votedFill:'#fbbf24',votedText:'text-amber-300',
  }:{
    bg:'bg-[#faf9f7]',card:'bg-white',surface:'bg-[#f5f3f0]',border:'border-[#e8e3dc]',text:'text-[#1a1a2e]',muted:'text-[#8a8a9e]',accent:'bg-amber-500',accentText:'text-amber-600',btn:'bg-[#f0ebe4] hover:bg-[#e5ddd4] text-[#2a2a3e]',btnText:'text-white',input:'bg-white border-[#d5cdc4] text-[#1a1a2e] placeholder-[#aaa]',shadow:'shadow-lg shadow-black/5',progBg:'bg-[#e5ddd4]',progFill:'bg-amber-500',hover:'hover:border-amber-500/30',danger:'text-rose-500/60 hover:text-rose-500',completedBg:'bg-emerald-500/15 text-emerald-600',checkDone:'text-emerald-500',checkUndone:'text-[#ccc5bb]',notesBg:'bg-[#f5f3f0]',noteBadge:'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer',tabActive:'bg-amber-500/15 text-amber-700 border-amber-500/30',tabInactive:'text-[#8a8a9e] hover:text-[#5a5a6e]',headerBg:'bg-[#faf9f7]/80',sidebarBg:'bg-white',playerBg:'bg-[#f5f3f0]',voteBtnBg:'bg-[#f5f0ea]',voteBtnHover:'hover:bg-amber-500/15',voteBtnBorder:'border-[#e0d8ce]',voteFill:'#d97706',voteText:'text-amber-600',votedBg:'bg-amber-500/20',votedFill:'#f59e0b',votedText:'text-amber-700',
  }

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setUser(session?.user??null);setLoading(false)});return()=>subscription.unsubscribe()},[])

  const signInGoogle=async()=>{await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}})}
  const signInEmail=async()=>{if(!emailInput.trim())return;setAuthLoading(true);setAuthError('');const{error}=await supabase.auth.signInWithOtp({email:emailInput.trim()});if(error)setAuthError(error.message);else setOtpSent(true);setAuthLoading(false)}
  const verifyOtp=async()=>{if(!otpCode.trim())return;setAuthLoading(true);setAuthError('');const{error}=await supabase.auth.verifyOtp({email:emailInput.trim(),token:otpCode.trim(),type:'email'});if(error)setAuthError(error.message);setAuthLoading(false)}
  const signOut=async()=>{await supabase.auth.signOut();setUser(null)}

  const createCourse=(pub:boolean)=>{if(!inputVal.trim())return;const c:Course={id:uid(),name:inputVal.trim(),modules:[],isPublic:pub};setCourses(p=>[...p,c]);setActiveId(c.id);setModal(null);setInputVal('')}
  const delCourse=(id:string)=>{setCourses(p=>p.filter(c=>c.id!==id));if(activeId===id)setActiveId(null)}
  const addMod=()=>upC(c=>({...c,modules:[...c.modules,{id:uid(),name:`Module ${c.modules.length+1}`,subs:[]}]}))
  const delMod=(id:string)=>upC(c=>({...c,modules:c.modules.filter(m=>m.id!==id)}))
  const moveMod=(i:number,d:number)=>{if(!active)return;const j=i+d;if(j<0||j>=active.modules.length)return;upC(c=>({...c,modules:swap(c.modules,i,j)}))}
  const addSub=(mId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:[...m.subs,{id:uid(),name:`Topic ${m.subs.length+1}`,videos:[]}]}:m)}))
  const delSub=(mId:string,sId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.filter(s=>s.id!==sId)}:m)}))
  const moveSub=(mId:string,i:number,d:number)=>upC(c=>({...c,modules:c.modules.map(m=>{if(m.id!==mId)return m;const j=i+d;if(j<0||j>=m.subs.length)return m;return{...m,subs:swap(m.subs,i,j)}})}))
  const fetchLink=async()=>{if(!inputVal.trim())return;setFetching(true);setPreview(null);setFetchError('');try{const res=await fetch('/api/youtube',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:inputVal.trim()})});const data=await res.json();if(data.error)setFetchError(data.error);else setPreview(data)}catch{setFetchError('Connection error')};setFetching(false)}
  const addVid=()=>{if(!preview||!modal?.mId)return;const v:Video={...preview,iid:uid(),completed:false,notes:[],votes:0,votedBy:[]};upC(c=>({...c,modules:c.modules.map(m=>m.id===modal.mId?{...m,subs:m.subs.map(s=>s.id===modal.sId?{...s,videos:[...s.videos,v]}:s)}:m)}));setModal(null);setInputVal('');setPreview(null)}
  const delVid=(mId:string,sId:string,i:number)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.filter((_,vi)=>vi!==i)}:s)}:m)}))
  const toggleComp=(mId:string,sId:string,vi:number)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,completed:!v.completed}:v)}:s)}:m)}))
  const voteVid=(mId:string,sId:string,vi:number)=>{upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>{if(s.id!==sId)return s;const vids=[...s.videos];const v={...vids[vi]};if(v.votedBy?.includes(userName))return s;v.votes=(v.votes||0)+1;v.votedBy=[...(v.votedBy||[]),userName];vids[vi]=v;vids.sort((a,b)=>(b.votes||0)-(a.votes||0));return{...s,videos:vids}})}:m)}))}
  const moveVid=(mId:string,sId:string,i:number,d:number)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>{if(s.id!==sId)return s;const j=i+d;if(j<0||j>=s.videos.length)return s;return{...s,videos:swap(s.videos,i,j)}})}:m)}))
  const addNote=(mId:string,sId:string,vi:number)=>{if(!noteDesc.trim())return;const minute=noteMin||fmtTime(playerTime);const n:Note={id:uid(),minute,text:noteDesc.slice(0,280),author:userName,authorImg:userImg,ts:Date.now(),isPublic:noteTab==='public'};upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:[...v.notes,n]}:v)}:s)}:m)}));setNoteMin('');setNoteDesc('')}
  const delNote=(mId:string,sId:string,vi:number,nId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:v.notes.filter(n=>n.id!==nId)}:v)}:s)}:m)}))
  const seekTo=(sec:number)=>{try{ytRef.current?.seekTo(sec)}catch{}}
  const captureTime=()=>{try{const t=ytRef.current?.getCurrentTime()||playerTime;setNoteMin(fmtTime(t))}catch{setNoteMin(fmtTime(playerTime))}}
  const startEdit=(id:string,v:string)=>{setEditId(id);setEditVal(v)}
  const doRename=(type:string,mId?:string)=>{if(!editVal.trim()){setEditId(null);return};if(type==='course')setCourses(p=>p.map(c=>c.id===editId?{...c,name:editVal.trim()}:c));else if(type==='mod')upC(c=>({...c,modules:c.modules.map(m=>m.id===editId?{...m,name:editVal.trim()}:m)}));else if(type==='sub')upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===editId?{...s,name:editVal.trim()}:s)}:m)}));setEditId(null)}
  const expandAll=()=>{if(!active)return;const n={...coll};active.modules.forEach(m=>{n[m.id]=false;m.subs.forEach(s=>{n[s.id]=false})});setColl(n)}
  const collapseAll=()=>{if(!active)return;const n={...coll};active.modules.forEach(m=>{n[m.id]=true;m.subs.forEach(s=>{n[s.id]=true})});setColl(n)}

  const TT=()=><button onClick={()=>setDark(!dark)} className={`p-2 rounded-xl ${t.btn} border ${t.border}`}>{dark?'☀️':'🌙'}</button>

  if(loading)return<div className={`min-h-screen ${t.bg} flex items-center justify-center`}><div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/></div>

  // LOGIN
  if(!user)return(
    <div className={`min-h-screen ${t.bg} ${t.text} flex items-center justify-center p-4`}>
      <div className={`${t.card} border ${t.border} rounded-3xl p-8 w-full max-w-sm ${t.shadow} text-center`}>
        <div className={`w-16 h-16 rounded-2xl ${t.accent} flex items-center justify-center mx-auto mb-4`}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={dark?'#07070d':'#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
        <h1 className="text-xl font-extrabold mb-1">Course Architect</h1>
        <p className={`text-sm ${t.muted} mb-5`}>Build courses with YouTube videos</p>
        <div className={`flex rounded-xl border ${t.border} overflow-hidden mb-5`}>
          <button onClick={()=>{setAuthMode('google');setAuthError('')}} className={`flex-1 py-2.5 text-xs font-semibold transition-all ${authMode==='google'?t.tabActive:t.tabInactive}`}>Google</button>
          <button onClick={()=>{setAuthMode('email');setAuthError('')}} className={`flex-1 py-2.5 text-xs font-semibold transition-all ${authMode==='email'?t.tabActive:t.tabInactive}`}>Email</button>
        </div>
        {authMode==='google'?<button onClick={signInGoogle} className={`w-full py-3 rounded-xl text-sm font-bold ${t.accent} ${t.btnText} hover:brightness-110 flex items-center justify-center gap-2`}><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</button>
        :!otpSent?<div className="space-y-3"><input value={emailInput} onChange={e=>setEmailInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&signInEmail()} placeholder="your@email.com" className={`w-full px-4 py-3 rounded-xl border text-sm ${t.input} focus:outline-none focus:ring-2 ring-amber-400/30`}/><button onClick={signInEmail} disabled={!emailInput.trim()||authLoading} className={`w-full py-3 rounded-xl text-sm font-bold ${t.accent} ${t.btnText} disabled:opacity-40`}>{authLoading?'Sending...':'Send login code'}</button></div>
        :<div className="space-y-3"><p className={`text-xs ${t.muted}`}>Code sent to <strong>{emailInput}</strong></p><input value={otpCode} onChange={e=>setOtpCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&verifyOtp()} placeholder="000000" maxLength={6} className={`w-full px-4 py-3 rounded-xl border text-sm text-center tracking-[0.5em] font-mono font-bold ${t.input} focus:outline-none focus:ring-2 ring-amber-400/30`}/><button onClick={verifyOtp} disabled={otpCode.length<6||authLoading} className={`w-full py-3 rounded-xl text-sm font-bold ${t.accent} ${t.btnText} disabled:opacity-40`}>{authLoading?'Verifying...':'Verify'}</button><button onClick={()=>{setOtpSent(false);setOtpCode('')}} className={`text-xs ${t.muted} hover:underline`}>Different email</button></div>}
        {authError&&<p className="text-xs text-rose-400 mt-3">{authError}</p>}
        <div className="mt-5"><TT/></div>
      </div>
    </div>
  )

  // PLAYER
  if(pv&&active){
    const mod=active.modules.find(m=>m.id===pv.mId);const sub=mod?.subs.find(s=>s.id===pv.sId);const vid=sub?.videos[pv.vi]
    if(!vid){setPV(null);return null}
    const goTo=(vi:number)=>{setPV((p:any)=>({...p,vi}));setPlayerTime(0);setNoteMin('')}
    const hasVoted=vid.votedBy?.includes(userName)
    const filteredNotes=vid.notes.filter(n=>noteTab==='public'?n.isPublic:n.author===userName)
    return(
      <div className={`min-h-screen ${t.playerBg} ${t.text}`}>
        <div className={`border-b ${t.border} px-4 py-2.5 flex items-center gap-3 ${t.headerBg} backdrop-blur-xl sticky top-0 z-20`}>
          <button onClick={()=>setPV(null)} className={`text-xs ${t.muted} hover:underline`}>← Back</button>
          <span className={`text-[10px] ${t.muted} hidden sm:block truncate`}>{active.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={()=>{if(pv.vi>0)goTo(pv.vi-1)}} disabled={pv.vi===0} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.accent} ${t.btnText} disabled:opacity-30`}>← Prev</button>
            <span className={`text-[10px] ${t.muted} px-1 hidden md:block`}>{mod?.name} › {sub?.name}</span>
            <button onClick={()=>{if(sub&&pv.vi<sub.videos.length-1)goTo(pv.vi+1)}} disabled={!sub||pv.vi>=sub.videos.length-1} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.accent} ${t.btnText} disabled:opacity-30`}>Next →</button>
            <TT/>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-4 sm:p-6 max-w-4xl">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-video mb-4">
              <YouTubePlayer ref={ytRef} videoId={vid.id} onTimeUpdate={setPlayerTime}/>
            </div>
            <p className={`text-[10px] ${t.muted} mb-1`}>{active.name} › {mod?.name} › {sub?.name}</p>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-bold leading-snug">{vid.title}</h2>
                <div className="flex items-center gap-3 mt-2">{vid.channelImg&&<img src={vid.channelImg} alt="" className="w-9 h-9 rounded-full"/>}<div><p className="text-sm font-semibold">{vid.channel}</p>{vid.subscribers&&<p className={`text-[11px] ${t.muted}`}>{vid.subscribers} subscribers</p>}</div></div>
                <div className={`flex items-center gap-4 text-xs ${t.muted} mt-2`}><span>{vid.views} views</span><span>{vid.likes} likes</span><span>{vid.duration}</span></div>
              </div>
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                <button onClick={()=>toggleComp(pv.mId,pv.sId,pv.vi)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${vid.completed?t.completedBg:`${t.btn} border ${t.border}`}`}>{vid.completed?'✓ Completed':'○ Complete'}</button>
                <VoteBtn votes={vid.votes} voted={hasVoted} onVote={()=>voteVid(pv.mId,pv.sId,pv.vi)} t={t}/>
              </div>
            </div>
            {/* Notes */}
            <div className={`${t.card} border ${t.border} rounded-2xl p-4 ${t.shadow}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">📝 Notes</h3>
                <div className={`flex rounded-lg border ${t.border} overflow-hidden`}>
                  <button onClick={()=>setNoteTab('public')} className={`px-3 py-1 text-[10px] font-semibold transition-all ${noteTab==='public'?t.tabActive:t.tabInactive}`}>🌐 Public</button>
                  <button onClick={()=>setNoteTab('mine')} className={`px-3 py-1 text-[10px] font-semibold transition-all ${noteTab==='mine'?t.tabActive:t.tabInactive}`}>👤 Mine</button>
                </div>
              </div>
              <div className="flex gap-2 mb-3 items-end">
                <button onClick={()=>setNumpad(true)} className={`px-3 py-2.5 rounded-xl border text-xs font-mono ${t.input} min-w-[90px] text-center cursor-pointer flex items-center justify-center gap-1.5`}>⏱ {noteMin||fmtTime(playerTime)}</button>
                <div className="flex-1 relative">
                  <input value={noteDesc} onChange={e=>setNoteDesc(e.target.value.slice(0,280))} placeholder="Write a note..." className={`w-full px-3 py-2.5 rounded-xl border text-xs ${t.input} focus:outline-none focus:ring-2 ring-amber-400/30 pr-16`} onKeyDown={e=>{if(e.key==='Enter')addNote(pv.mId,pv.sId,pv.vi)}}/>
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] tabular-nums ${noteDesc.length>=260?'text-rose-400':t.muted}`}>{noteDesc.length}/280</span>
                </div>
                <button onClick={()=>addNote(pv.mId,pv.sId,pv.vi)} disabled={!noteDesc.trim()} className={`px-4 py-2.5 rounded-xl text-xs font-bold ${t.accent} ${t.btnText} disabled:opacity-40`}>Add</button>
              </div>
              {filteredNotes.length===0?<p className={`text-xs ${t.muted} text-center py-6`}>{noteTab==='public'?'No public notes yet':'You have no notes'}</p>:(
                <div className="space-y-2 max-h-72 overflow-y-auto" style={{scrollbarWidth:'thin'}}>
                  {filteredNotes.map(n=>(
                    <div key={n.id} className={`flex items-start gap-2.5 p-3 rounded-xl ${t.notesBg} group`}>
                      {n.authorImg?<img src={n.authorImg} alt="" className="w-7 h-7 rounded-full flex-shrink-0"/>:<div className={`w-7 h-7 rounded-full ${t.surface} border ${t.border} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>{n.author[0]?.toUpperCase()}</div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5"><span className="text-[11px] font-bold">{n.author}</span>{n.minute&&<button onClick={()=>seekTo(timeToSec(n.minute))} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${t.noteBadge} transition-all`}>{n.minute}</button>}</div>
                        <p className="text-xs leading-relaxed">{n.text}</p>
                      </div>
                      {n.author===userName&&<button onClick={()=>delNote(pv.mId,pv.sId,pv.vi,n.id)} className={`p-1 rounded opacity-0 group-hover:opacity-70 ${t.danger} text-xs`}>✕</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Sidebar */}
          <div className={`w-full lg:w-80 ${t.sidebarBg} border-l ${t.border} lg:h-screen lg:sticky lg:top-0 overflow-y-auto`} style={{scrollbarWidth:'thin'}}>
            <div className={`p-3 border-b ${t.border}`}><p className="text-xs font-bold">{sub?.name}</p><p className={`text-[10px] ${t.muted}`}>{sub?.videos.length} videos · {fmtS(subDur(sub!))}</p>{sub&&<PBar done={subComp(sub)} total={sub.videos.length} t={t}/>}</div>
            <div className="p-2 space-y-1">
              {sub?.videos.map((sv,svi)=>(
                <div key={sv.iid} onClick={()=>goTo(svi)} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${svi===pv.vi?`${t.tabActive} border ${t.border}`:`${t.hover}`}`}>
                  <button onClick={e=>{e.stopPropagation();toggleComp(pv.mId,pv.sId,svi)}} className="flex-shrink-0 text-base">{sv.completed?<span className={t.checkDone}>✓</span>:<span className={t.checkUndone}>○</span>}</button>
                  <img src={sv.thumbnail} alt="" className="w-20 h-11 object-cover rounded-lg flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold leading-snug line-clamp-2">{sv.title}</p>
                    <div className={`flex items-center gap-2 text-[9px] ${t.muted} mt-0.5`}>
                      <span>{sv.duration}</span>
                      <span>{sv.viewsShort||sv.views} views</span>
                      {(sv.votes||0)>0&&<span className={`font-bold ${t.accentText}`}>▲{sv.votes}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {numpad&&<NumpadModal value={noteMin} onChange={setNoteMin} onClose={()=>setNumpad(false)} onCapture={captureTime} currentTime={fmtTime(playerTime)} t={t}/>}
      </div>
    )
  }

  // COURSE EDITOR
  if(active)return(
    <div className={`min-h-screen ${t.bg} ${t.text}`}>
      <header className={`border-b ${t.border} ${t.headerBg} backdrop-blur-xl sticky top-0 z-20`}><div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>setActiveId(null)}><div className={`w-8 h-8 rounded-xl ${t.accent} flex items-center justify-center`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark?'#07070d':'#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><span className="text-sm font-bold">Course Architect</span></div><div className="flex items-center gap-2">{userImg&&<img src={userImg} alt="" className="w-7 h-7 rounded-full"/>}<TT/><button onClick={signOut} className={`text-[10px] ${t.muted} hover:underline`}>Logout</button></div></div></header>
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><button onClick={()=>setActiveId(null)} className={`text-xs ${t.muted} mb-1`}>← Dashboard</button><h2 className="text-xl font-extrabold">{active.name}</h2></div><div className="flex items-center gap-3"><span className={`text-[11px] ${t.muted}`}>{active.modules.length} mod · {cVC(active)} vid · {fmtS(cDur(active))}</span><button onClick={expandAll} className={`p-2 rounded-xl ${t.btn} border ${t.border}`}>⬇</button><button onClick={collapseAll} className={`p-2 rounded-xl ${t.btn} border ${t.border}`}>⬆</button></div></div>
        {cVC(active)>0&&<div className={`${t.card} border ${t.border} rounded-xl p-3 ${t.shadow}`}><div className="flex justify-between mb-1.5"><span className="text-xs font-semibold">Progress</span><span className={`text-[11px] ${t.muted}`}>{cComp(active)}/{cVC(active)}</span></div><PBar done={cComp(active)} total={cVC(active)} t={t}/></div>}
        {active.modules.length===0?<div className={`border-2 border-dashed ${t.border} rounded-2xl py-20 flex flex-col items-center ${t.muted}`}><p>Empty course</p><button onClick={addMod} className={`mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold ${t.accent} ${t.btnText}`}>+ Add Module</button></div>
        :active.modules.map((mod,mi)=>(
          <div key={mod.id} className={`${t.card} border ${t.border} rounded-2xl overflow-hidden ${t.shadow}`}>
            <div className={`group flex items-center gap-2.5 px-4 py-3 ${t.surface} border-b ${t.border}`}>
              <button onClick={()=>togColl(mod.id)} className={`p-1.5 rounded-lg ${t.btn} text-sm`}>{coll[mod.id]?'▶':'▼'}</button>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-amber-400/10 ${t.accentText}`}>{mi+1}</span>
              {editId===mod.id?<span className="flex items-center gap-1.5 flex-1"><input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doRename('mod')}} className={`flex-1 px-2 py-1 rounded-lg text-sm border ${t.input} focus:outline-none`}/><button onClick={()=>doRename('mod')} className="text-emerald-400">✓</button><button onClick={()=>setEditId(null)} className="text-rose-400">✕</button></span>
              :<span className="flex-1 text-sm font-bold truncate cursor-pointer" onDoubleClick={()=>startEdit(mod.id,mod.name)}>{mod.name}</span>}
              <span className={`text-[10px] ${t.muted} px-2.5 py-1 rounded-full bg-amber-400/5`}>{mod.subs.reduce((a,s)=>a+s.videos.length,0)} vid · {fmtS(modDur(mod))}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-80 transition-opacity"><button onClick={()=>moveMod(mi,-1)} disabled={mi===0} className={`p-2 rounded-xl ${t.btn} disabled:opacity-20`}>↑</button><button onClick={()=>moveMod(mi,1)} disabled={mi===active.modules.length-1} className={`p-2 rounded-xl ${t.btn} disabled:opacity-20`}>↓</button><button onClick={()=>startEdit(mod.id,mod.name)} className={`p-2 rounded-xl ${t.btn}`}>✎</button><button onClick={()=>delMod(mod.id)} className={`p-2 rounded-xl ${t.danger}`}>✕</button></div>
            </div>
            {!coll[mod.id]&&<div className="p-3 space-y-2">
              {mod.subs.reduce((a,s)=>a+s.videos.length,0)>0&&<div className="px-1 pb-1"><PBar done={modComp(mod)} total={mod.subs.reduce((a,s)=>a+s.videos.length,0)} t={t}/></div>}
              {mod.subs.map((sub,si)=>(
                <div key={sub.id} className={`border ${t.border} rounded-xl overflow-hidden`}>
                  <div className={`group flex items-center gap-2 px-3 py-2.5 ${t.surface}`}>
                    <button onClick={()=>togColl(sub.id)} className={`p-1 rounded-lg ${t.btn} text-xs`}>{coll[sub.id]?'▶':'▼'}</button>
                    <span className={`${t.muted} text-xs`}>#</span>
                    {editId===sub.id?<span className="flex items-center gap-1 flex-1"><input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doRename('sub',mod.id)}} className={`flex-1 px-2 py-0.5 rounded-lg text-xs border ${t.input} focus:outline-none`}/><button onClick={()=>doRename('sub',mod.id)} className="text-emerald-400 text-xs">✓</button><button onClick={()=>setEditId(null)} className="text-rose-400 text-xs">✕</button></span>
                    :<span className="flex-1 text-xs font-semibold truncate cursor-pointer" onDoubleClick={()=>startEdit(sub.id,sub.name)}>{sub.name}</span>}
                    <span className={`text-[10px] ${t.muted} px-2 py-0.5 rounded-full bg-amber-400/5`}>{sub.videos.length} · {fmtS(subDur(sub))}</span>
                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-80 transition-opacity">
                      <button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className={`p-2 rounded-xl bg-amber-400/10 ${t.accentText}`}>+</button>
                      <button onClick={()=>startEdit(sub.id,sub.name)} className={`p-2 rounded-xl ${t.btn}`}>✎</button>
                      <button onClick={()=>moveSub(mod.id,si,-1)} disabled={si===0} className={`p-2 rounded-xl ${t.btn} disabled:opacity-20`}>↑</button>
                      <button onClick={()=>moveSub(mod.id,si,1)} disabled={si===mod.subs.length-1} className={`p-2 rounded-xl ${t.btn} disabled:opacity-20`}>↓</button>
                      <button onClick={()=>delSub(mod.id,sub.id)} className={`p-2 rounded-xl ${t.danger}`}>✕</button>
                    </div>
                  </div>
                  {!coll[sub.id]&&<div className="p-2 space-y-1.5">
                    {sub.videos.length>0&&<div className="px-1 pb-1"><PBar done={subComp(sub)} total={sub.videos.length} t={t}/></div>}
                    {sub.videos.length===0?<div className={`border-2 border-dashed ${t.border} rounded-xl py-6 flex flex-col items-center ${t.muted}`}><p className="text-[11px]">Paste a YouTube link</p><button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className={`mt-2 text-[11px] font-semibold ${t.accentText}`}>+ Add video</button></div>
                    :<>{sub.videos.map((v,vi)=>(
                      <div key={v.iid} className={`group/v flex items-center gap-2.5 p-2.5 rounded-xl border ${t.border} ${t.hover} transition-all`}>
                        <button onClick={()=>toggleComp(mod.id,sub.id,vi)} className="flex-shrink-0 text-lg">{v.completed?<span className={t.checkDone}>✓</span>:<span className={t.checkUndone}>○</span>}</button>
                        <div className="relative flex-shrink-0 w-24 sm:w-28 cursor-pointer" onClick={()=>setPV({mId:mod.id,sId:sub.id,vi})}><img src={v.thumbnail} alt="" className="w-full h-14 sm:h-16 object-cover rounded-lg"/><div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"><span className="text-white text-xl">▶</span></div><span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[7px] px-1 py-0.5 rounded">{v.duration}</span></div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>setPV({mId:mod.id,sId:sub.id,vi})}>
                          <p className={`text-[11px] font-semibold leading-snug line-clamp-2 ${v.completed?'opacity-50':''}`}>{v.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">{v.channelImg&&<img src={v.channelImg} alt="" className="w-3.5 h-3.5 rounded-full"/>}<span className={`text-[9px] ${t.muted}`}>{v.channel}</span>{v.subscribers&&<span className={`text-[8px] ${t.muted}`}>· {v.subscribers}</span>}</div>
                          <div className={`flex items-center gap-2 text-[8px] ${t.muted} mt-0.5`}><span>{v.viewsShort||v.views} views</span><span>{v.likesShort||v.likes} likes</span></div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0 items-center">
                          <VoteBtn votes={v.votes} voted={v.votedBy?.includes(userName)} onVote={()=>voteVid(mod.id,sub.id,vi)} t={t}/>
                          <div className="flex gap-0.5 opacity-0 group-hover/v:opacity-80 transition-opacity"><button onClick={()=>moveVid(mod.id,sub.id,vi,-1)} disabled={vi===0} className={`p-1.5 rounded-lg ${t.btn} disabled:opacity-20 text-xs`}>↑</button><button onClick={()=>moveVid(mod.id,sub.id,vi,1)} disabled={vi===sub.videos.length-1} className={`p-1.5 rounded-lg ${t.btn} disabled:opacity-20 text-xs`}>↓</button><button onClick={()=>delVid(mod.id,sub.id,vi)} className={`p-1.5 rounded-lg ${t.danger} text-xs`}>✕</button></div>
                        </div>
                      </div>
                    ))}<button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className={`w-full py-2.5 rounded-xl border border-dashed ${t.border} ${t.muted} text-[11px] font-medium ${t.hover}`}>+ Add video</button></>}
                  </div>}
                </div>
              ))}
              <button onClick={()=>addSub(mod.id)} className={`w-full py-2.5 rounded-xl border border-dashed ${t.border} ${t.muted} text-xs font-medium ${t.hover}`}>+ New topic</button>
            </div>}
          </div>
        ))}
        {active.modules.length>0&&<button onClick={addMod} className={`w-full py-3.5 rounded-2xl border-2 border-dashed ${t.border} ${t.muted} text-sm font-semibold ${t.hover}`}>+ Add module</button>}
      </div>
      {modal?.type==='addVideo'&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setModal(null)}><div className={`${t.card} border ${t.border} rounded-2xl w-full max-w-lg ${t.shadow}`} onClick={e=>e.stopPropagation()}><div className={`px-5 py-4 border-b ${t.border} flex items-center justify-between`}><h3 className="text-sm font-bold">🔗 Add YouTube Video</h3><button onClick={()=>setModal(null)} className={t.muted}>✕</button></div><div className="p-5 space-y-4"><div className="flex gap-2"><input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchLink()} placeholder="https://youtube.com/watch?v=..." className={`flex-1 px-4 py-3 rounded-xl border text-sm ${t.input} focus:outline-none focus:ring-2 ring-amber-400/30`}/><button onClick={fetchLink} disabled={!inputVal.trim()||fetching} className={`px-4 rounded-xl text-xs font-bold ${t.accent} ${t.btnText} disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0`}>{fetching?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Fetch'}</button></div>{fetchError&&<p className="text-xs text-rose-400">{fetchError}</p>}{preview&&<div className={`${t.surface} border ${t.border} rounded-xl overflow-hidden`}><img src={preview.thumbnail} alt="" className="w-full h-44 object-cover"/><div className="p-3.5"><h4 className="text-sm font-semibold leading-snug line-clamp-2">{preview.title}</h4><div className="flex items-center gap-2 mt-2">{preview.channelImg&&<img src={preview.channelImg} alt="" className="w-6 h-6 rounded-full"/>}<div><span className="text-xs font-medium">{preview.channel}</span>{preview.subscribers&&<p className={`text-[9px] ${t.muted}`}>{preview.subscribers} subscribers</p>}</div></div><div className={`flex items-center gap-4 text-[11px] ${t.muted} mt-2`}><span>{preview.views} views</span><span>{preview.likes} likes</span><span>{preview.duration}</span></div></div></div>}<div className="flex justify-end gap-2"><button onClick={()=>setModal(null)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${t.btn} border ${t.border}`}>Cancel</button><button onClick={addVid} disabled={!preview} className={`px-5 py-2.5 rounded-xl text-xs font-bold ${t.accent} ${t.btnText} disabled:opacity-40`}>Add</button></div></div></div></div>}
    </div>
  )

  // DASHBOARD
  return(
    <div className={`min-h-screen ${t.bg} ${t.text}`}>
      <header className={`border-b ${t.border} ${t.headerBg} backdrop-blur-xl`}><div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-xl ${t.accent} flex items-center justify-center`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark?'#07070d':'#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><span className="text-sm font-bold">Course Architect</span></div><div className="flex items-center gap-3">{userImg&&<img src={userImg} alt="" className="w-7 h-7 rounded-full"/>}<span className={`text-xs ${t.muted} hidden sm:block`}>{userName}</span><TT/><button onClick={signOut} className={`text-[10px] ${t.muted} hover:underline`}>Logout</button></div></div></header>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div><h2 className="text-lg font-extrabold mb-4">My Courses</h2>
          {courses.length>0?<div className="space-y-3 mb-4">{courses.map(c=><div key={c.id} onClick={()=>setActiveId(c.id)} className={`group ${t.card} border ${t.border} rounded-xl p-4 cursor-pointer ${t.hover} transition-all ${t.shadow}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 ${t.accentText} text-lg`}>📚</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold truncate">{c.name}</p><span className={`text-[9px] ${t.muted}`}>{c.isPublic?'🌐':'🔒'}</span></div><p className={`text-[11px] ${t.muted}`}>{c.modules.length} modules · {cVC(c)} videos · {fmtS(cDur(c))}</p></div><button onClick={e=>{e.stopPropagation();delCourse(c.id)}} className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 ${t.danger}`}>✕</button></div>{cVC(c)>0&&<div className="mt-2"><PBar done={cComp(c)} total={cVC(c)} t={t}/></div>}</div>)}</div>
          :<div className={`${t.card} border ${t.border} rounded-2xl p-8 text-center ${t.shadow} mb-4`}><div className="text-4xl mb-3">🎓</div><h3 className="font-bold mb-1">Welcome to Course Architect!</h3><p className={`text-xs ${t.muted} max-w-md mx-auto`}>Create your first course by organizing YouTube videos into modules and topics.</p></div>}
          <button onClick={()=>{setModal('newCourse');setInputVal('')}} className={`w-full py-3.5 rounded-2xl text-sm font-bold ${t.accent} ${t.btnText} hover:brightness-110 ${t.shadow}`}>+ Create New Course</button>
        </div>
        <div><h2 className="text-lg font-extrabold mb-4">🔥 Trending</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[{i:'⚛️',n:'Full Stack React 2025',s:'3 mod · 24 vid · 18h'},{i:'🐍',n:'Python Data Science',s:'5 mod · 42 vid · 32h'},{i:'🐳',n:'DevOps from Zero',s:'4 mod · 31 vid · 22h'},{i:'🎨',n:'UI/UX Masterclass',s:'6 mod · 38 vid · 28h'}].map((tr,i)=><div key={i} className={`${t.card} border ${t.border} rounded-xl p-4 ${t.shadow} ${t.hover}`}><div className="flex items-center gap-2 mb-2"><span className="text-2xl">{tr.i}</span><div><p className="text-xs font-bold">{tr.n}</p><p className={`text-[10px] ${t.muted}`}>Community</p></div></div><p className={`text-[10px] ${t.muted}`}>{tr.s}</p></div>)}</div></div>
        <div className={`${t.card} border ${t.border} rounded-2xl p-6 ${t.shadow}`}><h3 className="text-sm font-bold mb-3">🚀 Getting Started</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[{e:'1️⃣',t:'Create a course',d:'Give it a name, public or private.'},{e:'2️⃣',t:'Add modules & topics',d:'Organize into sections.'},{e:'3️⃣',t:'Paste YouTube links',d:'Real video data loads automatically.'}].map((s,i)=><div key={i} className={`p-4 rounded-xl ${t.surface} border ${t.border}`}><div className="text-2xl mb-2">{s.e}</div><p className="text-xs font-semibold">{s.t}</p><p className={`text-[10px] ${t.muted} mt-1`}>{s.d}</p></div>)}</div></div>
      </div>
      {modal==='newCourse'&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setModal(null)}><div className={`${t.card} border ${t.border} rounded-2xl w-full max-w-md ${t.shadow}`} onClick={e=>e.stopPropagation()}><div className={`px-5 py-4 border-b ${t.border} flex items-center justify-between`}><h3 className="text-sm font-bold">📚 New Course</h3><button onClick={()=>setModal(null)} className={t.muted}>✕</button></div><div className="p-5 space-y-4"><input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createCourse(true)} placeholder="Course name..." className={`w-full px-4 py-3 rounded-xl border text-sm ${t.input} focus:outline-none focus:ring-2 ring-amber-400/30`}/><div className="flex justify-end gap-2"><button onClick={()=>createCourse(false)} disabled={!inputVal.trim()} className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${t.btn} border ${t.border} disabled:opacity-40`}>🔒 Private</button><button onClick={()=>createCourse(true)} disabled={!inputVal.trim()} className={`px-5 py-2.5 rounded-xl text-xs font-bold ${t.accent} ${t.btnText} disabled:opacity-40`}>🌐 Public</button></div></div></div></div>}
    </div>
  )
}
