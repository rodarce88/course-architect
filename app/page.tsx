'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import * as sync from '@/lib/useSupabaseSync'
import dynamic from 'next/dynamic'
import { formatDistanceToNow } from 'date-fns'
const YouTubePlayer = dynamic(() => import('@/components/YouTubePlayer'), { ssr: false })

type Video={id:string;iid:string;title:string;thumbnail:string;channel:string;channelImg:string;subscribers:string;views:string;viewsShort?:string;likes:string;likesShort?:string;duration:string;url:string;completed:boolean;notes:Note[];votes:number;votedBy:string[];createdAt?:number;lastPosition?:number}
type Note={id:string;minute:string;text:string;author:string;authorHandle:string;authorImg:string;ts:number;isPublic:boolean;reactions:Record<string,string[]>}
type Sub={id:string;name:string;videos:Video[];createdAt:number}
type Mod={id:string;name:string;subs:Sub[];createdAt:number}
type Course={id:string;name:string;description:string;modules:Mod[];isPublic:boolean;active:boolean;owner:string;ownerHandle:string;ownerImg:string;coverImg:string;category:string;enrolledBy:string[];shareCode:string;createdAt:number}

const CATEGORIES=['Programming','Web Development','Data Science','AI & Machine Learning','Mobile Development','DevOps','Cybersecurity','Game Development','UI/UX Design','Digital Marketing','Photography','Video Editing','Music Production','3D Modeling','Finance','Language Learning','Cooking','Fitness','Business','Personal Development']
const AVATARS=[{id:"galileo-1",name:"Galileo I",src:"/avatars/galileo-1.jpeg"},{id:"galileo-2",name:"Galileo II",src:"/avatars/galileo-2.jpeg"},{id:"galileo-3",name:"Galileo III",src:"/avatars/galileo-3.jpeg"},{id:"galileo-4",name:"Galileo IV",src:"/avatars/galileo-4.jpeg"},{id:"davinci-1",name:"Da Vinci I",src:"/avatars/davinci-1.jpeg"},{id:"davinci-2",name:"Da Vinci II",src:"/avatars/davinci-2.jpeg"},{id:"davinci-3",name:"Da Vinci III",src:"/avatars/davinci-3.jpeg"}]
const REACTION_EMOJIS=Array.from({length:50},(_,i)=>`emoji_${i+1}`)

let _c=0;const uid=()=>`u${++_c}${Date.now()}`;const swap=(a:any[],i:number,j:number)=>{const n=[...a];[n[i],n[j]]=[n[j],n[i]];return n}
const genCode=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let r='';for(let i=0;i<3;i++)r+=c[Math.floor(Math.random()*c.length)];r+='-';for(let i=0;i<3;i++)r+=c[Math.floor(Math.random()*c.length)];return r}
const ago=(ts:number)=>{try{return formatDistanceToNow(ts,{addSuffix:true})}catch{return''}}
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

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const RED='#FF0000'
// surface: #f5f7f9, card: #ffffff, text: #2c2f31, muted: #595c5e

// ─── SHARED COMPONENTS ───────────────────────────────────────────

function AppHeader({onHome,userHandle,userImg,onProfile,onSignOut}:{onHome:()=>void;userHandle:string;userImg:string;onProfile:()=>void;onSignOut:()=>void}){
  return(
    <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-200/40 border-b border-slate-200/30">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
        <div className="w-8 h-8 bg-[#FF0000] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <span className="text-xl font-black text-slate-900 tracking-tighter">Course Architect</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onProfile} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold text-[#FF0000] tracking-tight">arc/{userHandle}</span>
          {userImg
            ? <img src={userImg} alt="" className="w-9 h-9 rounded-full border-2 border-red-100 object-cover"/>
            : <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-xs font-black text-[#FF0000]">{userHandle[0]?.toUpperCase()}</div>
          }
        </button>
        <button onClick={onSignOut} className="text-[11px] font-bold text-slate-400 hover:text-[#FF0000] transition-colors uppercase tracking-wider">Out</button>
      </div>
    </header>
  )
}

function BottomNav({active}:{active:'home'|'courses'|'vault'}){
  return(
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-md border-t border-slate-200/40 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] z-50">
      {[
        {id:'home',label:'Home',icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
        {id:'courses',label:'My Courses',icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>},
        {id:'vault',label:'NoteVault',icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>},
      ].map(item=>(
        <div key={item.id} className={`flex flex-col items-center gap-1 transition-all ${active===item.id?'text-[#FF0000]':'text-slate-400'}`}>
          {item.icon}
          <span className="text-[10px] font-black uppercase tracking-[0.05em]">{item.label}</span>
          {active===item.id&&<div className="w-1 h-1 rounded-full bg-[#FF0000]"/>}
        </div>
      ))}
    </nav>
  )
}

function PBar({done,total}:{done:number;total:number}){
  const p=total===0?0:Math.round(done/total*100)
  return(
    <div className="flex items-center gap-2.5 w-full">
      <div className="flex-1 h-1 rounded-full bg-[#eef1f3] overflow-hidden">
        <div className={`h-1 rounded-full transition-all duration-700 ${p===100?'bg-emerald-500':'bg-[#FF0000]'}`} style={{width:`${p}%`}}/>
      </div>
      <span className={`text-[10px] font-black tabular-nums uppercase tracking-wider ${p===100?'text-emerald-500':'text-slate-400'}`}>{p}%</span>
    </div>
  )
}

function VotePill({score,voted,onUp,onDown,compact=false,disabled=false}:{score:number;voted:string;onUp:()=>void;onDown:()=>void;compact?:boolean;disabled?:boolean}){
  if(disabled){
    return(
      <div className="flex flex-col items-center gap-0.5 relative group/vote" onClick={e=>e.stopPropagation()}>
        <div className={`flex flex-col items-center ${compact?'gap-0':'gap-1 bg-[#eef1f3] rounded-2xl px-2 py-2'} opacity-40`}>
          <svg width={compact?14:18} height={compact?14:18} viewBox="0 0 16 16" fill="#cbd5e1"><path d="M8 ${compact?3:2}L${compact?13:14} 9H${compact?3:2}L8 ${compact?3:2}Z"/></svg>
          <span className={`${compact?'text-[9px]':'text-sm'} font-black tabular-nums text-slate-400`}>{score}</span>
          <svg width={compact?14:18} height={compact?14:18} viewBox="0 0 16 16" fill="#cbd5e1"><path d="M8 ${compact?13:14}L${compact?3:2} 7H${compact?13:14}L8 ${compact?13:14}Z"/></svg>
        </div>
        <span className="text-[8px] font-black text-slate-400">15%</span>
      </div>
    )
  }
  if(compact) return(
    <div className="flex flex-col items-center gap-0" onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();onUp()}} className={`p-0.5 transition-colors ${voted==='up'?'text-[#FF0000]':'text-slate-300 hover:text-[#FF0000]'}`}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3L13 9H3L8 3Z"/></svg>
      </button>
      <span className={`text-[9px] font-black tabular-nums ${voted==='up'?'text-[#FF0000]':voted==='down'?'text-blue-500':'text-slate-400'}`}>{score}</span>
      <button onClick={e=>{e.stopPropagation();onDown()}} className={`p-0.5 transition-colors ${voted==='down'?'text-blue-500':'text-slate-300 hover:text-blue-500'}`}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 13L3 7H13L8 13Z"/></svg>
      </button>
    </div>
  )
  return(
    <div className="flex flex-col items-center gap-1 bg-[#eef1f3] rounded-2xl px-2 py-2" onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();onUp()}} className={`p-1 rounded-xl transition-colors ${voted==='up'?'text-[#FF0000] bg-red-50':'text-slate-400 hover:text-[#FF0000]'}`}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 9H2L8 2Z"/></svg>
      </button>
      <span className={`text-sm font-black tabular-nums ${voted==='up'?'text-[#FF0000]':voted==='down'?'text-blue-500':'text-slate-700'}`}>{score}</span>
      <button onClick={e=>{e.stopPropagation();onDown()}} className={`p-1 rounded-xl transition-colors ${voted==='down'?'text-blue-500 bg-blue-50':'text-slate-400 hover:text-blue-500'}`}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14L2 7H14L8 14Z"/></svg>
      </button>
    </div>
  )
}

function InfoTooltip({children,content}:{children:React.ReactNode;content:string}){
  const[show,setShow]=useState(false)
  return(
    <div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show&&<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#2c2f31] text-white text-[10px] rounded-xl whitespace-nowrap z-50 shadow-xl font-medium">{content}</div>}
    </div>
  )
}

