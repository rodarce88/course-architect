'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { formatDistanceToNow } from 'date-fns'
const YouTubePlayer = dynamic(() => import('@/components/YouTubePlayer'), { ssr: false })

type Video={id:string;iid:string;title:string;thumbnail:string;channel:string;channelImg:string;subscribers:string;views:string;viewsShort?:string;likes:string;likesShort?:string;duration:string;url:string;completed:boolean;notes:Note[];votes:number;votedBy:string[]}
type Note={id:string;minute:string;text:string;author:string;authorHandle:string;authorImg:string;ts:number;isPublic:boolean;reactions:Record<string,string[]>}
type Sub={id:string;name:string;videos:Video[];createdAt:number}
type Mod={id:string;name:string;subs:Sub[];createdAt:number}
type Course={id:string;name:string;description:string;modules:Mod[];isPublic:boolean;active:boolean;owner:string;ownerHandle:string;ownerImg:string;category:string;enrolledBy:string[];shareCode:string;createdAt:number}

const CATEGORIES=['Programming','Web Development','Data Science','AI & Machine Learning','Mobile Development','DevOps','Cybersecurity','Game Development','UI/UX Design','Digital Marketing','Photography','Video Editing','Music Production','3D Modeling','Finance','Language Learning','Cooking','Fitness','Business','Personal Development']
const AVATARS=[{id:"galileo-1",name:"Galileo I",src:"/avatars/galileo-1.jpeg"},{id:"galileo-2",name:"Galileo II",src:"/avatars/galileo-2.jpeg"},{id:"galileo-3",name:"Galileo III",src:"/avatars/galileo-3.jpeg"},{id:"galileo-4",name:"Galileo IV",src:"/avatars/galileo-4.jpeg"},{id:"davinci-1",name:"Da Vinci I",src:"/avatars/davinci-1.jpeg"},{id:"davinci-2",name:"Da Vinci II",src:"/avatars/davinci-2.jpeg"},{id:"davinci-3",name:"Da Vinci III",src:"/avatars/davinci-3.jpeg"}]
const REACTION_EMOJIS=['🚀','💡','✅','🔥','❤️','👏','🎯','💯','🧠','⭐','👀','😂','🤔','📌','💎','🙌','⚡','🎉','👍','📝']

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