function NumpadModal({value,onChange,onClose,onCapture,currentTime}:{value:string;onChange:(v:string)=>void;onClose:()=>void;onCapture:()=>void;currentTime:string}){
  const[raw,setRaw]=useState(value.replace(/:/g,''))
  const fmt=(r:string)=>{const d=r.replace(/\D/g,'');if(d.length<=2)return d;if(d.length<=4)return d.slice(0,-2)+':'+d.slice(-2);return d.slice(0,-4)+':'+d.slice(-4,-2)+':'+d.slice(-2)}
  const press=(n:string)=>{if(raw.length>=6)return;const next=raw+n;setRaw(next);onChange(fmt(next))}
  const del=()=>{const next=raw.slice(0,-1);setRaw(next);onChange(next?fmt(next):'')}
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-64 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="text-center py-3 mb-3 rounded-2xl bg-[#f5f7f9] text-2xl font-black font-mono text-[#2c2f31]">{value||'0:00'}</div>
        <button onClick={()=>{onCapture();onClose()}} className="w-full mb-3 py-2.5 rounded-xl text-xs font-black border border-[#eef1f3] bg-[#f5f7f9] hover:bg-[#eef1f3] text-slate-600 uppercase tracking-wider">⏱ Capture ({currentTime})</button>
        <div className="grid grid-cols-3 gap-1.5">
          {['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} onClick={()=>press(n)} className="py-3 rounded-xl text-base font-black bg-[#f5f7f9] hover:bg-[#eef1f3] active:scale-95 text-[#2c2f31]">{n}</button>)}
          <button onClick={()=>{setRaw('');onChange('')}} className="py-3 rounded-xl text-xs font-black text-[#FF0000] bg-red-50">CLR</button>
          <button onClick={()=>press('0')} className="py-3 rounded-xl text-base font-black bg-[#f5f7f9] hover:bg-[#eef1f3] text-[#2c2f31]">0</button>
          <button onClick={del} className="py-3 rounded-xl text-sm font-black bg-[#f5f7f9] hover:bg-[#eef1f3] text-[#2c2f31]">⌫</button>
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-xl text-sm font-black bg-[#FF0000] text-white">Done</button>
      </div>
    </div>
  )
}

function DeleteModal({name,onConfirm,onClose}:{name:string;onConfirm:()=>void;onClose:()=>void}){
  const[input,setInput]=useState('')
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto"><span className="text-2xl">⚠️</span></div>
          <h3 className="text-base font-black text-[#2c2f31] text-center">Are you absolutely sure?</h3>
          <p className="text-xs text-slate-500 text-center leading-relaxed">This action cannot be undone. All data for <strong>"{name}"</strong> will be permanently deleted.</p>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1.5 uppercase tracking-wider">Type <strong className="text-[#FF0000]">DELETE</strong> to confirm</label>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="DELETE" className="w-full px-3 py-2.5 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-sm text-[#2c2f31] font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-200"/>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-[#f5f7f9] border border-[#eef1f3]">Cancel</button>
            <button onClick={onConfirm} disabled={input!=='DELETE'} className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-30 hover:bg-red-700">Delete Permanently</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareModal({course,onClose}:{course:Course;onClose:()=>void}){
  const[copied,setCopied]=useState('')
  const link=typeof window!=='undefined'?`${window.location.origin}?c=${course.id}`:''
  const copy=(t:string,l:string)=>{navigator.clipboard.writeText(t);setCopied(l);setTimeout(()=>setCopied(''),2000)}
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
          <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">Share Course</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1.5 uppercase tracking-wider">Course Link</label>
            <div className="flex gap-2">
              <input readOnly value={link} className="flex-1 px-3 py-2 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs text-slate-600"/>
              <button onClick={()=>copy(link,'link')} className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${copied==='link'?'bg-emerald-500 text-white':'bg-[#FF0000] text-white'}`}>{copied==='link'?'✓':'Copy'}</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1.5 uppercase tracking-wider">Course Code</label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-[#2c2f31] tracking-widest bg-[#f5f7f9] border border-[#eef1f3] px-4 py-2 rounded-xl">{course.shareCode}</span>
              <button onClick={()=>copy(course.shareCode,'code')} className={`px-3 py-2 rounded-xl text-xs font-black ${copied==='code'?'bg-emerald-500 text-white':'bg-[#eef1f3] text-slate-600'}`}>{copied==='code'?'✓':'Copy'}</button>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${course.name}" on Course Architect! ${link}`)}`} target="_blank" className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#2c2f31] text-white text-center">𝕏 Post</a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#0077B5] text-white text-center">LinkedIn</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function HandleModal({onSave}:{onSave:(h:string)=>void}){
  const[h,setH]=useState('')
  const valid=h.length>=3&&/^[a-zA-Z0-9_]+$/.test(h)
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#f5f7f9] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FF0000] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h3 className="text-xl font-black text-[#2c2f31] tracking-tight">Choose your handle</h3>
          <p className="text-xs text-slate-500 mt-1">This is how the world will know you</p>
        </div>
        <div className="flex items-center gap-0 border border-[#eef1f3] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-200 bg-[#f5f7f9]">
          <span className="px-3 py-3 text-sm font-black text-[#FF0000] border-r border-[#eef1f3]">arc/</span>
          <input value={h} onChange={e=>setH(e.target.value.replace(/[^a-zA-Z0-9_]/g,'').slice(0,20))} placeholder="yourname" className="flex-1 px-3 py-3 text-sm text-[#2c2f31] bg-transparent focus:outline-none font-medium"/>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">{h.length}/20 · Letters, numbers, underscores only</p>
        <button onClick={()=>valid&&onSave(h)} disabled={!valid} className="w-full py-3 rounded-xl text-sm font-black bg-[#FF0000] text-white disabled:opacity-30 hover:bg-red-700 transition-colors">Continue →</button>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export default function Home(){
  const[user,setUser]=useState<any>(null)
  const[handle,setHandle]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[courses,setCourses]=useState<Course[]>([])
  const[activeId,setActiveId]=useState<string|null>(null)
  const[modal,setModal]=useState<any>(null)
  const[inputVal,setInputVal]=useState('')
  const[descVal,setDescVal]=useState('')
  const[catVal,setCatVal]=useState(CATEGORIES[0])
  const[coverVal,setCoverVal]=useState('')
  const[fetching,setFetching]=useState(false)
  const[preview,setPreview]=useState<any>(null)
  const[fetchError,setFetchError]=useState('')
  const[coll,setColl]=useState<Record<string,boolean>>({})
  const[pv,setPV]=useState<any>(null)
  const[noteMin,setNoteMin]=useState('')
  const[noteDesc,setNoteDesc]=useState('')
  const[noteTab,setNoteTab]=useState<'public'|'mine'>('public')
  const[viewTab,setViewTab]=useState<'notes'|'videos'>('notes')
  const[editId,setEditId]=useState<string|null>(null)
  const[editVal,setEditVal]=useState('')
  const[numpad,setNumpad]=useState(false)
  const[playerTime,setPlayerTime]=useState(0)
  const[authMode,setAuthMode]=useState<'google'|'email'>('google')
  const[emailInput,setEmailInput]=useState('')
  const[otpSent,setOtpSent]=useState(false)
  const[authLoading,setAuthLoading]=useState(false)
  const[authError,setAuthError]=useState('')
  const[allExpanded,setAllExpanded]=useState(true)
  const[notesView,setNotesView]=useState(false)
  const[noteSearch,setNoteSearch]=useState('')
  const[noteSort,setNoteSort]=useState<'recent'|'oldest'>('recent')
  const[deleteTarget,setDeleteTarget]=useState<any>(null)
  const[shareTarget,setShareTarget]=useState<any>(null)
  const[dashTab,setDashTab]=useState<'my'|'enrolled'|'trending'>('my')
  const[joinCode,setJoinCode]=useState('')
  const[followedCats,setFollowedCats]=useState<string[]>([])
  const[reactionPicker,setReactionPicker]=useState<string|null>(null)
  const[pickerPos,setPickerPos]=useState<{top:number;left:number}|null>(null)
  const[filterCreator,setFilterCreator]=useState<string>("")
  const[profileModal,setProfileModal]=useState(false)
  const[customAvatar,setCustomAvatar]=useState<string|null>(null)
  const[preferredCreator,setPreferredCreator]=useState<string>("")
  const[enrollModal,setEnrollModal]=useState(false)
  const[coursesLoading,setCoursesLoading]=useState(false)
  const ytRef=useRef<any>(null)

  useEffect(()=>{
    if(!user||!handle) return
    setCoursesLoading(true)
    sync.loadCoursesFromDB(user.id, handle).then(loaded=>{
      if(loaded.length>0) setCourses(loaded)
    }).catch(console.error).finally(()=>setCoursesLoading(false))
  },[user, handle])
  const active=courses.find(c=>c.id===activeId)
  const togColl=(id:string)=>setColl(p=>({...p,[id]:!p[id]}))
  const upC=(fn:(c:Course)=>Course)=>setCourses(p=>p.map(c=>c.id===activeId?fn(c):c))
  const userHandle=handle||'anon'
  const userName=user?.user_metadata?.full_name||user?.email||'Anon'
  const userImg=customAvatar||user?.user_metadata?.avatar_url||''
  const isOwner=(c:Course)=>c.ownerHandle===userHandle
  // Returns set of video iids freely playable for non-enrolled users
  // Rule: first video of the course (intro) + top 2 by votes across ALL topics
  // If enrolled or owner → everything unlocked
  const getUnlockedVids=(sub:Sub,courseOwner:string):Set<string>=>{
    const isEnrolled=active?.enrolledBy?.includes(userHandle)||false
    const isCourseOwner=active?.ownerHandle===userHandle||false
    if(isEnrolled||isCourseOwner)return new Set(sub.videos.map(v=>v.iid))
    if(!active)return new Set<string>()
    // Collect ALL videos across the whole course with their iid
    const allVids:{iid:string;votes:number;isFirst:boolean}[]=[]
    let firstAdded=false
    active.modules.forEach(m=>m.subs.forEach(s=>s.videos.forEach((v,vi)=>{
      allVids.push({iid:v.iid,votes:v.votes||0,isFirst:!firstAdded&&vi===0&&m.id===active.modules[0]?.id&&s.id===m.subs[0]?.id})
      if(!firstAdded&&vi===0&&m.id===active.modules[0]?.id&&s.id===m.subs[0]?.id)firstAdded=true
    })))
    const unlocked=new Set<string>()
    // Always unlock the very first video of the course
    const first=allVids.find(v=>v.isFirst)
    if(first)unlocked.add(first.iid)
    // Top 2 by votes (excluding the first if already added)
    const byVotes=[...allVids].filter(v=>!unlocked.has(v.iid)).sort((a,b)=>b.votes-a.votes)
    byVotes.slice(0,2).forEach(v=>unlocked.add(v.iid))
    // Return only the iids that belong to THIS sub
    const subIids=new Set(sub.videos.map(v=>v.iid))
    return new Set([...unlocked].filter(iid=>subIids.has(iid)))
  }

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setUser(session?.user??null);setLoading(false)});return()=>subscription.unsubscribe()},[] )
  useEffect(()=>{
    const ca=localStorage.getItem('arc_avatar');if(ca)setCustomAvatar(ca)
    const pc=localStorage.getItem('arc_preferred_creator');if(pc)setPreferredCreator(pc)
    if(!user) return
    sync.getHandleFromDB(user.id).then(dbHandle=>{
      if(dbHandle){
        setHandle(dbHandle)
        localStorage.setItem('arc_handle',dbHandle)
      } else {
        const h=localStorage.getItem('arc_handle')
        if(h){setHandle(h); sync.saveHandleToDB(user.id,h)}
        else {
          const name=user.user_metadata?.full_name||user.email?.split('@')[0]||'user'
          const auto=name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,15)+Math.floor(Math.random()*99)
          saveHandle(auto)
        }
      }
    })
  },[user])
  const saveHandle=async(h:string)=>{
    setHandle(h)
    localStorage.setItem('arc_handle',h)
    if(user) await sync.saveHandleToDB(user.id, h)
  }

  const signInGoogle=async()=>{await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}})}
  const signInEmail=async()=>{if(!emailInput.trim())return;setAuthLoading(true);setAuthError('');const{error}=await supabase.auth.signInWithOtp({email:emailInput.trim()});if(error)setAuthError(error.message);else setOtpSent(true);setAuthLoading(false)}
  const signOut=async()=>{await supabase.auth.signOut();setUser(null)}

  const createCourse=async(pub:boolean)=>{
    if(!inputVal.trim()||!user)return
    const dbCourse = await sync.saveCourseToDB({
      id:'',name:inputVal.trim(),description:descVal.trim(),modules:[],isPublic:pub,
      active:true,owner:userName,ownerHandle:userHandle,ownerImg:userImg,
      coverImg:coverVal.trim(),category:catVal,enrolledBy:[],shareCode:'',createdAt:Date.now()
    } as any, user.id)
    if(!dbCourse) return
    const c:Course={
      id:dbCourse.id,name:inputVal.trim(),description:descVal.trim(),modules:[],
      isPublic:pub,active:true,owner:userName,ownerHandle:userHandle,ownerImg:userImg,
      coverImg:coverVal.trim(),category:catVal,enrolledBy:[],
      shareCode:dbCourse.share_code||genCode(),createdAt:Date.now()
    }
    setCourses(p=>[...p,c]);setActiveId(c.id);setModal(null);setInputVal('');setDescVal('')
  }
  const delCourse=async(id:string)=>{
    await sync.deleteCourseFromDB(id)
    setCourses(p=>p.filter(c=>c.id!==id));if(activeId===id)setActiveId(null);setDeleteTarget(null)
  }
  const toggleActive=(id:string)=>setCourses(p=>p.map(c=>c.id===id?{...c,active:!c.active}:c))
  const enrollCourse=async(id:string)=>{
    if(user) await sync.enrollInDB(user.id, id)
    setCourses(p=>p.map(c=>c.id===id?{...c,enrolledBy:[...c.enrolledBy.filter(e=>e!==userHandle),userHandle]}:c))
  }
  const unenrollCourse=async(id:string)=>{
    if(user) await sync.unenrollFromDB(user.id, id)
    setCourses(p=>p.map(c=>c.id===id?{...c,enrolledBy:c.enrolledBy.filter(e=>e!==userHandle)}:c))
  }
  const joinByCode=()=>{const c=courses.find(x=>x.shareCode.toLowerCase()===joinCode.trim().toLowerCase());if(c){enrollCourse(c.id);setJoinCode('');setActiveId(c.id)}}

  const addMod=async()=>{
    if(!activeId) return
    const position = (courses.find(c=>c.id===activeId)?.modules.length || 0)
    const mod = {id:uid(),name:`Module ${position+1}`,subs:[],createdAt:Date.now()}
    const dbMod = await sync.saveModuleToDB(activeId, mod, position)
    if(dbMod) mod.id = dbMod.id
    upC(c=>({...c,modules:[...c.modules,mod]}))
  }
  const delMod=async(id:string)=>{
    await sync.deleteModuleFromDB(id)
    upC(c=>({...c,modules:c.modules.filter(m=>m.id!==id)}))
  }
  const moveMod=async(i:number,d:number)=>{if(!active)return;const j=i+d;if(j<0||j>=active.modules.length)return;upC(c=>{const mods=swap(c.modules,i,j);mods.forEach((m,idx)=>sync.updateModuleInDB(m.id,{position:idx}));return{...c,modules:mods}})}
  const addSub=async(mId:string)=>{
    const mod = courses.find(c=>c.id===activeId)?.modules.find(m=>m.id===mId)
    const position = mod?.subs.length || 0
    const sub = {id:uid(),name:`Topic ${position+1}`,videos:[],createdAt:Date.now()}
    const dbTopic = await sync.saveTopicToDB(mId, sub, position)
    if(dbTopic) sub.id = dbTopic.id
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:[...m.subs,sub]}:m)}))
  }
  const delSub=async(mId:string,sId:string)=>{
    await sync.deleteTopicFromDB(sId)
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.filter(s=>s.id!==sId)}:m)}))
  }
  const moveSub=(mId:string,i:number,d:number)=>upC(c=>({...c,modules:c.modules.map(m=>{if(m.id!==mId)return m;const j=i+d;if(j<0||j>=m.subs.length)return m;const subs=swap(m.subs,i,j);subs.forEach((s,idx)=>sync.updateTopicInDB(s.id,{position:idx}));return{...m,subs}})}))
  const fetchLink=async()=>{if(!inputVal.trim())return;setFetching(true);setPreview(null);setFetchError('');try{const res=await fetch('/api/youtube',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:inputVal.trim()})});const data=await res.json();if(data.error)setFetchError(data.error);else setPreview(data)}catch{setFetchError('Connection error')};setFetching(false)}
  const addVid=async()=>{if(!preview||!modal?.mId)return;
    const targetMod=active?.modules.find(m=>m.id===modal.mId);
    const targetSub=targetMod?.subs.find(s=>s.id===modal.sId);
    if(targetSub?.videos.some(v=>v.id===preview.id)){alert('This video is already in this topic.');return;}
    const inCourse=active?.modules.some(m=>m.subs.some(s=>s.videos.some(v=>v.id===preview.id)));
    if(inCourse&&!confirm('This video already exists in another topic. Add anyway?'))return;
    const position = targetSub?.videos.length || 0
    const v:Video={...preview,iid:uid(),completed:false,notes:[],votes:0,votedBy:[],createdAt:Date.now()};
    const dbLesson = await sync.saveLessonToDB(modal.sId, v, position)
    if(dbLesson) v.iid = dbLesson.id
    upC(c=>({...c,modules:c.modules.map(m=>m.id===modal.mId?{...m,subs:m.subs.map(s=>s.id===modal.sId?{...s,videos:[...s.videos,v]}:s)}:m)}));
    setModal(null);setInputVal('');setPreview(null)
  }
  const delVid=async(mId:string,sId:string,i:number)=>{
    const vid = active?.modules.find(m=>m.id===mId)?.subs.find(s=>s.id===sId)?.videos[i]
    if(vid) await sync.deleteLessonFromDB(vid.iid)
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.filter((_,vi)=>vi!==i)}:s)}:m)}))
  }
  const toggleComp=async(mId:string,sId:string,vi:number)=>{
    const vid = active?.modules.find(m=>m.id===mId)?.subs.find(s=>s.id===sId)?.videos[vi]
    if(vid && user && activeId) await sync.toggleCompletionInDB(user.id, vid.iid, activeId, !vid.completed)
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,completed:!v.completed}:v)}:s)}:m)}))
  }
  const voteVid=(mId:string,sId:string,vi:number,dir:'up'|'down')=>{upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>{if(s.id!==sId)return s;const vids=[...s.videos];const v={...vids[vi]};const prev=v.votedBy?.find(x=>x.startsWith(userHandle+':'));if(prev){const od=prev.split(':')[1];if(od===dir)return s;v.votes+=(dir==='up'?2:-2);v.votedBy=v.votedBy.map(x=>x.startsWith(userHandle+':')?`${userHandle}:${dir}`:x)}else{v.votes+=(dir==='up'?1:-1);v.votedBy=[...(v.votedBy||[]),`${userHandle}:${dir}`]};vids[vi]=v;vids.sort((a,b)=>(b.votes||0)-(a.votes||0));return{...s,videos:vids}})}:m)}));
    const vid = courses.find(c=>c.id===activeId)?.modules.find(m=>m.id===mId)?.subs.find(s=>s.id===sId)?.videos[vi]
    if(vid && user) sync.voteVideoInDB(user.id, vid.iid, dir==='up'? 1 : -1)
  }
  const getVoteDir=(v:Video)=>{const e=v.votedBy?.find(x=>x.startsWith(userHandle+':'));return e?e.split(':')[1]:''}
  const addNote=async(mId:string,sId:string,vi:number)=>{
    if(!noteDesc.trim()||!user)return
    const vid = active?.modules.find(m=>m.id===mId)?.subs.find(s=>s.id===sId)?.videos[vi]
    const minute=noteMin||fmtTime(playerTime)
    const isPublic = noteTab==='public'
    if(vid) await sync.saveNoteToDB(vid.iid, user.id, minute, noteDesc.slice(0,280), isPublic)
    const n:Note={id:uid(),minute,text:noteDesc.slice(0,280),author:userName,authorHandle:userHandle,authorImg:userImg,ts:Date.now(),isPublic,reactions:{}}
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:[...v.notes,n]}:v)}:s)}:m)}))
    setNoteMin('');setNoteDesc('')
  }
  const delNote=async(mId:string,sId:string,vi:number,nId:string)=>{
    await sync.deleteNoteFromDB(nId)
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:v.notes.filter(n=>n.id!==nId)}:v)}:s)}:m)}))
  }
  const toggleReaction=async(mId:string,sId:string,vi:number,nId:string,emoji:string)=>{
    if(user) await sync.toggleReactionInDB(user.id, nId, emoji)
    upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:v.notes.map(n=>{
      if(n.id!==nId)return n;const r={...n.reactions};if(!r[emoji])r[emoji]=[];
      if(r[emoji].includes(userHandle))r[emoji]=r[emoji].filter(u=>u!==userHandle);
      else r[emoji]=[...r[emoji],userHandle];
      if(r[emoji].length===0)delete r[emoji];return{...n,reactions:r}
    })}:v)}:s)}:m)}));setReactionPicker(null)
  }
  const seekTo=(sec:number)=>{try{ytRef.current?.seekTo(sec)}catch{}}
  const captureTime=()=>{try{setNoteMin(fmtTime(ytRef.current?.getCurrentTime()||playerTime))}catch{setNoteMin(fmtTime(playerTime))}}
  const startEdit=(id:string,v:string)=>{setEditId(id);setEditVal(v)}
  const doRename=async(type:string,mId?:string)=>{
    if(!editVal.trim()){setEditId(null);return}
    if(type==='course'){
      setCourses(p=>p.map(c=>c.id===editId?{...c,name:editVal.trim()}:c))
      if(editId) await sync.updateCourseInDB(editId, {title:editVal.trim()})
    } else if(type==='mod'){
      upC(c=>({...c,modules:c.modules.map(m=>m.id===editId?{...m,name:editVal.trim()}:m)}))
      if(editId) await sync.updateModuleInDB(editId, {name:editVal.trim()})
    } else if(type==='sub'){
      upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===editId?{...s,name:editVal.trim()}:s)}:m)}))
      if(editId) await sync.updateTopicInDB(editId, {name:editVal.trim()})
    }
    setEditId(null)
  }
  const toggleAll=()=>{if(!active)return;const next=!allExpanded;setAllExpanded(next);const n={...coll};active.modules.forEach(m=>{n[m.id]=!next;m.subs.forEach(s=>{n[s.id]=!next})});setColl(n)}
  const getAllNotes=()=>{if(!active)return[];const all:any[]=[];active.modules.forEach(mod=>{mod.subs.forEach(sub=>{sub.videos.forEach((vid,vi)=>{vid.notes.forEach(n=>{all.push({...n,videoTitle:vid.title,videoThumb:vid.thumbnail,modName:mod.name,subName:sub.name,mId:mod.id,sId:sub.id,vi})})})})});return(noteSearch?all.filter(n=>n.text.toLowerCase().includes(noteSearch.toLowerCase())||n.videoTitle.toLowerCase().includes(noteSearch.toLowerCase())):all).sort((a,b)=>noteSort==='recent'?b.ts-a.ts:a.ts-b.ts)}

  const myCourses=courses.filter(c=>c.ownerHandle===userHandle)
  const enrolledCourses=courses.filter(c=>c.enrolledBy?.includes(userHandle)&&c.ownerHandle!==userHandle)

  // ── LOADING ──────────────────────────────────────────────────
  if(loading)return(
    <div className="min-h-screen bg-[#f5f7f9] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#FF0000] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  // ── LOGIN ────────────────────────────────────────────────────
  if(!user)return(
    <div className="min-h-screen bg-[#f5f7f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.06)] text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FF0000] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_rgba(255,0,0,0.25)]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <h1 className="text-2xl font-black text-[#2c2f31] tracking-tight mb-1">Course Architect</h1>
        <p className="text-sm text-slate-500 mb-6">Build courses with YouTube videos</p>
        <div className="flex border border-[#eef1f3] rounded-xl overflow-hidden mb-5 bg-[#f5f7f9]">
          <button onClick={()=>setAuthMode('google')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${authMode==='google'?'bg-white text-[#2c2f31] shadow-sm':'text-slate-400'}`}>Google</button>
          <button onClick={()=>setAuthMode('email')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${authMode==='email'?'bg-white text-[#2c2f31] shadow-sm':'text-slate-400'}`}>Email</button>
        </div>
        {authMode==='google'
          ? <button onClick={signInGoogle} className="w-full py-3 rounded-xl text-sm font-black bg-[#FF0000] text-white hover:bg-red-700 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,0,0,0.2)] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          : !otpSent
            ? <div className="space-y-3">
                <div className="bg-[#f5f7f9] rounded-xl px-4 py-3 border border-[#eef1f3]">
                  <p className="text-[11px] text-slate-500 leading-relaxed">No password needed! We&apos;ll send you a secure link to your email. Just click it and you&apos;re in.</p>
                </div>
                <input value={emailInput} onChange={e=>setEmailInput(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-sm text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200"/>
                <button onClick={signInEmail} disabled={!emailInput.trim()||authLoading} className="w-full py-3 rounded-xl text-sm font-black bg-[#FF0000] text-white disabled:opacity-40">{authLoading?'Sending...':'Send magic link'}</button>
              </div>
            : <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                </div>
                <h3 className="text-base font-black text-[#2c2f31]">Check your inbox!</h3>
                <p className="text-sm text-slate-500 leading-relaxed">We sent a sign-in link to <strong className="text-[#2c2f31]">{emailInput}</strong>. Click the link in the email to access your account.</p>
                <div className="bg-[#f5f7f9] rounded-xl px-4 py-3 border border-[#eef1f3]">
                  <p className="text-[11px] text-slate-400 leading-relaxed">Don&apos;t see it? Check your spam folder. The link expires in 24 hours.</p>
                </div>
                <button onClick={()=>setOtpSent(false)} className="text-xs text-[#FF0000] hover:underline font-bold">Try a different email</button>
              </div>
        }
        {authError&&<p className="text-xs text-red-500 mt-3 font-medium">{authError}</p>}
      </div>
    </div>
  )

  if(!handle)return<HandleModal onSave={saveHandle}/>

  // ── NOTE CARD ────────────────────────────────────────────────
  const NoteCard=({n,mId,sId,vi,courseOwnerHandle}:{n:Note;mId:string;sId:string;vi:number;courseOwnerHandle:string})=>(
    <div
      className="flex items-start gap-3 p-3 rounded-2xl bg-[#f5f7f9] group hover:bg-[#eef1f3] transition-colors cursor-pointer"
      onClick={()=>n.minute&&seekTo(timeToSec(n.minute))}
      title={n.minute?`Jump to ${n.minute}`:''}
    >
      {n.authorImg
        ? <img src={n.authorImg} alt="" className="w-7 h-7 rounded-full flex-shrink-0 object-cover"/>
        : <div className="w-7 h-7 rounded-full bg-[#eef1f3] flex items-center justify-center text-[9px] font-black text-slate-500 flex-shrink-0">{n.author[0]?.toUpperCase()}</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[11px] font-black text-[#2c2f31]">arc/{n.authorHandle}</span>
          {n.authorHandle===courseOwnerHandle&&<span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-50 text-[#FF0000] uppercase tracking-wider">BUILDER</span>}
          {n.minute&&<button onClick={e=>{e.stopPropagation();seekTo(timeToSec(n.minute))}} className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-red-50 text-[#FF0000] hover:bg-red-100 cursor-pointer">⏱ {n.minute}</button>}
          <span className="text-[9px] text-slate-300 ml-auto">{ago(n.ts)}</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed group-hover:text-[#2c2f31] transition-colors">{n.text}</p>
        <div className="flex items-center gap-1 mt-2 flex-wrap" onClick={e=>e.stopPropagation()}>
          {Object.entries(n.reactions||{}).map(([emoji,users])=>(
            <button key={emoji} onClick={()=>toggleReaction(mId,sId,vi,n.id,emoji)} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${(users as string[]).includes(userHandle)?'bg-red-50 border-red-200 text-[#FF0000]':'bg-white border-[#eef1f3] text-slate-500 hover:bg-[#eef1f3]'}`}>
              <img src={`/emojis/${emoji}.gif`} alt={emoji} className="w-4 h-4 object-contain flex-shrink-0"/>
              <span className="font-black">{(users as string[]).length}</span>
            </button>
          ))}
          <button
            onClick={e=>{
              e.stopPropagation()
              const compositeId=`${mId}::${sId}::${vi}::${n.id}`
              if(reactionPicker===compositeId){setReactionPicker(null);setPickerPos(null)}
              else{
                const r=(e.currentTarget as HTMLElement).getBoundingClientRect()
                const panelH=280,panelW=320
                const spaceBelow=window.innerHeight-r.bottom
                const top=spaceBelow>panelH?r.bottom+4:r.top-panelH-4
                const left=Math.min(Math.max(r.left,8),window.innerWidth-panelW-8)
                setPickerPos({top,left})
                setReactionPicker(compositeId)
              }
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#eef1f3] text-slate-500 hover:bg-red-50 hover:text-[#FF0000] transition-colors"
          >+ React</button>
        </div>
      </div>
      {n.authorHandle===userHandle&&<button onClick={e=>{e.stopPropagation();delNote(mId,sId,vi,n.id)}} className="p-1 opacity-0 group-hover:opacity-60 text-red-400 text-xs flex-shrink-0">✕</button>}
    </div>
  )

  // ─────────────────────────────────────────────────────────────
  // VIEW: VIDEO PLAYER
  // ─────────────────────────────────────────────────────────────
  if(pv&&active){
    const mod=active.modules.find(m=>m.id===pv.mId);const sub=mod?.subs.find(s=>s.id===pv.sId);const vid=sub?.videos[pv.vi]
    if(!vid){setPV(null);return null}
    const goTo=(vi:number)=>{
      // Save position before switching
      if(vid && user && activeId) sync.toggleCompletionInDB(user.id, vid.iid, activeId, vid.completed).catch(()=>{})
      if(vid && user && playerTime>5) sync.savePositionInDB(user.id, vid.iid, activeId!, Math.floor(playerTime)).catch(()=>{})
      setPV((p:any)=>({...p,vi}));setPlayerTime(0);setNoteMin('')
    }
    const filteredNotes=vid.notes.filter(n=>noteTab==='public'?n.isPublic:n.authorHandle===userHandle)
    const vidDuration=parseDur(vid.duration)
    const watchedPct=vidDuration>0?playerTime/vidDuration:0
    const canVote=watchedPct>=0.15

    // Save position when leaving the player view
    const savePositionOnLeave=()=>{
      if(vid && user && activeId && playerTime>5) sync.savePositionInDB(user.id, vid.iid, activeId, Math.floor(playerTime)).catch(()=>{})
    }

    return(
      <div className="min-h-screen bg-[#f5f7f9]">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/30">
          <div className="flex items-center gap-3">
            <button onClick={()=>{savePositionOnLeave();setPV(null)}} className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#FF0000] transition-colors uppercase tracking-wider">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <div className="h-4 w-px bg-[#eef1f3]"/>
            <nav className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.05em] text-slate-400">
              <span className="hover:text-[#FF0000] cursor-pointer" onClick={()=>{savePositionOnLeave();setPV(null)}}>{active.name}</span>
              <span>›</span>
              <span>{mod?.name}</span>
              <span>›</span>
              <span className="text-[#FF0000]">{sub?.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>{if(pv.vi>0)goTo(pv.vi-1)}} disabled={pv.vi===0} className="px-4 py-2 rounded-xl text-xs font-black bg-[#f5f7f9] text-slate-600 disabled:opacity-30 hover:bg-[#eef1f3] transition-colors">← Prev</button>
            <button onClick={()=>{if(sub&&pv.vi<sub.videos.length-1)goTo(pv.vi+1)}} disabled={!sub||pv.vi>=sub.videos.length-1} className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-30 hover:bg-red-700 transition-colors">Next →</button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row pt-16 max-w-[1400px] mx-auto">
          {/* Main Video Area */}
          <div className="flex-1 px-0 lg:px-6 py-4">
            <div className="w-full rounded-none lg:rounded-2xl overflow-hidden bg-black aspect-video">
              <YouTubePlayer ref={ytRef} videoId={vid.id} startAt={vid.lastPosition||0} onTimeUpdate={setPlayerTime}/>
            </div>

            <div className="px-4 lg:px-0 py-5 space-y-4">
              {/* Breadcrumb — mockup style */}
              <nav className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400">
                <span className="hover:text-[#FF0000] cursor-pointer" onClick={()=>setPV(null)}>{active.name}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                <span>{mod?.name}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                <span className="text-[#FF0000]">{sub?.name}</span>
              </nav>

              {/* Title */}
              <h1 className="font-black text-xl md:text-2xl tracking-tight text-[#2c2f31] leading-tight">{vid.title}</h1>

              {/* Channel row + rating + stats */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {vid.channelImg&&<div className="w-10 h-10 rounded-full overflow-hidden border border-[#FF0000]/20 flex-shrink-0"><img src={vid.channelImg} alt="" className="w-full h-full object-cover"/></div>}
                  <div>
                    <p className="text-sm font-bold text-[#2c2f31]">{vid.channel}</p>
                    {vid.subscribers&&<p className="text-[0.65rem] text-slate-400 font-black uppercase tracking-wider">{vid.subscribers} subs</p>}
                  </div>
                  {/* Creator filter pill */}
                  {vid.channel&&(
                    preferredCreator===vid.channel
                      ? <button onClick={()=>{setPreferredCreator('');localStorage.setItem('arc_preferred_creator','')}} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-[#FF0000]/30 text-[10px] font-black text-[#FF0000] uppercase tracking-wider">
                          ★ Following · Remove
                        </button>
                      : <button onClick={()=>{setPreferredCreator(vid.channel);localStorage.setItem('arc_preferred_creator',vid.channel)}} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f7f9] border border-[#eef1f3] text-[10px] font-black text-slate-500 hover:border-[#FF0000]/30 hover:text-[#FF0000] uppercase tracking-wider transition-colors">
                          ☆ Follow creator
                        </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {/* Reddit-style vote pill */}
                  <div className="flex flex-col items-center bg-[#eef1f3] px-2 py-1 rounded-xl border border-[#e5e9eb] relative">
                    {!canVote&&<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2c2f31] text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap font-medium opacity-0 hover:opacity-100 pointer-events-none z-10">Watch 15% to vote</div>}
                    <button onClick={()=>canVote&&voteVid(pv.mId,pv.sId,pv.vi,'up')} className={`leading-none transition-colors ${!canVote?'text-slate-300 cursor-not-allowed':getVoteDir(vid)==='up'?'text-[#FF0000]':'text-slate-400 hover:text-[#FF0000]'}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 9H2L8 2Z"/></svg>
                    </button>
                    <span className={`text-[0.7rem] font-black leading-none my-0.5 ${getVoteDir(vid)==='up'?'text-[#FF0000]':getVoteDir(vid)==='down'?'text-blue-500':'text-[#2c2f31]'}`}>{vid.votes>=1000?`${(vid.votes/1000).toFixed(1)}k`:vid.votes}</span>
                    <button onClick={()=>canVote&&voteVid(pv.mId,pv.sId,pv.vi,'down')} className={`leading-none transition-colors ${!canVote?'text-slate-300 cursor-not-allowed':getVoteDir(vid)==='down'?'text-blue-500':'text-slate-400 hover:text-blue-500'}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14L2 7H14L8 14Z"/></svg>
                    </button>
                  </div>
                  {!canVote&&<p className="text-[9px] text-slate-400 font-bold">Watch 15% to vote</p>}
                  {/* Views + likes */}
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="flex flex-col items-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span className="text-[0.65rem] font-bold">{vid.viewsShort||vid.views}</span>
                    </div>
                    <div className="flex flex-col items-center text-[#FF0000]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <span className="text-[0.65rem] font-bold">{vid.likesShort||vid.likes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons — mockup style */}
              <div className="flex gap-3 pt-1">
                <button onClick={()=>toggleComp(pv.mId,pv.sId,pv.vi)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${vid.completed?'bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]':'bg-[#FF0000] text-white shadow-[0_4px_16px_rgba(255,0,0,0.2)] hover:bg-red-700'}`}>
                  {vid.completed?'✓ Completed':'Complete Lesson'}
                </button>
                <button
                  onClick={()=>{setModal({type:'addVideo',mId:pv.mId,sId:pv.sId});setInputVal('');setPreview(null);setFetchError('')}}
                  className="flex-1 bg-[#eef1f3] text-slate-500 py-3 rounded-xl font-black text-sm border border-[#e5e9eb] hover:bg-[#e5e9eb] active:scale-95 transition-all"
                >
                  Not Great? Suggest Better
                </button>
              </div>

              {/* Tabs: Notes | Other Videos */}
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex border-b border-[#eef1f3]">
                  <button onClick={()=>setViewTab('notes')} className={`flex-1 py-4 text-sm font-black transition-colors ${viewTab==='notes'?'text-[#FF0000] border-b-[3px] border-[#FF0000] -mb-px':'text-slate-400 hover:text-slate-600'}`}>Notes</button>
                  <button onClick={()=>setViewTab('videos')} className={`flex-1 py-4 text-sm font-black transition-colors ${viewTab==='videos'?'text-[#FF0000] border-b-[3px] border-[#FF0000] -mb-px':'text-slate-400 hover:text-slate-600'}`}>Other Videos</button>
                </div>

                {viewTab==='videos'?(
                  /* Other Videos tab — sorted by votes, preferred creator first */
                  <div className="p-4 space-y-3">
                    {preferredCreator&&(
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 rounded-xl border border-red-100 mb-2">
                        <span className="text-[10px] font-black text-[#FF0000] uppercase tracking-wider">★ Showing {preferredCreator} first</span>
                        <button onClick={()=>{setPreferredCreator('');localStorage.setItem('arc_preferred_creator','')}} className="ml-auto text-[10px] text-red-300 hover:text-red-500 font-black">✕ Clear</button>
                      </div>
                    )}
                    {(()=>{
                      if(!sub)return null
                      const sorted=[...sub.videos].sort((a,b)=>{
                        if(preferredCreator){
                          const aMatch=a.channel===preferredCreator
                          const bMatch=b.channel===preferredCreator
                          if(aMatch&&!bMatch)return-1
                          if(!aMatch&&bMatch)return 1
                        }
                        return(b.votes||0)-(a.votes||0)
                      })
                      const unlocked=getUnlockedVids(sub,active.ownerHandle)
                      return sorted.map((sv,idx)=>{
                        const isLocked=!unlocked.has(sv.iid)
                        const isActive=sv.iid===vid.iid
                        const originalVi=sub.videos.findIndex(v=>v.iid===sv.iid)
                        return(
                          <div key={sv.iid} onClick={()=>{if(isLocked){setEnrollModal(true)}else{goTo(originalVi)}}} className={`flex items-stretch gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${isActive?'bg-red-50 border border-[#FF0000]/20':'hover:bg-[#f5f7f9]'} ${isLocked?'opacity-60':''}`}>
                            {/* Vote pill — full height left column */}
                            <div className="flex-shrink-0" onClick={e=>e.stopPropagation()}>
                              {isLocked
                                ? <div className="w-8 h-full flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                                : !canVote
                                  ? <div className="flex flex-col items-center justify-center h-full px-2 py-2 opacity-40"><svg width="16" height="16" viewBox="0 0 16 16" fill="#cbd5e1"><path d="M8 2L14 10H2L8 2Z"/></svg><span className="text-xs font-black text-slate-400 my-0.5">{sv.votes||'0'}</span><svg width="16" height="16" viewBox="0 0 16 16" fill="#cbd5e1"><path d="M8 14L2 6H14L8 14Z"/></svg><span className="text-[7px] font-black text-slate-400 mt-0.5">15%</span></div>
                                  : <div className={`flex flex-col items-center justify-between h-full px-2 py-2 rounded-xl ${isActive?'bg-white border border-red-100':'bg-[#eef1f3] border border-transparent'}`} style={{minHeight:72}}>
                                    <button onClick={()=>voteVid(pv.mId,pv.sId,originalVi,'up')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${getVoteDir(sv)==='up'?'text-[#FF0000] bg-red-50':'text-slate-400 hover:text-[#FF0000] hover:bg-white'}`}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 10H2L8 2Z"/></svg>
                                    </button>
                                    <span className={`text-xs font-black tabular-nums ${getVoteDir(sv)==='up'?'text-[#FF0000]':getVoteDir(sv)==='down'?'text-blue-500':'text-slate-500'}`}>{sv.votes>=1000?`${(sv.votes/1000).toFixed(1)}k`:sv.votes||'0'}</span>
                                    <button onClick={()=>voteVid(pv.mId,pv.sId,originalVi,'down')} className={`p-1.5 rounded-lg transition-all active:scale-90 ${getVoteDir(sv)==='down'?'text-blue-500 bg-blue-50':'text-slate-400 hover:text-blue-500 hover:bg-white'}`}>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14L2 6H14L8 14Z"/></svg>
                                    </button>
                                  </div>
                              }
                            </div>
                            {/* Thumbnail */}
                            <div className={`relative w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 self-center bg-[#eef1f3] ${isLocked?'grayscale':''}`}>
                              {isLocked
                                ? <div className="w-full h-full flex items-center justify-center bg-[#f5f7f9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                                : <><img src={sv.thumbnail} alt="" className="w-full h-full object-cover"/><div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></>
                              }
                            </div>
                            {/* Text */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-0.5">
                              <p className={`font-bold text-sm leading-tight line-clamp-2 ${isActive?'text-[#FF0000]':'text-[#2c2f31]'} ${sv.completed?'line-through opacity-50':''}`}>{sv.title}</p>
                              {sv.channel&&<div className="flex items-center gap-1"><img src={sv.channelImg||''} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0"/><span className="text-[10px] text-slate-400 font-medium truncate">{sv.channel}</span></div>}
                              <div className="flex items-center gap-2.5">
                                <div className={`flex items-center gap-1 text-[10px] ${isActive?'text-[#FF0000]':'text-slate-400'}`}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  <span className="font-bold">{sv.viewsShort||sv.views}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] ${isActive?'text-red-400':'text-slate-400'}`}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                  <span className="font-bold">{sv.likesShort||sv.likes}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ):(
                  /* Collaborative Notes tab */
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex border border-[#eef1f3] rounded-xl overflow-hidden bg-[#f5f7f9]">
                        <button onClick={()=>setNoteTab('public')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${noteTab==='public'?'text-[#2c2f31] bg-white shadow-sm':'text-slate-400'}`}>Public</button>
                        <button onClick={()=>setNoteTab('mine')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${noteTab==='mine'?'text-[#2c2f31] bg-white shadow-sm':'text-slate-400'}`}>Mine</button>
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <button onClick={()=>setNumpad(true)} className="px-3 py-2.5 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs font-black font-mono min-w-[80px] text-center text-[#2c2f31] hover:bg-[#eef1f3] transition-colors">⏱ {noteMin||fmtTime(playerTime)}</button>
                      <div className="flex-1 relative">
                        <input value={noteDesc} onChange={e=>setNoteDesc(e.target.value.slice(0,280))} placeholder="Write a note..." className="w-full px-3 py-2.5 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200 pr-14" onKeyDown={e=>{if(e.key==='Enter')addNote(pv.mId,pv.sId,pv.vi)}}/>
                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold ${noteDesc.length>=260?'text-[#FF0000]':'text-slate-300'}`}>{noteDesc.length}/280</span>
                      </div>
                      <button onClick={()=>addNote(pv.mId,pv.sId,pv.vi)} disabled={!noteDesc.trim()} className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 hover:bg-red-700 transition-colors">Add</button>
                    </div>
                    {filteredNotes.length===0
                      ? <p className="text-xs text-slate-400 text-center py-8 font-medium">No notes yet</p>
                      : <div className="space-y-2 max-h-[400px] overflow-y-auto">{filteredNotes.map(n=><NoteCard key={n.id} n={n} mId={pv.mId} sId={pv.sId} vi={pv.vi} courseOwnerHandle={active.ownerHandle}/>)}</div>
                    }
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Playlist */}
          <div className="w-full lg:w-96 bg-white border-l border-[#eef1f3] lg:h-screen lg:sticky lg:top-16 overflow-y-auto">
            <div className="p-5 border-b border-[#eef1f3]">
              <p className="text-sm font-black text-[#2c2f31] tracking-tight">{sub?.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{sub?.videos.length} videos · {fmtS(subDur(sub!))}</p>
              <div className="mt-3">{sub&&<PBar done={subComp(sub)} total={sub.videos.length}/>}</div>
            </div>
            <div className="p-3 space-y-1">
              {sub?.videos.map((sv,svi)=>{
                const unlocked=active?getUnlockedVids(sub,active.ownerHandle):new Set<string>()
                const isLocked=!unlocked.has(sv.iid)
                return(
                <div key={sv.iid} onClick={()=>{if(isLocked){setEnrollModal(true)}else{goTo(svi)}}} className={`flex items-center gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-all ${svi===pv.vi?'bg-red-50 border border-red-100':'hover:bg-[#f5f7f9] border border-transparent'} ${isLocked?'opacity-60':''}`}>
                  {isLocked
                    ? <div className="flex flex-col items-center justify-center w-5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                    : <VotePill score={sv.votes} voted={getVoteDir(sv)} onUp={()=>voteVid(pv.mId,pv.sId,svi,'up')} onDown={()=>voteVid(pv.mId,pv.sId,svi,'down')} compact disabled={!canVote}/>
                  }
                  <button onClick={e=>{e.stopPropagation();if(!isLocked)toggleComp(pv.mId,pv.sId,svi)}} className="flex-shrink-0 text-sm">
                    {sv.completed?<span className="text-emerald-500 font-black">✓</span>:<span className="text-slate-300">○</span>}
                  </button>
                  <div className={`relative flex-shrink-0 w-24 h-14 cursor-pointer ${isLocked?'grayscale':''}`}>
                    {isLocked
                      ? <div className="w-full h-full rounded-xl bg-[#eef1f3] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                      : <><img src={sv.thumbnail} alt="" className="w-full h-full object-cover rounded-xl"/><span className="absolute bottom-1 right-1 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded-md font-bold">{sv.duration}</span></>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#2c2f31] leading-snug line-clamp-2">{sv.title}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">
                      <span>{sv.duration}</span>
                      {(sv.votes||0)!==0&&<span className={`font-black ${sv.votes>0?'text-[#FF0000]':'text-blue-500'}`}>{sv.votes>0?'▲':'▼'}{Math.abs(sv.votes)}</span>}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>

        {numpad&&<NumpadModal value={noteMin} onChange={setNoteMin} onClose={()=>setNumpad(false)} onCapture={captureTime} currentTime={fmtTime(playerTime)}/>}

        {/* Enroll gate modal */}
        {enrollModal&&(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={()=>setEnrollModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center" onClick={e=>e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl bg-[#f5f7f9] flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="text-xl font-black text-[#2c2f31] tracking-tight mb-2">This video is locked</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">Enroll in this course to unlock all videos and start your full learning journey.</p>
              <button onClick={()=>{if(active){enrollCourse(active.id)};setEnrollModal(false)}} className="w-full py-3.5 rounded-xl font-black text-sm bg-[#FF0000] text-white hover:bg-red-700 shadow-[0_4px_16px_rgba(255,0,0,0.2)] transition-all active:scale-95">
                🎯 Lock In — Enroll Now
              </button>
              <button onClick={()=>setEnrollModal(false)} className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-bold">Maybe later</button>
            </div>
          </div>
        )}

        {/* Global reaction picker portal — fixed, never clipped */}
        {reactionPicker&&pickerPos&&(
          <>
            <div className="fixed inset-0 z-[299]" onClick={()=>{setReactionPicker(null);setPickerPos(null)}}/>
            <div
              className="fixed z-[300] bg-white border border-[#eef1f3] rounded-2xl shadow-2xl p-3"
              style={{top:pickerPos.top,left:pickerPos.left,width:320}}
            >
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">React to this note</p>
              <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto">
                {REACTION_EMOJIS.map(e=>(
                  <button
                    key={e}
                    onClick={()=>{
                      if(reactionPicker){
                        const parts=reactionPicker.split('::')
                        if(parts.length===4)toggleReaction(parts[0],parts[1],Number(parts[2]),parts[3],e)
                      }
                      setReactionPicker(null);setPickerPos(null)
                    }}
                    className="w-7 h-7 rounded-xl hover:bg-[#f5f7f9] flex items-center justify-center transition-colors hover:scale-125 active:scale-95"
                  >
                    <img src={`/emojis/${e}.gif`} alt={e} className="w-6 h-6 object-contain"/>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Suggest Better Modal — must live here inside player view */}
        {modal?.type==='addVideo'&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">Suggest a Better Video</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Added to this topic so others can discover and vote on it</p>
                </div>
                <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchLink()} placeholder="https://youtube.com/watch?v=..." className="flex-1 px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-sm text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200"/>
                  <button onClick={fetchLink} disabled={!inputVal.trim()||fetching} className="px-5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 flex items-center gap-1 hover:bg-red-700 transition-colors">
                    {fetching?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Fetch'}
                  </button>
                </div>
                {fetchError&&<p className="text-xs text-red-500 font-medium">{fetchError}</p>}
                {preview&&(
                  <div className="border border-[#eef1f3] rounded-2xl overflow-hidden">
                    <img src={preview.thumbnail} alt="" className="w-full h-44 object-cover"/>
                    <div className="p-4">
                      <h4 className="text-sm font-black text-[#2c2f31] line-clamp-2 tracking-tight">{preview.title}</h4>
                      <div className="flex items-center gap-2 mt-2">{preview.channelImg&&<img src={preview.channelImg} alt="" className="w-5 h-5 rounded-full object-cover"/>}<span className="text-xs font-bold text-slate-600">{preview.channel}</span></div>
                      <div className="flex gap-3 text-[11px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider"><span>{preview.views} views</span><span>{preview.likes} likes</span><span>{preview.duration}</span></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={()=>setModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:bg-[#f5f7f9] border border-[#eef1f3] uppercase tracking-wider">Cancel</button>
                  <button onClick={addVid} disabled={!preview} className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 hover:bg-red-700 uppercase tracking-wider">Add to Topic</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: NOTEVAULT
  // ─────────────────────────────────────────────────────────────
  if(notesView&&active){
    const allNotes=getAllNotes()
    return(
      <div className="min-h-screen bg-[#f5f7f9] pb-28">
        <AppHeader onHome={()=>{setNotesView(false);setActiveId(null)}} userHandle={userHandle} userImg={userImg} onProfile={()=>setProfileModal(true)} onSignOut={signOut}/>
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-6 space-y-6">
          <div>
            <button onClick={()=>setNotesView(false)} className="text-[10px] font-black text-slate-400 hover:text-[#FF0000] mb-2 flex items-center gap-1 uppercase tracking-wider transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <h2 className="text-3xl font-black text-[#2c2f31] tracking-tight">🔐 NoteVault</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">{allNotes.length} notes</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input value={noteSearch} onChange={e=>setNoteSearch(e.target.value)} placeholder="Search notes..." className="w-full px-4 py-3 pl-9 rounded-2xl border border-[#eef1f3] bg-white text-sm text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200 shadow-sm"/>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            </div>
            <button onClick={()=>setNoteSort(noteSort==='recent'?'oldest':'recent')} className="px-4 py-3 rounded-2xl border border-[#eef1f3] bg-white text-xs font-black text-slate-500 shadow-sm hover:bg-[#f5f7f9] transition-colors uppercase tracking-wider">{noteSort==='recent'?'↓ New':'↑ Old'}</button>
          </div>
          {allNotes.length===0
            ? <div className="bg-white rounded-2xl p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]"><p className="text-sm text-slate-400 font-medium">{noteSearch?'No matches found':'No notes yet'}</p></div>
            : <div className="space-y-2">
                {allNotes.map((n:any)=>(
                  <div key={n.id} onClick={()=>{setNotesView(false);setPV({mId:n.mId,sId:n.sId,vi:n.vi})}} className="bg-white rounded-2xl p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all border border-transparent hover:border-red-100">
                    <div className="flex items-start gap-3">
                      <img src={n.videoThumb} alt="" className="w-24 h-14 object-cover rounded-xl flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {n.minute&&<span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-red-50 text-[#FF0000]">{n.minute}</span>}
                          <span className="text-[9px] text-slate-300 font-medium">{ago(n.ts)}</span>
                        </div>
                        <p className="text-xs text-[#2c2f31] mb-1 font-medium leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{n.modName} › {n.subName}</p>
                      </div>
                      <span className="text-slate-300 group-hover:text-[#FF0000] flex-shrink-0 transition-colors">→</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
        <BottomNav active="vault"/>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: COURSE EDITOR
  // ─────────────────────────────────────────────────────────────
  if(active){
    const owner=isOwner(active);const enrolled=active.enrolledBy?.includes(userHandle)
    return(
      <div className="min-h-screen bg-[#f5f7f9] pb-28">
        <AppHeader onHome={()=>setActiveId(null)} userHandle={userHandle} userImg={userImg} onProfile={()=>setProfileModal(true)} onSignOut={signOut}/>

        <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-8 text-[10px] font-black uppercase tracking-[0.05em] text-slate-400">
            <button onClick={()=>setActiveId(null)} className="hover:text-[#FF0000] transition-colors">Dashboard</button>
            <span>›</span>
            <span>{active.name}</span>
            <span>›</span>
            <span className="text-[#FF0000]">Curriculum</span>
          </nav>

          {/* Course Header */}
          <div className="mb-10">
            {/* Cover image banner */}
            {(active.coverImg||owner)&&(
              <div className="relative w-full h-40 md:h-56 rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-slate-200 to-[#eef1f3] group">
                {active.coverImg
                  ? <img src={active.coverImg} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-slate-400"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                }
                {owner&&(
                  <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-all cursor-pointer group/lbl">
                    <span className="opacity-0 group-hover/lbl:opacity-100 transition-opacity flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-black text-[#2c2f31] uppercase tracking-wider shadow-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {active.coverImg?'Change Cover':'Upload Cover'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setCourses(p=>p.map(c=>c.id===active.id?{...c,coverImg:ev.target?.result as string}:c));r.readAsDataURL(f)}}/>
                  </label>
                )}
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                {owner
                  ? <input value={active.name} onChange={e=>setCourses(p=>p.map(c=>c.id===active.id?{...c,name:e.target.value}:c))} maxLength={120} className="text-3xl md:text-4xl font-black text-[#2c2f31] tracking-tight bg-transparent border-b-2 border-transparent hover:border-[#eef1f3] focus:border-[#FF0000] focus:outline-none w-full mb-3 py-1" onBlur={()=>{if(active.id)sync.updateCourseInDB(active.id,{title:active.name})}}/>
                  : <h1 className="text-3xl md:text-4xl font-black text-[#2c2f31] tracking-tight mb-3">{active.name}</h1>
                }
                {owner
                  ? <textarea value={active.description||""} onChange={e=>setCourses(p=>p.map(c=>c.id===active.id?{...c,description:e.target.value}:c))} placeholder="Add a description..." rows={3} maxLength={500} className="text-lg text-slate-500 leading-relaxed bg-transparent border border-transparent hover:border-[#eef1f3] focus:border-[#FF0000] focus:outline-none w-full resize-none rounded-xl p-2 max-w-3xl" onBlur={()=>{if(active.id)sync.updateCourseInDB(active.id,{description:active.description})}}/>
                  : active.description&&<p className="text-lg text-slate-500 max-w-2xl leading-relaxed">{active.description}</p>
                }
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#eef1f3] text-slate-500 uppercase tracking-wider">{active.category}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{active.modules.length} Modules · {cVC(active)} Videos · {fmtS(cDur(active))}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">👥 {active.enrolledBy?.length||0} Architects</span>
                  <InfoTooltip content={`Created ${active.createdAt?ago(active.createdAt):'recently'} · ${active.isPublic?'Public':'Private'} · by arc/${active.ownerHandle}`}>
                    <span className="text-[10px] text-slate-300 cursor-help border-b border-dotted border-slate-300 font-medium">ⓘ info</span>
                  </InfoTooltip>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                {!owner&&!enrolled&&<button onClick={()=>enrollCourse(active.id)} className="px-6 py-3 rounded-2xl text-sm font-black bg-[#FF0000] text-white hover:bg-red-700 shadow-[0_4px_16px_rgba(255,0,0,0.2)] transition-all flex items-center gap-2">🎯 Lock In →</button>}
                {!owner&&enrolled&&<div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200"><span className="font-black text-sm">✓ Enrolled</span><button onClick={()=>unenrollCourse(active.id)} className="text-xs text-emerald-400 hover:text-red-400 transition-colors font-bold">(leave)</button></div>}
                <div className="flex gap-2 flex-wrap justify-end">
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/><span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">{active.isPublic?'Public':'Private'}</span></div>
                  {active.active&&<div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl"><span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]"/><span className="text-[10px] font-black text-[#FF0000] uppercase tracking-wider">Active</span></div>}
                  <button onClick={()=>setShareTarget(active)} className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 hover:bg-[#eef1f3] border border-[#eef1f3] uppercase tracking-wider">Share</button>
                  <button onClick={()=>setNotesView(true)} className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 hover:text-[#FF0000] border border-[#eef1f3] uppercase tracking-wider">🔐 NoteVault</button>
                  <button onClick={toggleAll} className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 hover:bg-[#eef1f3] border border-[#eef1f3] uppercase tracking-wider">{allExpanded?'Collapse':'Expand'}</button>
                  {owner&&<><button onClick={()=>toggleActive(active.id)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${active.active?'text-emerald-600 border-emerald-200 bg-emerald-50':'text-slate-400 border-[#eef1f3]'} uppercase tracking-wider`}>{active.active?'Active':'Inactive'}</button><button onClick={()=>setDeleteTarget({id:active.id,name:active.name})} className="px-3 py-1.5 rounded-xl text-[10px] font-black text-red-400 border border-red-100 bg-red-50 uppercase tracking-wider">Delete</button></>}
                </div>
              </div>
            </div>
            {cVC(active)>0&&<div className="mt-6"><PBar done={cComp(active)} total={cVC(active)}/></div>}
          </div>

          {/* 12-col grid layout: 8 content + 4 sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Main Curriculum — 8 cols */}
            <div className="lg:col-span-8 space-y-10">
              {active.modules.length===0
                ? <div className="bg-white rounded-2xl py-16 flex flex-col items-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <p className="text-slate-400 font-medium">Empty course — add your first module</p>
                    {owner&&<button onClick={addMod} className="mt-4 px-6 py-3 rounded-2xl text-sm font-black bg-[#FF0000] text-white hover:bg-red-700 shadow-[0_4px_16px_rgba(255,0,0,0.2)] transition-all">+ Add Module</button>}
                  </div>
                : active.modules.map((mod,mi)=>(
                    <section key={mod.id}>
                      {/* Module Header */}
                      <div className="flex items-center justify-between mb-5 group">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <button onClick={()=>togColl(mod.id)} className="text-[#dfe3e6] hover:text-[#FF0000] transition-colors">
                            <span className="text-5xl font-black tracking-tighter leading-none">{String(mi+1).padStart(2,'0')}</span>
                          </button>
                          {editId===mod.id
                            ? <span className="flex items-center gap-2 flex-1">
                                <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} maxLength={80} onKeyDown={e=>{if(e.key==='Enter')doRename('mod')}} className="flex-1 px-3 py-1.5 rounded-xl text-xl font-black border border-[#eef1f3] text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200 min-w-0"/>
                                <button onClick={()=>doRename('mod')} className="text-emerald-500 font-black">✓</button>
                                <button onClick={()=>setEditId(null)} className="text-red-400 font-black">✕</button>
                              </span>
                            : <h2 className="text-2xl font-black tracking-tight text-[#2c2f31] cursor-pointer" onDoubleClick={()=>owner&&startEdit(mod.id,mod.name)}>{mod.name}</h2>
                          }
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-[#FF0000] transition-colors">
                            {mod.subs.reduce((a,s)=>a+s.videos.length,0)} TOPICS · {fmtS(modDur(mod))}
                          </span>
                          <InfoTooltip content={`Created ${mod.createdAt?ago(mod.createdAt):'recently'}`}>
                            <span className="text-[10px] text-slate-300 cursor-help font-medium">ⓘ</span>
                          </InfoTooltip>
                          {owner&&<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>moveMod(mi,-1)} disabled={mi===0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 text-xs font-bold">↑</button>
                            <button onClick={()=>moveMod(mi,1)} disabled={mi===active.modules.length-1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 text-xs font-bold">↓</button>
                            <button onClick={()=>startEdit(mod.id,mod.name)} className="p-1 text-slate-400 hover:text-slate-600 text-xs">✎</button>
                            <button onClick={()=>setDeleteTarget({id:mod.id,name:mod.name,type:'mod'})} className="p-1 text-red-300 hover:text-red-500 text-xs">✕</button>
                          </div>}
                        </div>
                      </div>

                      {/* Progress bar for module */}
                      {mod.subs.reduce((a,s)=>a+s.videos.length,0)>0&&!coll[mod.id]&&(
                        <div className="mb-4"><PBar done={modComp(mod)} total={mod.subs.reduce((a,s)=>a+s.videos.length,0)}/></div>
                      )}

                      {/* Topics */}
                      {!coll[mod.id]&&(
                        <div className="space-y-4">
                          {mod.subs.map((sub,si)=>(
                            <div key={sub.id} className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-transparent hover:border-red-100 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all overflow-hidden group">
                              {/* Sub header */}
                              <div className="flex items-center gap-2 px-5 py-3 bg-[#f5f7f9] border-b border-[#eef1f3]">
                                <button onClick={()=>togColl(sub.id)} className="text-slate-400 text-xs w-4 font-bold">{coll[sub.id]?'▶':'▼'}</button>
                                <span className="text-slate-400 text-xs font-black">#</span>
                                {editId===sub.id
                                  ? <span className="flex items-center gap-1.5 flex-1">
                                      <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} maxLength={60} onKeyDown={e=>{if(e.key==='Enter')doRename('sub',mod.id)}} className="flex-1 px-3 py-1.5 rounded-xl text-sm font-bold border border-[#eef1f3] text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200 min-w-0"/>
                                      <button onClick={()=>doRename('sub',mod.id)} className="text-emerald-500 text-xs font-black">✓</button>
                                      <button onClick={()=>setEditId(null)} className="text-red-400 text-xs font-black">✕</button>
                                    </span>
                                  : <span className="flex-1 text-sm font-black text-[#2c2f31] truncate cursor-pointer" onDoubleClick={()=>startEdit(sub.id,sub.name)}>{sub.name}</span>
                                }
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{sub.videos.length} · {fmtS(subDur(sub))}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="text-[10px] font-black text-[#FF0000] hover:bg-red-50 px-2 py-0.5 rounded-xl">+ Add</button>
                                  {owner&&<><button onClick={()=>startEdit(sub.id,sub.name)} className="p-0.5 text-slate-400 text-[10px]">✎</button><button onClick={()=>moveSub(mod.id,si,-1)} disabled={si===0} className="p-0.5 text-slate-400 disabled:opacity-20 text-[10px] font-bold">↑</button><button onClick={()=>moveSub(mod.id,si,1)} disabled={si===mod.subs.length-1} className="p-0.5 text-slate-400 disabled:opacity-20 text-[10px] font-bold">↓</button><button onClick={()=>setDeleteTarget({id:sub.id,name:sub.name,type:'sub',mId:mod.id})} className="p-0.5 text-red-300 hover:text-red-500 text-[10px]" title="Remove topic">✕</button></>}
                                </div>
                              </div>

                              {/* Videos */}
                              {!coll[sub.id]&&(
                                <div className="p-4 space-y-3">
                                  {sub.videos.length>0&&<PBar done={subComp(sub)} total={sub.videos.length}/>}
                                  {sub.videos.length===0
                                    ? <div className="py-10 flex flex-col items-center text-slate-400">
                                        <p className="text-sm font-medium">Paste a YouTube link to add videos</p>
                                        <button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="mt-2 text-[11px] font-black text-[#FF0000] hover:underline">+ Add video</button>
                                      </div>
                                    : <>
                                        {sub.videos.map((v,vi)=>{
                                          const unlocked=getUnlockedVids(sub,active.ownerHandle)
                                          const isLocked=!unlocked.has(v.iid)
                                          return(
                                          <div key={v.iid} className={`flex items-start gap-3 p-1 hover:bg-[#f5f7f9] rounded-2xl group/v transition-colors ${isLocked?'opacity-60':''}`}>
                                            <VotePill score={v.votes} voted={getVoteDir(v)} onUp={()=>voteVid(mod.id,sub.id,vi,'up')} onDown={()=>voteVid(mod.id,sub.id,vi,'down')}/>
                                            <button onClick={()=>toggleComp(mod.id,sub.id,vi)} className="flex-shrink-0 mt-3 text-sm">
                                              {v.completed?<span className="text-emerald-500 font-black">✓</span>:<span className="text-slate-300">○</span>}
                                            </button>
                                            <div className={`relative flex-shrink-0 w-36 cursor-pointer mt-0.5 group/thumb`} onClick={()=>{if(isLocked){setEnrollModal(true)}else{setPV({mId:mod.id,sId:sub.id,vi})}}}>
                                              {isLocked
                                                ? <div className="w-full h-20 rounded-xl bg-[#eef1f3] flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                                                : <><img src={v.thumbnail} alt="" className="w-full h-20 object-cover rounded-xl"/><div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-xl"><div className="w-8 h-8 bg-[#FF0000]/90 rounded-full flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div><span className="absolute bottom-1 right-1 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded-md font-bold">{v.duration}</span></>
                                              }
                                            </div>
                                            <div className="flex-1 min-w-0 cursor-pointer pt-0.5" onClick={()=>{if(isLocked){setEnrollModal(true)}else{setPV({mId:mod.id,sId:sub.id,vi})}}}>
                                              <p className={`text-sm font-bold text-[#2c2f31] line-clamp-2 tracking-tight ${v.completed?'opacity-50 line-through':''}`}>{v.title}</p>
                                              <div className="flex items-center gap-1.5 mt-1">{v.channelImg&&<img src={v.channelImg} alt="" className="w-3 h-3 rounded-full object-cover"/>}<span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{v.channel}</span>{isLocked&&<span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#eef1f3] text-slate-400 uppercase tracking-wider">ENROLL TO UNLOCK</span>}</div>
                                              <div className="flex gap-2 text-[8px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider"><span>{v.viewsShort||v.views}</span><span>{v.likesShort||v.likes}</span>{v.createdAt&&<span>· {ago(v.createdAt)}</span>}</div>
                                            </div>
                                            {owner&&<div className="opacity-0 group-hover/v:opacity-100 transition-opacity mt-1">
                                              <button onClick={e=>{e.stopPropagation();setDeleteTarget({id:v.iid,name:v.title,type:'vid',mId:mod.id,sId:sub.id,vi})}} className="p-1.5 text-red-300 hover:text-red-500 text-[10px]" title="Remove video">✕</button>
                                            </div>}
                                          </div>
                                        )})}
                                        {owner&&<button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="w-full py-2 text-[11px] font-black text-slate-400 hover:text-[#FF0000] uppercase tracking-wider transition-colors">+ Add video</button>}
                                      </>
                                  }
                                </div>
                              )}
                            </div>
                          ))}
                          {owner&&<button onClick={()=>addSub(mod.id)} className="w-full py-2.5 text-xs font-black text-slate-400 hover:text-[#FF0000] uppercase tracking-wider transition-colors">+ New Topic</button>}
                        </div>
                      )}
                    </section>
                  ))
              }
              {owner&&active.modules.length>0&&(
                <button onClick={addMod} className="w-full py-4 bg-white rounded-2xl text-sm font-black text-slate-400 hover:text-[#FF0000] hover:border-red-100 border border-[#eef1f3] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all uppercase tracking-wider">+ Add Module</button>
              )}
            </div>

            {/* Sidebar — 4 cols */}
            <div className="lg:col-span-4 space-y-6">
              {/* Course Stats */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent hover:border-red-50 transition-colors">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#2c2f31] mb-5">Course Stats</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500 font-medium">Completion</span>
                      <span className="text-sm font-black text-[#2c2f31]">{cVC(active)>0?Math.round(cComp(active)/cVC(active)*100):0}%</span>
                    </div>
                    {cVC(active)>0&&<PBar done={cComp(active)} total={cVC(active)}/>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Active Students</span>
                    <span className="text-sm font-black text-[#2c2f31]">{active.enrolledBy?.length||0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Total Videos</span>
                    <span className="text-sm font-black text-[#2c2f31]">{cVC(active)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Duration</span>
                    <span className="text-sm font-black text-[#2c2f31]">{fmtS(cDur(active))}</span>
                  </div>
                </div>
              </div>

              {/* Instructor Card */}
              <div className="bg-[#f5f7f9] rounded-2xl p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-md">
                  {active.ownerImg
                    ? <img src={active.ownerImg} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-[#eef1f3] flex items-center justify-center text-xl font-black text-slate-400">{active.owner[0]?.toUpperCase()}</div>
                  }
                </div>
                <h4 className="text-base font-black text-[#2c2f31]">{active.owner}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF0000] mt-1">arc/{active.ownerHandle}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Master Architect</p>
              </div>

              {/* Enroll CTA */}
              {!owner&&!enrolled&&(
                <button onClick={()=>enrollCourse(active.id)} className="w-full py-4 rounded-2xl font-black text-base bg-[#FF0000] text-white shadow-[0_8px_24px_rgba(255,0,0,0.25)] hover:bg-red-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                  🎯 Lock In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add Video / Suggest Better Modal */}
        {modal?.type==='addVideo'&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">{pv?'Suggest a Better Video':'Add YouTube Video'}</h3>
                  {pv&&<p className="text-[10px] text-slate-400 mt-0.5">This video will be added to the topic for others to discover and vote on</p>}
                </div>
                <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchLink()} placeholder="https://youtube.com/watch?v=..." className="flex-1 px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-sm text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200"/>
                  <button onClick={fetchLink} disabled={!inputVal.trim()||fetching} className="px-5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 flex items-center gap-1 hover:bg-red-700 transition-colors">
                    {fetching?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Fetch'}
                  </button>
                </div>
                {fetchError&&<p className="text-xs text-red-500 font-medium">{fetchError}</p>}
                {preview&&(
                  <div className="border border-[#eef1f3] rounded-2xl overflow-hidden">
                    <img src={preview.thumbnail} alt="" className="w-full h-44 object-cover"/>
                    <div className="p-4">
                      <h4 className="text-sm font-black text-[#2c2f31] line-clamp-2 tracking-tight">{preview.title}</h4>
                      <div className="flex items-center gap-2 mt-2">{preview.channelImg&&<img src={preview.channelImg} alt="" className="w-5 h-5 rounded-full object-cover"/>}<span className="text-xs font-bold text-slate-600">{preview.channel}</span></div>
                      <div className="flex gap-3 text-[11px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider"><span>{preview.views} views</span><span>{preview.likes} likes</span><span>{preview.duration}</span></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={()=>setModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:bg-[#f5f7f9] border border-[#eef1f3] uppercase tracking-wider">Cancel</button>
                  <button onClick={addVid} disabled={!preview} className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 hover:bg-red-700 uppercase tracking-wider">Add Video</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {profileModal&&<ProfileModalInner user={user} customAvatar={customAvatar} setCustomAvatar={setCustomAvatar} onClose={()=>setProfileModal(false)}/>}
        {deleteTarget&&<DeleteModal name={deleteTarget.name} onClose={()=>setDeleteTarget(null)} onConfirm={()=>{if(deleteTarget.type==='mod')delMod(deleteTarget.id);else if(deleteTarget.type==='sub')delSub(deleteTarget.mId,deleteTarget.id);else if(deleteTarget.type==='vid')delVid(deleteTarget.mId,deleteTarget.sId,deleteTarget.vi);else delCourse(deleteTarget.id);setDeleteTarget(null)}}/>}
        {shareTarget&&<ShareModal course={shareTarget} onClose={()=>setShareTarget(null)}/>}
        <BottomNav active="courses"/>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: DASHBOARD (HOME FEED)
  // ─────────────────────────────────────────────────────────────

  function ProfileModalInner({user,customAvatar,setCustomAvatar,onClose}:any){
    return(
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e:any)=>e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">Edit Profile</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-wider">Choose Avatar</p>
            <div className="grid grid-cols-4 gap-3">
              {user?.user_metadata?.avatar_url&&(
                <button onClick={()=>{setCustomAvatar("");localStorage.setItem("arc_avatar","");onClose()}} className={"w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all "+(!customAvatar?"border-[#FF0000] ring-2 ring-red-200":"border-[#eef1f3] hover:border-slate-300")}>
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/>
                </button>
              )}
              {AVATARS.map(av=>(
                <button key={av.id} onClick={()=>{setCustomAvatar(av.src);localStorage.setItem("arc_avatar",av.src);onClose()}} className={"w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all "+(customAvatar===av.src?"border-[#FF0000] ring-2 ring-red-200":"border-[#eef1f3] hover:border-slate-300")}>
                  <img src={av.src} className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return(
    <div className="min-h-screen bg-[#f5f7f9] pb-28">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-200/40 border-b border-slate-200/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF0000] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">Course Architect</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setProfileModal(true)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xs font-black text-[#FF0000] tracking-tight">arc/{userHandle}</span>
            {userImg
              ? <img src={userImg} alt="" className="w-9 h-9 rounded-full border-2 border-red-100 object-cover"/>
              : <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-xs font-black text-[#FF0000]">{userHandle[0]?.toUpperCase()}</div>
            }
          </button>
          <button onClick={signOut} className="text-[11px] font-black text-slate-400 hover:text-[#FF0000] transition-colors uppercase tracking-wider">Out</button>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-4xl mx-auto">
        {/* Feed breadcrumb/nav */}
        <nav className="mb-6 flex items-center gap-3 overflow-x-auto py-1">
          <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#FF0000] whitespace-nowrap">Feed</span>
          <span className="text-slate-300 text-xs">›</span>
          <div className="ml-auto flex gap-2">
            <button onClick={()=>setDashTab('my')} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${dashTab==='my'?'bg-[#FF0000] text-white':'bg-[#eef1f3] text-slate-500 hover:bg-[#dfe3e6]'}`}>My Courses</button>
            <button onClick={()=>setDashTab('enrolled')} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${dashTab==='enrolled'?'bg-[#FF0000] text-white':'bg-[#eef1f3] text-slate-500 hover:bg-[#dfe3e6]'}`}>Enrolled</button>
            <button onClick={()=>setDashTab('trending')} className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${dashTab==='trending'?'bg-[#FF0000] text-white':'bg-[#eef1f3] text-slate-500 hover:bg-[#dfe3e6]'}`}>🔥 Explore</button>
          </div>
        </nav>

        {/* Join by code */}
        <div className="bg-white rounded-2xl p-4 flex gap-3 items-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-5 border border-transparent hover:border-red-100 transition-colors">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Have a code?</span>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC-123" maxLength={7} className="px-3 py-2 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs font-black font-mono text-[#2c2f31] w-24 text-center focus:outline-none focus:ring-2 focus:ring-red-200"/>
          <button onClick={joinByCode} disabled={joinCode.length<5} className="px-4 py-2 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 hover:bg-red-700 transition-colors uppercase tracking-wider">Join</button>
        </div>

        {/* MY COURSES TAB */}
        {dashTab==='my'&&(
          <div className="space-y-4">
            {coursesLoading&&(
              <div className="bg-white rounded-2xl p-10 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="w-10 h-10 border-3 border-[#FF0000] border-t-transparent rounded-full animate-spin mb-4"/>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Loading your courses...</p>
              </div>
            )}
            {!coursesLoading&&myCourses.length===0&&(
              <div className="bg-white rounded-2xl p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 className="text-2xl font-black text-[#2c2f31] tracking-tight mb-2">Welcome, arc/{userHandle}!</h3>
                <p className="text-sm text-slate-400 font-medium">Create your first course below and start building.</p>
              </div>
            )}
            {myCourses.map(c=>(
              <article key={c.id} onClick={()=>setActiveId(c.id)} className="bg-white rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-red-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group">
                {c.coverImg&&<div className="h-28 overflow-hidden"><img src={c.coverImg} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 bg-[#eef1f3] px-2 py-1 rounded-lg">{c.category}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{c.isPublic?'🌐 Public':'🔒 Private'}</span>
                      {!c.active&&<span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Inactive</span>}
                    </div>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-[#2c2f31] mb-3 group-hover:text-[#FF0000] transition-colors">{c.name}</h2>
                  {c.description&&<p className="text-sm text-slate-500 mb-3 line-clamp-2 font-medium leading-relaxed">{c.description}</p>}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.modules.length} mod · {cVC(c)} vid · {fmtS(cDur(c))} · 👥 {c.enrolledBy?.length||0}</p>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300 group-hover:text-[#FF0000] transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  {cVC(c)>0&&<div className="mt-3"><PBar done={cComp(c)} total={cVC(c)}/></div>}
                </div>
              </article>
            ))}
            <button onClick={()=>{setModal('newCourse');setInputVal('');setDescVal('');setCatVal(CATEGORIES[0]);setCoverVal('')}} className="w-full py-4 rounded-2xl text-sm font-black bg-[#FF0000] text-white hover:bg-red-700 shadow-[0_4px_16px_rgba(255,0,0,0.2)] transition-all uppercase tracking-wider">+ Create New Course</button>
          </div>
        )}

        {/* ENROLLED TAB */}
        {dashTab==='enrolled'&&(
          <div className="space-y-4">
            {enrolledCourses.length===0
              ? <div className="bg-white rounded-2xl p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]"><p className="text-sm text-slate-400 font-medium">No enrolled courses yet</p></div>
              : enrolledCourses.map(c=>(
                  <article key={c.id} onClick={()=>setActiveId(c.id)} className="bg-white rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-red-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all group">
                    {c.coverImg&&<div className="h-28 overflow-hidden"><img src={c.coverImg} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div>}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 bg-[#eef1f3] px-2 py-1 rounded-lg">{c.category}</span>
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-[#2c2f31] mb-1 group-hover:text-[#FF0000] transition-colors">{c.name}</h2>
                      <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">by arc/{c.ownerHandle} · {cVC(c)} vid · {fmtS(cDur(c))}</p>
                      {cVC(c)>0&&<PBar done={cComp(c)} total={cVC(c)}/>}
                    </div>
                  </article>
                ))
            }
          </div>
        )}

        {/* TRENDING/EXPLORE TAB */}
        {dashTab==='trending'&&(()=>{
          const publicCourses=courses.filter(c=>c.isPublic&&c.active)
          const featured=publicCourses[0]
          const rest=publicCourses.slice(1)
          return(
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Course › <span className="text-[#FF0000]">Explore Trending</span></p>
                  <h2 className="text-3xl font-black tracking-tight text-[#2c2f31] leading-tight">Curated Minds</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Discover the courses shaping the next generation of builders.</p>
                </div>
                {/* Category pills */}
                <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
                  {CATEGORIES.slice(0,6).map(cat=>{
                    const f=followedCats.includes(cat)
                    return(
                      <button key={cat} onClick={()=>setFollowedCats(p=>f?p.filter(c=>c!==cat):[...p,cat])} className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider transition-colors whitespace-nowrap ${f?'bg-red-50 text-[#FF0000] border-red-200':'bg-white text-slate-400 border-[#eef1f3] hover:border-slate-300'}`}>
                        {f?'✓ ':''}{cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {publicCourses.length===0
                ? <div className="bg-white rounded-2xl p-16 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <p className="text-2xl mb-2">🏗️</p>
                    <p className="text-sm font-black text-[#2c2f31] mb-1 uppercase tracking-wider">No public courses yet</p>
                    <p className="text-xs text-slate-400 font-medium">Be the first to publish a course for the community.</p>
                  </div>
                : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* FEATURED card — col-span-2, shown when there's at least 1 course */}
                    {featured&&(
                      <div onClick={()=>setActiveId(featured.id)} className="md:col-span-2 group bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col md:flex-row cursor-pointer hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all border border-transparent hover:border-red-100">
                        {/* Left: thumbnail / gradient placeholder */}
                        <div className="md:w-1/2 h-52 md:h-auto overflow-hidden relative flex-shrink-0 bg-gradient-to-br from-[#2c2f31] to-slate-700">
                          {featured.coverImg
                            ? <img src={featured.coverImg} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                            : <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-[#FF0000]/30 group-hover:scale-105 transition-transform duration-700"/>
                          }
                          <div className="absolute inset-0 flex items-end p-5">
                            <div className="flex items-center gap-2 text-[#FF0000] font-black text-[10px] uppercase tracking-[0.2em] bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              Featured Masterclass
                            </div>
                          </div>
                        </div>
                        {/* Right: content */}
                        <div className="flex-1 p-8 flex flex-col justify-center gap-5">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 bg-[#eef1f3] px-2 py-1 rounded-lg">{featured.category}</span>
                            <h2 className="text-2xl font-black tracking-tight text-[#2c2f31] mt-3 mb-2 leading-tight group-hover:text-[#FF0000] transition-colors">{featured.name}</h2>
                            {featured.description&&<p className="text-sm text-slate-500 leading-relaxed line-clamp-2 font-medium">{featured.description}</p>}
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">by arc/{featured.ownerHandle} · {cVC(featured)} vid · {fmtS(cDur(featured))} · 👥 {featured.enrolledBy?.length||0}</p>
                          {featured.enrolledBy?.includes(userHandle)&&cVC(featured)>0&&<PBar done={cComp(featured)} total={cVC(featured)}/>}
                          <div className="flex gap-3">
                            {!featured.enrolledBy?.includes(userHandle)&&featured.ownerHandle!==userHandle
                              ? <button onClick={e=>{e.stopPropagation();enrollCourse(featured.id)}} className="px-6 py-3 bg-[#FF0000] text-white font-black rounded-xl text-xs uppercase tracking-[0.15em] shadow-[0_4px_16px_rgba(255,0,0,0.25)] hover:bg-red-700 active:scale-95 transition-all">🎯 Lock In</button>
                              : featured.ownerHandle===userHandle
                                ? <button onClick={e=>{e.stopPropagation();setActiveId(featured.id)}} className="px-6 py-3 bg-[#2c2f31] text-white font-black rounded-xl text-xs uppercase tracking-[0.15em] hover:bg-slate-700 active:scale-95 transition-all">Open Course →</button>
                                : <span className="px-5 py-3 bg-emerald-50 text-emerald-600 font-black rounded-xl text-xs uppercase tracking-[0.15em] border border-emerald-200">✓ Enrolled</span>
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REGULAR cards — the rest */}
                    {rest.map((c,i)=>(
                      <div key={c.id} onClick={()=>setActiveId(c.id)} className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-red-100 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                        {/* Card color band — cycles through a few palettes */}
                        <div className={`h-40 relative overflow-hidden flex-shrink-0 ${
                          !c.coverImg?(i%4===0?'bg-gradient-to-br from-slate-100 to-[#eef1f3]':
                          i%4===1?'bg-gradient-to-br from-red-50 to-red-100/60':
                          i%4===2?'bg-gradient-to-br from-slate-800 to-slate-600':
                                  'bg-gradient-to-br from-[#eef1f3] to-slate-200'):'bg-[#eef1f3]'
                        }`}>
                          {c.coverImg&&<img src={c.coverImg} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>}
                          <div className="absolute top-3 right-3">
                            {i===0&&<span className="bg-[#FF0000] text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">Hot 🔥</span>}
                          </div>
                          <div className="absolute bottom-3 left-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/50">{c.category}</span>
                          </div>
                        </div>
                        {/* Content */}
                        <div className="p-5 flex flex-col gap-3 flex-1">
                          <div>
                            <h3 className="text-base font-black tracking-tight text-[#2c2f31] group-hover:text-[#FF0000] transition-colors leading-snug">{c.name}</h3>
                            <p className="text-[11px] text-slate-400 font-bold mt-0.5">by arc/{c.ownerHandle}</p>
                          </div>
                          {c.enrolledBy?.includes(userHandle)&&cVC(c)>0&&<PBar done={cComp(c)} total={cVC(c)}/>}
                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cVC(c)} vid · 👥 {c.enrolledBy?.length||0}</p>
                            {!c.enrolledBy?.includes(userHandle)&&c.ownerHandle!==userHandle
                              ? <button onClick={e=>{e.stopPropagation();enrollCourse(c.id)}} className="px-4 py-2 bg-[#FF0000] text-white font-black rounded-xl text-[10px] uppercase tracking-wider shadow-[0_2px_8px_rgba(255,0,0,0.2)] hover:bg-red-700 active:scale-95 transition-all">Lock In</button>
                              : c.enrolledBy?.includes(userHandle)
                                ? <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-black rounded-xl text-[10px] border border-emerald-200 uppercase tracking-wider">✓ In</span>
                                : null
                            }
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* If only 1 course total (the featured), show empty slot hint */}
                    {publicCourses.length===1&&(
                      <div className="group bg-white rounded-2xl overflow-hidden border-2 border-dashed border-[#eef1f3] flex flex-col items-center justify-center gap-3 p-8 min-h-[200px]">
                        <div className="w-10 h-10 rounded-2xl bg-[#f5f7f9] flex items-center justify-center text-xl">🏗️</div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">More courses coming</p>
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          )
        })()}
      </main>

      {/* Profile Modal */}
      {profileModal&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setProfileModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">Edit Profile</h3>
              <button onClick={()=>setProfileModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-wider">Choose Avatar</p>
              <div className="grid grid-cols-4 gap-3">
                {user?.user_metadata?.avatar_url&&(
                  <button onClick={()=>{setCustomAvatar("");localStorage.setItem("arc_avatar","");setProfileModal(false)}} className={"w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all "+(!customAvatar?"border-[#FF0000] ring-2 ring-red-200":"border-[#eef1f3] hover:border-slate-300")}>
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/>
                  </button>
                )}
                {AVATARS.map(av=>(
                  <button key={av.id} onClick={()=>{setCustomAvatar(av.src);localStorage.setItem("arc_avatar",av.src);setProfileModal(false)}} className={"w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all "+(customAvatar===av.src?"border-[#FF0000] ring-2 ring-red-200":"border-[#eef1f3] hover:border-slate-300")}>
                    <img src={av.src} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Course Modal */}
      {modal==='newCourse'&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#eef1f3] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#2c2f31] uppercase tracking-wider">New Course</h3>
              <button onClick={()=>setModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} placeholder="Course name..." className="w-full px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-sm font-bold text-[#2c2f31] focus:outline-none focus:ring-2 focus:ring-red-200"/>
              <textarea value={descVal} onChange={e=>setDescVal(e.target.value)} placeholder="Description..." rows={2} className="w-full px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs text-[#2c2f31] focus:outline-none resize-none"/>
              <select value={catVal} onChange={e=>setCatVal(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#eef1f3] bg-[#f5f7f9] text-xs font-bold text-[#2c2f31] focus:outline-none">
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {/* Cover image upload — required */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Cover Image <span className="text-[#FF0000]">*</span></label>
                <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden relative ${coverVal?'border-[#FF0000]/30':'border-[#eef1f3] hover:border-[#FF0000]/30 hover:bg-red-50/30'}`}>
                  {coverVal
                    ? <><img src={coverVal} alt="" className="absolute inset-0 w-full h-full object-cover"/><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="text-white text-xs font-black uppercase tracking-wider">Change Photo</span></div></>
                    : <div className="flex flex-col items-center gap-2 text-slate-400"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span className="text-xs font-black uppercase tracking-wider">Upload Cover Photo</span><span className="text-[10px]">JPG, PNG, WEBP</span></div>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setCoverVal(ev.target?.result as string);r.readAsDataURL(f)}}/>
                </label>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Required to create your course</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={()=>createCourse(false)} disabled={!inputVal.trim()||!coverVal.trim()} className="px-5 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-[#f5f7f9] disabled:opacity-40 border border-[#eef1f3] uppercase tracking-wider">🔒 Private</button>
                <button onClick={()=>createCourse(true)} disabled={!inputVal.trim()||!coverVal.trim()} className="px-5 py-3 rounded-xl text-xs font-black bg-[#FF0000] text-white disabled:opacity-40 hover:bg-red-700 uppercase tracking-wider shadow-[0_4px_12px_rgba(255,0,0,0.2)] transition-all">🌐 Public</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home"/>
    </div>
  )
}