function Vote({score,voted,onUp,onDown}:{score:number;voted:string;onUp:()=>void;onDown:()=>void}){
  return(<div className="flex flex-col items-center gap-0.5">
    <button onClick={e=>{e.stopPropagation();onUp()}} className={`p-1 rounded transition-colors ${voted==='up'?'text-[#FF4500]':'text-gray-400 hover:text-[#FF4500] hover:bg-orange-50'}`}><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 9H2L8 2Z"/></svg></button>
    <span className={`text-xs font-bold tabular-nums ${voted==='up'?'text-[#FF4500]':voted==='down'?'text-blue-500':'text-gray-500'}`}>{score}</span>
    <button onClick={e=>{e.stopPropagation();onDown()}} className={`p-1 rounded transition-colors ${voted==='down'?'text-blue-500':'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14L2 7H14L8 14Z"/></svg></button>
  </div>)
}
function VoteSmall({score,voted,onUp,onDown}:{score:number;voted:string;onUp:()=>void;onDown:()=>void}){
  return(<div className="flex flex-col items-center gap-0" onClick={e=>e.stopPropagation()}>
    <button onClick={e=>{e.stopPropagation();onUp()}} className={`p-0.5 rounded ${voted==='up'?'text-[#FF4500]':'text-gray-400 hover:text-[#FF4500]'}`}><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3L13 8H3L8 3Z"/></svg></button>
    <span className={`text-[9px] font-bold tabular-nums ${voted==='up'?'text-[#FF4500]':voted==='down'?'text-blue-500':'text-gray-400'}`}>{score}</span>
    <button onClick={e=>{e.stopPropagation();onDown()}} className={`p-0.5 rounded ${voted==='down'?'text-blue-500':'text-gray-400 hover:text-blue-500'}`}><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 13L3 8H13L8 13Z"/></svg></button>
  </div>)
}

function PBar({done,total}:{done:number;total:number}){const p=total===0?0:Math.round(done/total*100);return(<div className="flex items-center gap-2 w-full"><div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden"><div className={`h-1 rounded-full transition-all duration-500 ${p===100?'bg-green-500':'bg-[#FF4500]'}`} style={{width:`${p}%`}}/></div><span className={`text-[10px] font-medium tabular-nums ${p===100?'text-green-500':'text-gray-400'}`}>{p}%</span></div>)}
function InfoTooltip({children,content}:{children:React.ReactNode;content:string}){const[show,setShow]=useState(false);return(<div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>{children}{show&&<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap z-50 shadow-lg">{content}</div>}</div>)}
function NumpadModal({value,onChange,onClose,onCapture,currentTime}:{value:string;onChange:(v:string)=>void;onClose:()=>void;onCapture:()=>void;currentTime:string}){
  const[raw,setRaw]=useState(value.replace(/:/g,''))
  const fmt=(r:string)=>{const d=r.replace(/\D/g,'');if(d.length<=2)return d;if(d.length<=4)return d.slice(0,-2)+':'+d.slice(-2);return d.slice(0,-4)+':'+d.slice(-4,-2)+':'+d.slice(-2)}
  const press=(n:string)=>{if(raw.length>=6)return;const next=raw+n;setRaw(next);onChange(fmt(next))}
  const del=()=>{const next=raw.slice(0,-1);setRaw(next);onChange(next?fmt(next):'')}
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}><div className="bg-white border border-gray-200 rounded-lg p-5 w-64 shadow-xl" onClick={e=>e.stopPropagation()}>
    <div className="text-center py-3 mb-3 rounded-lg bg-gray-50 border border-gray-200 text-2xl font-mono font-bold text-gray-800">{value||'0:00'}</div>
    <button onClick={()=>{onCapture();onClose()}} className="w-full mb-3 py-2 rounded-lg text-xs font-bold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600">⏱ Capture ({currentTime})</button>
    <div className="grid grid-cols-3 gap-1.5">{['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} onClick={()=>press(n)} className="py-3 rounded-lg text-base font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 active:scale-95 text-gray-700">{n}</button>)}
    <button onClick={()=>{setRaw('');onChange('')}} className="py-3 rounded-lg text-xs font-bold text-red-400 bg-gray-50 border border-gray-200">CLR</button>
    <button onClick={()=>press('0')} className="py-3 rounded-lg text-base font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700">0</button>
    <button onClick={del} className="py-3 rounded-lg text-sm font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700">⌫</button></div>
    <button onClick={onClose} className="w-full mt-3 py-2 rounded-lg text-sm font-bold bg-[#FF4500] text-white">Done</button>
  </div></div>)
}
function DeleteModal({name,onConfirm,onClose}:{name:string;onConfirm:()=>void;onClose:()=>void}){
  const[input,setInput]=useState('')
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}>
    <div className="p-6 space-y-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto"><span className="text-2xl">⚠️</span></div>
    <h3 className="text-base font-bold text-gray-900 text-center">Are you absolutely sure?</h3>
    <p className="text-xs text-gray-500 text-center">This action cannot be undone. All data for <strong>"{name}"</strong> will be permanently deleted.</p>
    <div><label className="text-xs text-gray-500 block mb-1">Type <strong className="text-red-500">DELETE</strong> to confirm:</label>
    <input value={input} onChange={e=>setInput(e.target.value)} placeholder="DELETE" className="w-full px-3 py-2.5 rounded-sm border border-gray-300 text-sm text-gray-800 font-mono text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-red-300"/></div>
    <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2.5 rounded-sm text-xs text-gray-500 hover:bg-gray-100 border border-gray-200">Cancel</button>
    <button onClick={onConfirm} disabled={input!=='DELETE'} className="flex-1 py-2.5 rounded-sm text-xs font-bold bg-red-600 text-white disabled:opacity-30 hover:bg-red-700">Delete Permanently</button></div></div>
  </div></div>)
}
function ShareModal({course,onClose}:{course:Course;onClose:()=>void}){
  const[copied,setCopied]=useState('')
  const link=typeof window!=='undefined'?`${window.location.origin}?c=${course.id}`:'';
  const copy=(t:string,l:string)=>{navigator.clipboard.writeText(t);setCopied(l);setTimeout(()=>setCopied(''),2000)}
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}>
    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">Share Course</h3><button onClick={onClose} className="text-gray-400">✕</button></div>
    <div className="p-5 space-y-4">
      <div><label className="text-xs text-gray-500 block mb-1.5">Course Link</label><div className="flex gap-2"><input readOnly value={link} className="flex-1 px-3 py-2 rounded-sm border border-gray-200 text-xs text-gray-600 bg-gray-50"/><button onClick={()=>copy(link,'link')} className={`px-3 py-2 rounded-sm text-xs font-bold ${copied==='link'?'bg-green-500 text-white':'bg-[#FF4500] text-white'}`}>{copied==='link'?'✓':'Copy'}</button></div></div>
      <div><label className="text-xs text-gray-500 block mb-1.5">Course Code</label><div className="flex items-center gap-3"><span className="text-2xl font-mono font-black text-gray-900 tracking-widest bg-gray-50 border border-gray-200 px-4 py-2 rounded-sm">{course.shareCode}</span><button onClick={()=>copy(course.shareCode,'code')} className={`px-3 py-2 rounded-sm text-xs font-bold ${copied==='code'?'bg-green-500 text-white':'bg-gray-100 text-gray-600'}`}>{copied==='code'?'✓':'Copy'}</button></div></div>
      <div className="flex gap-2"><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${course.name}" on Course Architect! ${link}`)}`} target="_blank" className="flex-1 py-2 rounded-sm text-xs font-bold bg-black text-white text-center">𝕏 Post</a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" className="flex-1 py-2 rounded-sm text-xs font-bold bg-[#0077B5] text-white text-center">LinkedIn</a></div>
    </div>
  </div></div>)
}
// Handle setup modal
function HandleModal({onSave}:{onSave:(h:string)=>void}){
  const[h,setH]=useState('')
  const valid=h.length>=3&&/^[a-zA-Z0-9_]+$/.test(h)
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white border border-gray-200 rounded-sm w-full max-w-sm shadow-xl p-6 space-y-4">
    <div className="text-center"><div className="w-12 h-12 rounded-full bg-[#FF4500] flex items-center justify-center mx-auto mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
    <h3 className="text-base font-bold text-gray-900">Choose your handle</h3><p className="text-xs text-gray-500">This is how others will see you</p></div>
    <div className="flex items-center gap-0 border border-gray-300 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-[#FF4500]/30"><span className="px-3 py-2.5 bg-gray-100 text-sm font-bold text-[#FF4500] border-r border-gray-300">arc/</span><input value={h} onChange={e=>setH(e.target.value.replace(/[^a-zA-Z0-9_]/g,'').slice(0,20))} placeholder="yourname" className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none"/></div>
    <p className="text-[10px] text-gray-400">{h.length}/20 · Letters, numbers, and underscores only</p>
    <button onClick={()=>valid&&onSave(h)} disabled={!valid} className="w-full py-2.5 rounded-sm text-sm font-bold bg-[#FF4500] text-white disabled:opacity-40">Continue</button>
  </div></div>)
}

export default function Home(){
  const[user,setUser]=useState<any>(null)
  const[handle,setHandle]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[courses,setCourses]=useState<Course[]>([])
  const[seeded,setSeeded]=useState(false)
  const[activeId,setActiveId]=useState<string|null>(null)
  const[modal,setModal]=useState<any>(null)
  const[inputVal,setInputVal]=useState('')
  const[descVal,setDescVal]=useState('')
  const[catVal,setCatVal]=useState(CATEGORIES[0])
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
  const[sidebarSort,setSidebarSort]=useState<"votes"|"views">("votes")
  const[filterCreator,setFilterCreator]=useState<string>("")
  const[profileModal,setProfileModal]=useState(false)
  const[customAvatar,setCustomAvatar]=useState<string|null>(null)
  const ytRef=useRef<any>(null)

  useEffect(()=>{if(courses.length===0){fetch("/data/course-resolve.json").then(r=>r.json()).then(d=>{if(d&&d.id)setCourses(prev=>[...prev,d])}).catch(()=>{})}},[])
  const active=courses.find(c=>c.id===activeId)
  const togColl=(id:string)=>setColl(p=>({...p,[id]:!p[id]}))
  const upC=(fn:(c:Course)=>Course)=>setCourses(p=>p.map(c=>c.id===activeId?fn(c):c))
  const userHandle=handle||'anon'
  const userName=user?.user_metadata?.full_name||user?.email||'Anon'
  const userImg=customAvatar||user?.user_metadata?.avatar_url||''
  const isOwner=(c:Course)=>c.ownerHandle===userHandle

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setUser(session?.user??null);setLoading(false)});return()=>subscription.unsubscribe()},[])
  useEffect(()=>{const ca=localStorage.getItem('arc_avatar');if(ca)setCustomAvatar(ca);const h=localStorage.getItem('arc_handle');if(h)setHandle(h);else if(user){const name=user.user_metadata?.full_name||user.email?.split('@')[0]||'user';const auto=name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,15)+Math.floor(Math.random()*99);saveHandle(auto)}},[user])
  const saveHandle=(h:string)=>{setHandle(h);localStorage.setItem('arc_handle',h)}

  const signInGoogle=async()=>{await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}})}
  const signInEmail=async()=>{if(!emailInput.trim())return;setAuthLoading(true);setAuthError('');const{error}=await supabase.auth.signInWithOtp({email:emailInput.trim()});if(error)setAuthError(error.message);else setOtpSent(true);setAuthLoading(false)}
  const signOut=async()=>{await supabase.auth.signOut();setUser(null)}

  const createCourse=(pub:boolean)=>{if(!inputVal.trim())return;const c:Course={id:uid(),name:inputVal.trim(),description:descVal.trim(),modules:[],isPublic:pub,active:true,owner:userName,ownerHandle:userHandle,ownerImg:userImg,category:catVal,enrolledBy:[],shareCode:genCode(),createdAt:Date.now()};setCourses(p=>[...p,c]);setActiveId(c.id);setModal(null);setInputVal('');setDescVal('')}
  const delCourse=(id:string)=>{setCourses(p=>p.filter(c=>c.id!==id));if(activeId===id)setActiveId(null);setDeleteTarget(null)}
  const toggleActive=(id:string)=>setCourses(p=>p.map(c=>c.id===id?{...c,active:!c.active}:c))
  const enrollCourse=(id:string)=>setCourses(p=>p.map(c=>c.id===id?{...c,enrolledBy:[...c.enrolledBy.filter(e=>e!==userHandle),userHandle]}:c))
  const unenrollCourse=(id:string)=>setCourses(p=>p.map(c=>c.id===id?{...c,enrolledBy:c.enrolledBy.filter(e=>e!==userHandle)}:c))
  const joinByCode=()=>{const c=courses.find(x=>x.shareCode.toLowerCase()===joinCode.trim().toLowerCase());if(c){enrollCourse(c.id);setJoinCode('');setActiveId(c.id)}}

  const addMod=()=>upC(c=>({...c,modules:[...c.modules,{id:uid(),name:`Module ${c.modules.length+1}`,subs:[],createdAt:Date.now()}]}))
  const delMod=(id:string)=>upC(c=>({...c,modules:c.modules.filter(m=>m.id!==id)}))
  const moveMod=(i:number,d:number)=>{if(!active)return;const j=i+d;if(j<0||j>=active.modules.length)return;upC(c=>({...c,modules:swap(c.modules,i,j)}))}
  const addSub=(mId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:[...m.subs,{id:uid(),name:`Topic ${m.subs.length+1}`,videos:[],createdAt:Date.now()}]}:m)}))
  const delSub=(mId:string,sId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.filter(s=>s.id!==sId)}:m)}))
  const moveSub=(mId:string,i:number,d:number)=>upC(c=>({...c,modules:c.modules.map(m=>{if(m.id!==mId)return m;const j=i+d;if(j<0||j>=m.subs.length)return m;return{...m,subs:swap(m.subs,i,j)}})}))
  const fetchLink=async()=>{if(!inputVal.trim())return;setFetching(true);setPreview(null);setFetchError('');try{const res=await fetch('/api/youtube',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:inputVal.trim()})});const data=await res.json();if(data.error)setFetchError(data.error);else setPreview(data)}catch{setFetchError('Connection error')};setFetching(false)}
  const addVid=()=>{if(!preview||!modal?.mId)return;
    // Check duplicate in same topic
    const targetMod=active?.modules.find(m=>m.id===modal.mId);
    const targetSub=targetMod?.subs.find(s=>s.id===modal.sId);
    if(targetSub?.videos.some(v=>v.id===preview.id)){alert('This video is already in this topic.');return;}
    // Check duplicate in course
    const inCourse=active?.modules.some(m=>m.subs.some(s=>s.videos.some(v=>v.id===preview.id)));
    if(inCourse&&!confirm('This video already exists in another topic of this course. Add anyway?'))return;const v:Video={...preview,iid:uid(),completed:false,notes:[],votes:0,votedBy:[]};upC(c=>({...c,modules:c.modules.map(m=>m.id===modal.mId?{...m,subs:m.subs.map(s=>s.id===modal.sId?{...s,videos:[...s.videos,v]}:s)}:m)}));setModal(null);setInputVal('');setPreview(null)}
  const delVid=(mId:string,sId:string,i:number)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.filter((_,vi)=>vi!==i)}:s)}:m)}))
  const toggleComp=(mId:string,sId:string,vi:number)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,completed:!v.completed}:v)}:s)}:m)}))
  const voteVid=(mId:string,sId:string,vi:number,dir:'up'|'down')=>{upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>{if(s.id!==sId)return s;const vids=[...s.videos];const v={...vids[vi]};const prev=v.votedBy?.find(x=>x.startsWith(userHandle+':'));if(prev){const od=prev.split(':')[1];if(od===dir)return s;v.votes+=(dir==='up'?2:-2);v.votedBy=v.votedBy.map(x=>x.startsWith(userHandle+':')?`${userHandle}:${dir}`:x)}else{v.votes+=(dir==='up'?1:-1);v.votedBy=[...(v.votedBy||[]),`${userHandle}:${dir}`]};vids[vi]=v;vids.sort((a,b)=>(b.votes||0)-(a.votes||0));return{...s,videos:vids}})}:m)}))}
  const getVoteDir=(v:Video)=>{const e=v.votedBy?.find(x=>x.startsWith(userHandle+':'));return e?e.split(':')[1]:''}
  const addNote=(mId:string,sId:string,vi:number)=>{if(!noteDesc.trim())return;const minute=noteMin||fmtTime(playerTime);const n:Note={id:uid(),minute,text:noteDesc.slice(0,280),author:userName,authorHandle:userHandle,authorImg:userImg,ts:Date.now(),isPublic:noteTab==='public',reactions:{}};upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:[...v.notes,n]}:v)}:s)}:m)}));setNoteMin('');setNoteDesc('')}
  const delNote=(mId:string,sId:string,vi:number,nId:string)=>upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===sId?{...s,videos:s.videos.map((v,i)=>i===vi?{...v,notes:v.notes.filter(n=>n.id!==nId)}:v)}:s)}:m)}))
  const toggleReaction=(mId:string,sId:string,vi:number,nId:string,emoji:string)=>{
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
  const doRename=(type:string,mId?:string)=>{if(!editVal.trim()){setEditId(null);return};if(type==='course')setCourses(p=>p.map(c=>c.id===editId?{...c,name:editVal.trim()}:c));else if(type==='mod')upC(c=>({...c,modules:c.modules.map(m=>m.id===editId?{...m,name:editVal.trim()}:m)}));else if(type==='sub')upC(c=>({...c,modules:c.modules.map(m=>m.id===mId?{...m,subs:m.subs.map(s=>s.id===editId?{...s,name:editVal.trim()}:s)}:m)}));setEditId(null)}
  const toggleAll=()=>{if(!active)return;const next=!allExpanded;setAllExpanded(next);const n={...coll};active.modules.forEach(m=>{n[m.id]=!next;m.subs.forEach(s=>{n[s.id]=!next})});setColl(n)}
  const getAllNotes=()=>{if(!active)return[];const all:any[]=[];active.modules.forEach(mod=>{mod.subs.forEach(sub=>{sub.videos.forEach((vid,vi)=>{vid.notes.forEach(n=>{all.push({...n,videoTitle:vid.title,videoThumb:vid.thumbnail,modName:mod.name,subName:sub.name,mId:mod.id,sId:sub.id,vi})})})})});return(noteSearch?all.filter(n=>n.text.toLowerCase().includes(noteSearch.toLowerCase())||n.videoTitle.toLowerCase().includes(noteSearch.toLowerCase())):all).sort((a,b)=>noteSort==='recent'?b.ts-a.ts:a.ts-b.ts)}

  const myCourses=courses.filter(c=>c.ownerHandle===userHandle)
  const enrolledCourses=courses.filter(c=>c.enrolledBy?.includes(userHandle)&&c.ownerHandle!==userHandle)

  if(loading)return<div className="min-h-screen bg-[#DAE0E6] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin"/></div>

  if(!user)return(
    <div className="min-h-screen bg-[#DAE0E6] flex items-center justify-center p-4"><div className="bg-white border border-gray-200 rounded-sm p-8 w-full max-w-sm shadow-sm text-center">
      <div className="w-14 h-14 rounded-full bg-[#FF4500] flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Course Architect</h1>
      <p className="text-sm text-gray-500 mb-5">Build courses with YouTube videos</p>
      <div className="flex border border-gray-200 rounded-sm overflow-hidden mb-5"><button onClick={()=>setAuthMode('google')} className={`flex-1 py-2 text-xs font-semibold ${authMode==='google'?'bg-gray-100 text-gray-900':'text-gray-400'}`}>Google</button><button onClick={()=>setAuthMode('email')} className={`flex-1 py-2 text-xs font-semibold ${authMode==='email'?'bg-gray-100 text-gray-900':'text-gray-400'}`}>Email</button></div>
      {authMode==='google'?<button onClick={signInGoogle} className="w-full py-2.5 rounded-sm text-sm font-bold bg-[#FF4500] text-white hover:bg-[#e03d00] flex items-center justify-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</button>
      :!otpSent?<div className="space-y-3"><input value={emailInput} onChange={e=>setEmailInput(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-2.5 rounded-sm border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF4500]/30"/><button onClick={signInEmail} disabled={!emailInput.trim()||authLoading} className="w-full py-2.5 rounded-sm text-sm font-bold bg-[#FF4500] text-white disabled:opacity-40">{authLoading?'Sending...':'Send magic link'}</button></div>
      :<div className="space-y-3"><p className="text-xs text-gray-500">Check email for sign-in link</p><button onClick={()=>setOtpSent(false)} className="text-xs text-[#FF4500] hover:underline">Different email</button></div>}
      {authError&&<p className="text-xs text-red-500 mt-3">{authError}</p>}
    </div></div>
  )

  // Handle setup
  if(!handle)return<HandleModal onSave={saveHandle}/>

  // Note component with reactions
  const NoteCard=({n,mId,sId,vi,courseOwnerHandle}:{n:Note;mId:string;sId:string;vi:number;courseOwnerHandle:string})=>(
    <div className="flex items-start gap-2 p-2.5 rounded-sm bg-white group hover:bg-gray-50 border border-gray-100">
      {n.authorImg?<img src={n.authorImg} alt="" className="w-6 h-6 rounded-full flex-shrink-0"/>:<div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">{n.author[0]?.toUpperCase()}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-700">arc/{n.authorHandle}</span>
          
          {n.authorHandle===courseOwnerHandle&&<span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FF4500]/10 text-[#FF4500]">BUILDER</span>}
          {n.minute&&<button onClick={()=>seekTo(timeToSec(n.minute))} className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500]/20 cursor-pointer">{n.minute}</button>}
          <span className="text-[9px] text-gray-300">{ago(n.ts)}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{n.text}</p>
        {/* Reactions */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {Object.entries(n.reactions||{}).map(([emoji,users])=>(
            <button key={emoji} onClick={()=>toggleReaction(mId,sId,vi,n.id,emoji)} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${(users as string[]).includes(userHandle)?'bg-[#FF4500]/10 border-[#FF4500]/30 text-[#FF4500]':'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'}`}>
              {emoji}<span className="font-bold">{(users as string[]).length}</span>
            </button>
          ))}
          <div className="relative">
            <button onClick={()=>setReactionPicker(reactionPicker===n.id?null:n.id)} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-500 hover:bg-[#FF4500]/10 hover:text-[#FF4500] transition-colors">+ React</button>
            {reactionPicker===n.id&&<div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 z-50 w-48">
              {REACTION_EMOJIS.map(e=><button key={e} onClick={()=>toggleReaction(mId,sId,vi,n.id,e)} className="p-1 rounded hover:bg-gray-100 text-base">{e}</button>)}
            </div>}
          </div>
        </div>
      </div>
      {n.authorHandle===userHandle&&<button onClick={()=>delNote(mId,sId,vi,n.id)} className="p-1 opacity-0 group-hover:opacity-60 text-red-400 text-xs">✕</button>}
    </div>
  )

  // PLAYER
  if(pv&&active){
    const mod=active.modules.find(m=>m.id===pv.mId);const sub=mod?.subs.find(s=>s.id===pv.sId);const vid=sub?.videos[pv.vi]
    if(!vid){setPV(null);return null}
    const goTo=(vi:number)=>{setPV((p:any)=>({...p,vi}));setPlayerTime(0);setNoteMin('')}
    const filteredNotes=vid.notes.filter(n=>noteTab==='public'?n.isPublic:n.authorHandle===userHandle)
    return(
      <div className="min-h-screen bg-[#DAE0E6]">
        <div className="border-b border-gray-200 px-4 py-2 bg-white flex items-center gap-3 sticky top-0 z-20">
          <button onClick={()=>setPV(null)} className="text-xs text-gray-500 hover:text-[#FF4500]">← Back</button>
          <span className="text-[10px] text-gray-400 hidden sm:block truncate">{active.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={()=>{if(pv.vi>0)goTo(pv.vi-1)}} disabled={pv.vi===0} className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#FF4500] text-white disabled:opacity-30">← Prev</button>
            <button onClick={()=>{if(sub&&pv.vi<sub.videos.length-1)goTo(pv.vi+1)}} disabled={!sub||pv.vi>=sub.videos.length-1} className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#FF4500] text-white disabled:opacity-30">Next →</button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto">
          <div className="flex-1 p-4 sm:p-6">
            <div className="w-full rounded-sm overflow-hidden bg-black aspect-video mb-4"><YouTubePlayer ref={ytRef} videoId={vid.id} onTimeUpdate={setPlayerTime}/></div>
            <p className="text-[10px] text-gray-400 mb-1">{active.name} › {mod?.name} › {sub?.name}</p>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{vid.title}</h2>
            <div className="flex items-center gap-3 mb-3">
              {vid.channelImg&&<img src={vid.channelImg} alt="" className="w-8 h-8 rounded-full"/>}
              <div><p className="text-sm font-medium text-gray-800">{vid.channel}</p>{vid.subscribers&&<p className="text-[11px] text-gray-400">{vid.subscribers} subs</p>}</div>
              <div className="ml-auto flex items-center gap-3">
                <Vote score={vid.votes} voted={getVoteDir(vid)} onUp={()=>voteVid(pv.mId,pv.sId,pv.vi,'up')} onDown={()=>voteVid(pv.mId,pv.sId,pv.vi,'down')}/>
                <button onClick={()=>toggleComp(pv.mId,pv.sId,pv.vi)} className={`px-3 py-1.5 rounded-sm text-xs font-semibold ${vid.completed?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{vid.completed?'✓ Done':'○ Complete'}</button>
                <button onClick={()=>{setModal({type:'addVideo',mId:pv.mId,sId:pv.sId});setInputVal('');setPreview(null);setFetchError('')}} className="text-[10px] text-gray-400 hover:text-[#FF4500] transition-colors">Not great? Suggest better →</button>
              </div>
            </div>
            <div className="flex gap-3 text-[11px] text-gray-400 mb-3"><span>{vid.views} views</span><span>{vid.likes} likes</span><span>{vid.duration}</span></div>
            {/* Social proof */}
            <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-400"><span>👥 <strong className="text-gray-600">{active.enrolledBy?.length||0}</strong> architects studying this</span></div>
            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-gray-800">Notes</h3>
              <div className="flex border border-gray-200 rounded-sm overflow-hidden"><button onClick={()=>setNoteTab('public')} className={`px-3 py-1 text-[10px] font-semibold ${noteTab==='public'?'bg-gray-100 text-gray-700':'text-gray-400'}`}>Public</button><button onClick={()=>setNoteTab('mine')} className={`px-3 py-1 text-[10px] font-semibold ${noteTab==='mine'?'bg-gray-100 text-gray-700':'text-gray-400'}`}>Mine</button></div></div>
              <div className="flex gap-2 mb-3 items-end">
                <button onClick={()=>setNumpad(true)} className="px-3 py-2 rounded-sm border border-gray-200 text-xs font-mono bg-gray-50 hover:bg-gray-100 min-w-[80px] text-center cursor-pointer text-gray-700">⏱ {noteMin||fmtTime(playerTime)}</button>
                <div className="flex-1 relative"><input value={noteDesc} onChange={e=>setNoteDesc(e.target.value.slice(0,280))} placeholder="Write a note..." className="w-full px-3 py-2 rounded-sm border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF4500]/30 pr-14" onKeyDown={e=>{if(e.key==='Enter')addNote(pv.mId,pv.sId,pv.vi)}}/><span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] ${noteDesc.length>=260?'text-red-400':'text-gray-300'}`}>{noteDesc.length}/280</span></div>
                <button onClick={()=>addNote(pv.mId,pv.sId,pv.vi)} disabled={!noteDesc.trim()} className="px-3 py-2 rounded-sm text-xs font-bold bg-[#FF4500] text-white disabled:opacity-40">Add</button>
              </div>
              {filteredNotes.length===0?<p className="text-xs text-gray-400 text-center py-6">{noteTab==='public'?'No public notes':'No notes'}</p>:(
                <div className="space-y-2 max-h-[400px] overflow-y-auto">{filteredNotes.map(n=><NoteCard key={n.id} n={n} mId={pv.mId} sId={pv.sId} vi={pv.vi} courseOwnerHandle={active.ownerHandle}/>)}</div>
              )}
            </div>
          </div>
          {/* Sidebar with votes */}
          <div className="w-full lg:w-96 bg-white border-l border-gray-200 lg:h-screen lg:sticky lg:top-0 overflow-y-auto">
            <div className="p-4 border-b border-gray-200"><p className="text-sm font-bold text-gray-800">{sub?.name}</p><p className="text-[11px] text-gray-400 mt-0.5">{sub?.videos.length} videos · {fmtS(subDur(sub!))}</p><div className="mt-2">{sub&&<PBar done={subComp(sub)} total={sub.videos.length}/>}</div></div>
            <div className="p-2 space-y-1">{sub?.videos.map((sv,svi)=>(
              <div key={sv.iid} onClick={()=>goTo(svi)} className={`flex items-center gap-2 p-2.5 rounded-sm cursor-pointer transition-colors ${svi===pv.vi?'bg-[#FF4500]/5 border border-[#FF4500]/20':'hover:bg-gray-50 border border-transparent'}`}>
                <VoteSmall score={sv.votes} voted={getVoteDir(sv)} onUp={()=>voteVid(pv.mId,pv.sId,svi,'up')} onDown={()=>voteVid(pv.mId,pv.sId,svi,'down')}/>
                <button onClick={e=>{e.stopPropagation();toggleComp(pv.mId,pv.sId,svi)}} className="flex-shrink-0 text-sm">{sv.completed?<span className="text-green-500">✓</span>:<span className="text-gray-300">○</span>}</button>
                <img src={sv.thumbnail} alt="" className="w-24 h-14 object-cover rounded-sm flex-shrink-0"/>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-semibold text-gray-800 leading-snug line-clamp-2">{sv.title}</p><div className="flex items-center gap-2 text-[9px] text-gray-400 mt-0.5"><span>{sv.duration}</span><span>{sv.viewsShort||sv.views}</span>{(sv.votes||0)!==0&&<span className={`font-bold ${sv.votes>0?'text-[#FF4500]':'text-blue-500'}`}>{sv.votes>0?'▲':'▼'}{Math.abs(sv.votes)}</span>}</div></div>
              </div>
            ))}</div>
          </div>
        </div>
        {numpad&&<NumpadModal value={noteMin} onChange={setNoteMin} onClose={()=>setNumpad(false)} onCapture={captureTime} currentTime={fmtTime(playerTime)}/>}
      </div>
    )
  }

  // NOTEVAULT
  if(notesView&&active){
    const allNotes=getAllNotes()
    return(<div className="min-h-screen bg-[#DAE0E6]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20"><div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 cursor-pointer" onClick={()=>setNotesView(false)}><div className="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><span className="text-sm font-bold text-gray-900">Course Architect</span></div></header>
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        <div><button onClick={()=>setNotesView(false)} className="text-xs text-gray-400 hover:text-[#FF4500] mb-0.5 block">← Back</button><h2 className="text-lg font-bold text-gray-900">🔐 NoteVault</h2><p className="text-xs text-gray-400">{allNotes.length} notes</p></div>
        <div className="flex gap-2"><div className="flex-1 relative"><input value={noteSearch} onChange={e=>setNoteSearch(e.target.value)} placeholder="Search..." className="w-full px-3 py-2 rounded-sm border border-gray-200 text-sm text-gray-800 focus:outline-none pl-8"/><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span></div><button onClick={()=>setNoteSort(noteSort==='recent'?'oldest':'recent')} className="px-3 py-2 rounded-sm border border-gray-200 text-xs text-gray-500 bg-white">{noteSort==='recent'?'↓ New':'↑ Old'}</button></div>
        {allNotes.length===0?<div className="bg-white border border-gray-200 rounded-sm p-12 text-center"><p className="text-sm text-gray-500">{noteSearch?'No matches':'No notes'}</p></div>
        :<div className="space-y-1.5">{allNotes.map((n:any)=>(
          <div key={n.id} onClick={()=>{setNotesView(false);setPV({mId:n.mId,sId:n.sId,vi:n.vi})}} className="bg-white border border-gray-200 rounded-sm p-3 hover:border-[#FF4500]/30 cursor-pointer group">
            <div className="flex items-start gap-3"><img src={n.videoThumb} alt="" className="w-24 h-14 object-cover rounded-sm flex-shrink-0"/>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{n.minute&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FF4500]/10 text-[#FF4500]">{n.minute}</span>}<span className="text-[9px] text-gray-300">{ago(n.ts)}</span></div>
            <p className="text-xs text-gray-800 mb-1">{n.text}</p><p className="text-[10px] text-gray-400">{n.modName} › {n.subName}</p></div>
            <span className="text-gray-300 group-hover:text-[#FF4500] flex-shrink-0">→</span></div>
          </div>
        ))}</div>}
      </div>
    </div>)
  }

  // COURSE EDITOR
  if(active){
    const owner=isOwner(active);const enrolled=active.enrolledBy?.includes(userHandle)
    return(
    <div className="min-h-screen bg-[#DAE0E6]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20"><div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between"><div className="flex items-center gap-2 cursor-pointer" onClick={()=>setActiveId(null)}><div className="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><span className="text-sm font-bold text-gray-900">Course Architect</span></div><div className="flex items-center gap-2"><button onClick={()=>setProfileModal(true)} className="flex items-center gap-1.5 hover:opacity-80"><span className="text-[10px] text-gray-400 hover:text-[#FF4500]">arc/{userHandle}</span>{userImg&&<img src={userImg} alt="" className="w-6 h-6 rounded-full hover:ring-2 hover:ring-[#FF4500]/30"/>}</button><button onClick={signOut} className="text-[10px] text-gray-400 hover:text-[#FF4500]">Logout</button></div></div></header>
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-white border border-gray-200 rounded-sm p-4">
          <button onClick={()=>setActiveId(null)} className="text-xs text-gray-400 hover:text-[#FF4500] mb-1 block">← Dashboard</button>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {owner?<input value={active.name} onChange={e=>setCourses(p=>p.map(c=>c.id===active.id?{...c,name:e.target.value}:c))} className="text-lg font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#FF4500] focus:outline-none w-full"/>:<h2 className="text-lg font-bold text-gray-900">{active.name}</h2>}
              {owner?<textarea value={active.description||""} onChange={e=>setCourses(p=>p.map(c=>c.id===active.id?{...c,description:e.target.value}:c))} placeholder="Add a description..." rows={2} className="text-xs text-gray-500 mt-1 leading-relaxed bg-transparent border border-transparent hover:border-gray-200 focus:border-[#FF4500] focus:outline-none w-full resize-none rounded-sm p-1"/>:active.description&&<p className="text-xs text-gray-500 mt-1 leading-relaxed">{active.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">{active.category}</span>
                <span className="text-[10px] text-gray-400">{active.modules.length} mod · {cVC(active)} vid · {fmtS(cDur(active))}</span>
                <span className="text-[10px] text-gray-400">👥 {active.enrolledBy?.length||0} architects</span>
                <InfoTooltip content={`Created ${active.createdAt?ago(active.createdAt):'recently'} · ${active.isPublic?'Public':'Private'} · by arc/${active.ownerHandle}`}><span className="text-[10px] text-gray-400 cursor-help border-b border-dotted border-gray-300">ⓘ</span></InfoTooltip>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
              {!owner&&!enrolled&&<button onClick={()=>enrollCourse(active.id)} className="px-4 py-2 rounded-sm text-xs font-bold bg-[#FF4500] text-white hover:bg-[#e03d00]">🎯 Lock In</button>}
              {!owner&&enrolled&&<button onClick={()=>unenrollCourse(active.id)} className="px-4 py-2 rounded-sm text-xs font-medium bg-green-100 text-green-700">✓ Enrolled</button>}
              <div className="flex gap-1"><button onClick={()=>setShareTarget(active)} className="px-2 py-1.5 rounded-sm text-[10px] text-gray-500 hover:bg-gray-100 border border-gray-200">Share</button><button onClick={()=>setNotesView(true)} className="px-2 py-1.5 rounded-sm text-[10px] text-gray-500 hover:text-[#FF4500] border border-gray-200">🔐 NoteVault</button><button onClick={toggleAll} className="px-2 py-1.5 rounded-sm text-[10px] text-gray-500 hover:bg-gray-100 border border-gray-200">{allExpanded?'Collapse':'Expand'}</button></div>
              {owner&&<div className="flex gap-1"><button onClick={()=>toggleActive(active.id)} className={`px-2 py-1.5 rounded-sm text-[10px] border border-gray-200 ${active.active?'text-green-600':'text-gray-400'}`}>{active.active?'Active':'Inactive'}</button><button onClick={()=>setDeleteTarget({id:active.id,name:active.name})} className="px-2 py-1.5 rounded-sm text-[10px] text-red-400 border border-gray-200">Delete</button></div>}
            </div>
          </div>
          {cVC(active)>0&&<div className="mt-3"><PBar done={cComp(active)} total={cVC(active)}/></div>}
        </div>

        {active.modules.length===0?<div className="bg-white border border-gray-200 rounded-sm py-16 flex flex-col items-center"><p className="text-sm text-gray-400">Empty course</p>{owner&&<button onClick={addMod} className="mt-3 px-4 py-2 rounded-sm text-xs font-bold bg-[#FF4500] text-white">+ Add Module</button>}</div>
        :active.modules.map((mod,mi)=>(
          <div key={mod.id} className="bg-white border border-gray-200 rounded-sm overflow-hidden">
            <div className="group flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50">
              <button onClick={()=>togColl(mod.id)} className="text-gray-400 text-sm w-5">{coll[mod.id]?'▶':'▼'}</button>
              <span className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold bg-[#FF4500]/10 text-[#FF4500]">{mi+1}</span>
              {editId===mod.id?<span className="flex items-center gap-1 flex-1"><input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doRename('mod')}} className="flex-1 px-2 py-0.5 rounded-sm text-sm border border-gray-300 text-gray-800 focus:outline-none"/><button onClick={()=>doRename('mod')} className="text-green-500">✓</button><button onClick={()=>setEditId(null)} className="text-red-400">✕</button></span>
              :<span className="flex-1 text-sm font-bold text-gray-800 truncate cursor-pointer" onDoubleClick={()=>owner&&startEdit(mod.id,mod.name)}>{mod.name}</span>}
              <span className="text-[10px] text-gray-400">{mod.subs.reduce((a,s)=>a+s.videos.length,0)} vid · {fmtS(modDur(mod))}</span>
              <InfoTooltip content={`Created ${mod.createdAt?ago(mod.createdAt):'recently'}`}><span className="text-[10px] text-gray-400 cursor-help">ⓘ</span></InfoTooltip>
              {owner&&<div className="flex gap-0.5 opacity-0 group-hover:opacity-100"><button onClick={()=>moveMod(mi,-1)} disabled={mi===0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs">↑</button><button onClick={()=>moveMod(mi,1)} disabled={mi===active.modules.length-1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs">↓</button><button onClick={()=>startEdit(mod.id,mod.name)} className="p-1 text-gray-400 hover:text-gray-600 text-xs">✎</button><button onClick={()=>setDeleteTarget({id:mod.id,name:mod.name,type:'mod'})} className="p-1 text-red-300 hover:text-red-500 text-xs">✕</button></div>}
            </div>
            {!coll[mod.id]&&<div className="relative"><div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200"/><div className="pl-8 pr-3 py-2 space-y-2">
              {mod.subs.reduce((a,s)=>a+s.videos.length,0)>0&&<PBar done={modComp(mod)} total={mod.subs.reduce((a,s)=>a+s.videos.length,0)}/>}
              {mod.subs.map((sub,si)=>(
                <div key={sub.id} className="relative"><div className="absolute -left-3 top-3 w-3 h-px bg-gray-200"/>
                <div className="border border-gray-100 rounded-sm overflow-hidden">
                  <div className="group flex items-center gap-2 px-3 py-2 bg-gray-50/50 hover:bg-gray-50">
                    <button onClick={()=>togColl(sub.id)} className="text-gray-400 text-xs w-4">{coll[sub.id]?'▶':'▼'}</button>
                    <span className="text-gray-400 text-xs">#</span>
                    {editId===sub.id?<span className="flex items-center gap-1 flex-1"><input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doRename('sub',mod.id)}} className="flex-1 px-2 py-0.5 rounded-sm text-xs border border-gray-300 text-gray-800 focus:outline-none"/><button onClick={()=>doRename('sub',mod.id)} className="text-green-500 text-xs">✓</button><button onClick={()=>setEditId(null)} className="text-red-400 text-xs">✕</button></span>
                    :<span className="flex-1 text-xs font-semibold text-gray-700 truncate cursor-pointer" onDoubleClick={()=>startEdit(sub.id,sub.name)}>{sub.name}</span>}
                    <span className="text-[10px] text-gray-400">{sub.videos.length} · {fmtS(subDur(sub))}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                      <button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="text-[10px] text-[#FF4500] hover:bg-[#FF4500]/10 px-1.5 py-0.5 rounded-sm">+ Add</button>
                      {owner&&<><button onClick={()=>startEdit(sub.id,sub.name)} className="p-0.5 text-gray-400 text-[10px]">✎</button><button onClick={()=>moveSub(mod.id,si,-1)} disabled={si===0} className="p-0.5 text-gray-400 disabled:opacity-20 text-[10px]">↑</button><button onClick={()=>moveSub(mod.id,si,1)} disabled={si===mod.subs.length-1} className="p-0.5 text-gray-400 disabled:opacity-20 text-[10px]">↓</button><button onClick={()=>delSub(mod.id,sub.id)} className="p-0.5 text-red-300 text-[10px]">✕</button></>}
                    </div>
                  </div>
                  {!coll[sub.id]&&<div className="py-1 space-y-0.5">
                    {sub.videos.length>0&&<div className="px-3 pb-1"><PBar done={subComp(sub)} total={sub.videos.length}/></div>}
                    {sub.videos.length===0?<div className="py-6 flex flex-col items-center text-gray-400"><p className="text-[11px]">Paste a YouTube link</p><button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="mt-1 text-[11px] text-[#FF4500]">+ Add video</button></div>
                    :<>{sub.videos.map((v,vi)=>(
                      <div key={v.iid} className="group/v flex items-start gap-0 px-1 py-1 hover:bg-gray-50 rounded-sm mx-1">
                        <Vote score={v.votes} voted={getVoteDir(v)} onUp={()=>voteVid(mod.id,sub.id,vi,'up')} onDown={()=>voteVid(mod.id,sub.id,vi,'down')}/>
                        <button onClick={()=>toggleComp(mod.id,sub.id,vi)} className="flex-shrink-0 mt-2 mx-1">{v.completed?<span className="text-green-500">✓</span>:<span className="text-gray-300">○</span>}</button>
                        <div className="relative flex-shrink-0 w-28 cursor-pointer mt-0.5" onClick={()=>setPV({mId:mod.id,sId:sub.id,vi})}><img src={v.thumbnail} alt="" className="w-full h-16 object-cover rounded-sm"/><span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded-sm">{v.duration}</span></div>
                        <div className="flex-1 min-w-0 cursor-pointer pl-2 pt-0.5" onClick={()=>setPV({mId:mod.id,sId:sub.id,vi})}>
                          <p className={`text-xs font-semibold text-gray-800 line-clamp-2 ${v.completed?'opacity-50':''}`}>{v.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">{v.channelImg&&<img src={v.channelImg} alt="" className="w-3 h-3 rounded-full"/>}<span className="text-[9px] text-gray-400">{v.channel}{v.subscribers?` · ${v.subscribers}`:''}</span></div>
                          <div className="flex gap-2 text-[8px] text-gray-400 mt-0.5"><span>{v.viewsShort||v.views}</span><span>{v.likesShort||v.likes}</span></div>
                        </div>
                        <div className="opacity-0 group-hover/v:opacity-100 mt-1"><button onClick={()=>delVid(mod.id,sub.id,vi)} className="p-1 text-red-300 hover:text-red-500 text-[10px]">✕</button></div>
                      </div>
                    ))}<button onClick={()=>{setModal({type:'addVideo',mId:mod.id,sId:sub.id});setInputVal('');setPreview(null);setFetchError('')}} className="w-full py-1.5 text-[11px] text-gray-400 hover:text-[#FF4500]">+ Add video</button></>}
                  </div>}
                </div></div>
              ))}
              {owner&&<button onClick={()=>addSub(mod.id)} className="w-full py-2 text-xs text-gray-400 hover:text-[#FF4500]">+ New topic</button>}
            </div></div>}
          </div>
        ))}
        {owner&&active.modules.length>0&&<button onClick={addMod} className="w-full py-3 bg-white border border-gray-200 rounded-sm text-sm text-gray-400 hover:text-[#FF4500] hover:border-[#FF4500]/30">+ Add module</button>}
      </div>
      {modal?.type==='addVideo'&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setModal(null)}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-lg shadow-lg" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">Add YouTube Video</h3><button onClick={()=>setModal(null)} className="text-gray-400">✕</button></div><div className="p-5 space-y-4"><div className="flex gap-2"><input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchLink()} placeholder="https://youtube.com/watch?v=..." className="flex-1 px-3 py-2.5 rounded-sm border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF4500]/30"/><button onClick={fetchLink} disabled={!inputVal.trim()||fetching} className="px-4 rounded-sm text-xs font-bold bg-[#FF4500] text-white disabled:opacity-40 flex items-center gap-1">{fetching?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Fetch'}</button></div>{fetchError&&<p className="text-xs text-red-500">{fetchError}</p>}{preview&&<div className="border border-gray-200 rounded-sm overflow-hidden"><img src={preview.thumbnail} alt="" className="w-full h-44 object-cover"/><div className="p-3"><h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{preview.title}</h4><div className="flex items-center gap-2 mt-2">{preview.channelImg&&<img src={preview.channelImg} alt="" className="w-5 h-5 rounded-full"/>}<span className="text-xs text-gray-700">{preview.channel}{preview.subscribers?` · ${preview.subscribers}`:''}</span></div><div className="flex gap-3 text-[11px] text-gray-400 mt-1.5"><span>{preview.views} views</span><span>{preview.likes} likes</span><span>{preview.duration}</span></div></div></div>}<div className="flex justify-end gap-2"><button onClick={()=>setModal(null)} className="px-3 py-2 rounded-sm text-xs text-gray-500 hover:bg-gray-100">Cancel</button><button onClick={addVid} disabled={!preview} className="px-4 py-2 rounded-sm text-xs font-bold bg-[#FF4500] text-white disabled:opacity-40">Add</button></div></div></div></div>}
      {profileModal&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setProfileModal(false)}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">Edit Profile</h3><button onClick={()=>setProfileModal(false)} className="text-gray-400">✕</button></div><div className="p-5"><p className="text-xs font-medium text-gray-600 mb-3">Choose Avatar</p><div className="grid grid-cols-4 gap-2.5">{user?.user_metadata?.avatar_url&&<button onClick={()=>{setCustomAvatar("");localStorage.setItem("arc_avatar","");setProfileModal(false)}} className={"w-full aspect-square rounded-lg overflow-hidden border-2 "+(!customAvatar?"border-[#FF4500] ring-2 ring-[#FF4500]/30":"border-gray-200")}><img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/></button>}{AVATARS.map(av=><button key={av.id} onClick={()=>{setCustomAvatar(av.src);localStorage.setItem("arc_avatar",av.src);setProfileModal(false)}} className={"w-full aspect-square rounded-lg overflow-hidden border-2 "+(customAvatar===av.src?"border-[#FF4500] ring-2 ring-[#FF4500]/30":"border-gray-200")}><img src={av.src} className="w-full h-full object-cover"/></button>)}</div></div></div></div>}
      {deleteTarget&&<DeleteModal name={deleteTarget.name} onClose={()=>setDeleteTarget(null)} onConfirm={()=>{if(deleteTarget.type==='mod')delMod(deleteTarget.id);else delCourse(deleteTarget.id);setDeleteTarget(null)}}/>}
      {shareTarget&&<ShareModal course={shareTarget} onClose={()=>setShareTarget(null)}/>}
    </div>)
  }

  // DASHBOARD
  return(
    <div className="min-h-screen bg-[#DAE0E6]">
      <header className="border-b border-gray-200 bg-white"><div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><span className="text-sm font-bold text-gray-900">Course Architect</span></div><div className="flex items-center gap-2"><button onClick={()=>setProfileModal(true)} className="flex items-center gap-1.5 hover:opacity-80"><span className="text-[10px] text-[#FF4500] font-medium hover:underline">arc/{userHandle}</span>{userImg&&<img src={userImg} alt="" className="w-6 h-6 rounded-full hover:ring-2 hover:ring-[#FF4500]/30"/>}</button><button onClick={signOut} className="text-[10px] text-gray-400 hover:text-[#FF4500]">Logout</button></div></div></header>
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        <div className="bg-white border border-gray-200 rounded-sm p-3 flex gap-2 items-center"><span className="text-xs text-gray-500">Have a code?</span><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC-123" maxLength={7} className="px-3 py-1.5 rounded-sm border border-gray-200 text-xs font-mono text-gray-800 w-24 text-center focus:outline-none"/><button onClick={joinByCode} disabled={joinCode.length<5} className="px-3 py-1.5 rounded-sm text-xs font-bold bg-[#FF4500] text-white disabled:opacity-40">Join</button></div>
        <div className="flex border border-gray-200 rounded-sm overflow-hidden bg-white"><button onClick={()=>setDashTab('my')} className={`flex-1 py-2.5 text-xs font-semibold ${dashTab==='my'?'bg-gray-100 text-gray-900':'text-gray-400'}`}>My Courses</button><button onClick={()=>setDashTab('enrolled')} className={`flex-1 py-2.5 text-xs font-semibold ${dashTab==='enrolled'?'bg-gray-100 text-gray-900':'text-gray-400'}`}>Enrolled</button><button onClick={()=>setDashTab('trending')} className={`flex-1 py-2.5 text-xs font-semibold ${dashTab==='trending'?'bg-gray-100 text-gray-900':'text-gray-400'}`}>🔥 Explore</button></div>

        {dashTab==='my'&&<div className="space-y-2">
          {myCourses.length===0&&<div className="bg-white border border-gray-200 rounded-sm p-8 text-center"><h3 className="font-bold text-gray-800 mb-1">Welcome, arc/{userHandle}!</h3><p className="text-xs text-gray-400">Create your first course below.</p></div>}
          {myCourses.map(c=><div key={c.id} onClick={()=>setActiveId(c.id)} className="group bg-white border border-gray-200 rounded-sm p-4 cursor-pointer hover:border-[#FF4500]/30"><div className="flex items-center gap-3"><div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800">{c.name}</p><span className="text-[9px] text-gray-400">{c.isPublic?'🌐':'🔒'}</span>{!c.active&&<span className="text-[9px] text-red-400">Inactive</span>}</div><p className="text-[11px] text-gray-400">{c.modules.length} mod · {cVC(c)} vid · {fmtS(cDur(c))} · 👥 {c.enrolledBy?.length||0}</p></div></div>{cVC(c)>0&&<div className="mt-2"><PBar done={cComp(c)} total={cVC(c)}/></div>}</div>)}
          <button onClick={()=>{setModal('newCourse');setInputVal('');setDescVal('');setCatVal(CATEGORIES[0])}} className="w-full py-3 rounded-sm text-sm font-bold bg-[#FF4500] text-white hover:bg-[#e03d00]">+ Create New Course</button>
        </div>}

        {dashTab==='enrolled'&&<div className="space-y-2">
          {enrolledCourses.length===0&&<div className="bg-white border border-gray-200 rounded-sm p-8 text-center"><p className="text-sm text-gray-500">No enrolled courses</p></div>}
          {enrolledCourses.map(c=><div key={c.id} onClick={()=>setActiveId(c.id)} className="bg-white border border-gray-200 rounded-sm p-4 cursor-pointer hover:border-[#FF4500]/30"><p className="text-sm font-semibold text-gray-800">{c.name}</p><p className="text-[11px] text-gray-400">by arc/{c.ownerHandle} · {cVC(c)} vid · {fmtS(cDur(c))}</p>{cVC(c)>0&&<div className="mt-2"><PBar done={cComp(c)} total={cVC(c)}/></div>}</div>)}
        </div>}

        {dashTab==='trending'&&<div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-sm p-3"><h3 className="text-xs font-bold text-gray-700 mb-2">Categories</h3><div className="flex flex-wrap gap-1.5">{CATEGORIES.map(cat=>{const f=followedCats.includes(cat);return<button key={cat} onClick={()=>setFollowedCats(p=>f?p.filter(c=>c!==cat):[...p,cat])} className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${f?'bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/30':'bg-white text-gray-500 border-gray-200 hover:border-[#FF4500]/20'}`}>{f?'✓ ':''}{cat}</button>})}</div></div>
          {courses.filter(c=>c.isPublic&&c.active).length===0&&<div className="bg-white border border-gray-200 rounded-sm p-8 text-center"><p className="text-sm text-gray-500">No public courses yet</p></div>}
          {courses.filter(c=>c.isPublic&&c.active).map(c=><div key={c.id} onClick={()=>setActiveId(c.id)} className="bg-white border border-gray-200 rounded-sm p-4 cursor-pointer hover:border-[#FF4500]/30"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-800">{c.name}</p><span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">{c.category}</span></div><p className="text-[11px] text-gray-400">by arc/{c.ownerHandle} · {cVC(c)} vid · {fmtS(cDur(c))} · 👥 {c.enrolledBy?.length||0}</p></div>{!c.enrolledBy?.includes(userHandle)&&c.ownerHandle!==userHandle&&<button onClick={e=>{e.stopPropagation();enrollCourse(c.id)}} className="px-3 py-1.5 rounded-sm text-[10px] font-bold bg-[#FF4500] text-white flex-shrink-0">🎯 Lock In</button>}</div>{c.description&&<p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">{c.description}</p>}</div>)}
        </div>}
      </div>
      {profileModal&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setProfileModal(false)}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">Edit Profile</h3><button onClick={()=>setProfileModal(false)} className="text-gray-400 hover:text-gray-600">✕</button></div><div className="p-5"><p className="text-xs font-medium text-gray-600 mb-3">Choose Avatar</p><div className="grid grid-cols-4 gap-2.5">{user?.user_metadata?.avatar_url&&<button onClick={()=>{setCustomAvatar("");localStorage.setItem("arc_avatar","");setProfileModal(false)}} className={"w-full aspect-square rounded-lg overflow-hidden border-2 transition-all "+(!customAvatar?"border-[#FF4500] ring-2 ring-[#FF4500]/30":"border-gray-200 hover:border-gray-300")}><img src={user.user_metadata.avatar_url} className="w-full h-full object-cover"/></button>}{AVATARS.map(av=><button key={av.id} onClick={()=>{setCustomAvatar(av.src);localStorage.setItem("arc_avatar",av.src);setProfileModal(false)}} className={"w-full aspect-square rounded-lg overflow-hidden border-2 transition-all "+(customAvatar===av.src?"border-[#FF4500] ring-2 ring-[#FF4500]/30":"border-gray-200 hover:border-gray-300")}><img src={av.src} className="w-full h-full object-cover"/></button>)}</div></div></div></div>}
      {modal==='newCourse'&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setModal(null)}><div className="bg-white border border-gray-200 rounded-sm w-full max-w-md shadow-lg" onClick={e=>e.stopPropagation()}><div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">New Course</h3><button onClick={()=>setModal(null)} className="text-gray-400">✕</button></div><div className="p-5 space-y-3">
        <input autoFocus value={inputVal} onChange={e=>setInputVal(e.target.value)} placeholder="Course name..." className="w-full px-3 py-2.5 rounded-sm border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF4500]/30"/>
        <textarea value={descVal} onChange={e=>setDescVal(e.target.value)} placeholder="Description..." rows={3} className="w-full px-3 py-2.5 rounded-sm border border-gray-300 text-xs text-gray-800 focus:outline-none resize-none"/>
        <select value={catVal} onChange={e=>setCatVal(e.target.value)} className="w-full px-3 py-2 rounded-sm border border-gray-300 text-xs text-gray-800">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <div className="flex justify-end gap-2"><button onClick={()=>createCourse(false)} disabled={!inputVal.trim()} className="px-3 py-2 rounded-sm text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40">🔒 Private</button><button onClick={()=>createCourse(true)} disabled={!inputVal.trim()} className="px-4 py-2 rounded-sm text-xs font-bold bg-[#FF4500] text-white disabled:opacity-40">🌐 Public</button></div>
      </div></div></div>}
    </div>
  )
}
