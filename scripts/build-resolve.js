const fs = require('fs');
const KEY='AIzaSyApv4VpAo73Y4Rlpch-3EyZ97cAffSx7ko';
const ids = JSON.parse(fs.readFileSync('data/resolve-ids.json','utf8'));
const allIds = ids.map(i=>i.id);

async function main() {
  const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id='+allIds.join(',')+'&key='+KEY);
  const d = await r.json();
  const vids = {};
  for (const v of d.items) {
    const dur = v.contentDetails.duration;
    const dm = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    let duration = '';
    if(dm){const h=dm[1]||'',mi=dm[2]||'0',s=(dm[3]||'0').padStart(2,'0');duration=h?h+':'+mi.padStart(2,'0')+':'+s:mi+':'+s;}
    const rv=parseInt(v.statistics.viewCount||'0'),rl=parseInt(v.statistics.likeCount||'0');
    const fmt=n=>{if(n>=1e6)return(n/1e6).toFixed(1).replace('.0','')+'M';if(n>=1e3)return(n/1e3).toFixed(1).replace('.0','')+'K';return n.toString();};
    vids[v.id]={id:v.id,title:v.snippet.title,thumbnail:v.snippet.thumbnails.high.url,channel:v.snippet.channelTitle,channelImg:'',subscribers:'',views:rv.toLocaleString(),viewsShort:fmt(rv),likes:rl.toLocaleString(),likesShort:fmt(rl),duration,url:'https://www.youtube.com/watch?v='+v.id};
  }
  const chIds=[...new Set(d.items.map(v=>v.snippet.channelId))];
  const cr=await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id='+chIds.join(',')+'&key='+KEY);
  const cd=await cr.json();
  const chs={};
  for(const c of cd.items){
    const sc=parseInt(c.statistics.subscriberCount||'0');
    const hidden=c.statistics.hiddenSubscriberCount===true;
    let subs='';
    if(!hidden&&sc>0){if(sc>=1e6)subs=(sc/1e6).toFixed(1).replace('.0','')+'M';else if(sc>=1e3)subs=(sc/1e3).toFixed(1).replace('.0','')+'K';else subs=sc.toString();}
    chs[c.id]={img:c.snippet.thumbnails.default.url,subs};
  }
  for(const v of d.items){if(chs[v.snippet.channelId]){vids[v.id].channelImg=chs[v.snippet.channelId].img;vids[v.id].subscribers=chs[v.snippet.channelId].subs;}}

  const modules=[
    {name:'The Professional Workflow & Media Management',subs:[{name:'Setting Up for Success',idx:0},{name:'Proxy Workflow & Optimized Media',idx:1},{name:'Smart Bins & Organization',idx:2}]},
    {name:'Advanced Editing Techniques',subs:[{name:'Dynamic Trimming & J-K-L Editing',idx:3},{name:'Multicam Editing',idx:4},{name:'Speed Ramps & Time Remapping',idx:5}]},
    {name:'Color Correction',subs:[{name:'Reading Scopes & Balancing',idx:6},{name:'Parallel & Layer Nodes',idx:7},{name:'Skin Tone Accuracy',idx:8}]},
    {name:'Cinematic Color Grading',subs:[{name:'Teal & Orange Look',idx:9},{name:'LUTs vs Manual Grading',idx:10},{name:'Film Grain & Halation',idx:11}]},
    {name:'Fusion VFX & Motion Graphics',subs:[{name:'Node-Based Compositing',idx:12},{name:'Motion Tracking & Object Removal',idx:13},{name:'3D Text & Title Design',idx:14}]},
    {name:'Fairlight Audio Post-Production',subs:[{name:'EQ & Compression for Voiceovers',idx:15},{name:'Noise Reduction & Audio Repair',idx:16},{name:'Sound Design & Foley',idx:17}]},
  ];
  let c=0;
  const course={
    id:'seed_resolve_'+Date.now(),name:'Cinematic Resolve Masterclass',
    description:'Go beyond simple cuts. Master professional color grading workflows, Fairlight audio post-production, and Fusion VFX in DaVinci Resolve.',
    category:'Video Editing',isPublic:true,active:true,
    owner:'Course Architect',ownerHandle:'coursearchitect',ownerImg:'',
    enrolledBy:[],shareCode:'RSV-PRO',createdAt:Date.now(),
    modules:modules.map(m=>({
      id:'mod_'+(++c)+'_'+Date.now(),name:m.name,createdAt:Date.now(),
      subs:m.subs.map(s=>{
        const vid=vids[allIds[s.idx]];
        return{id:'sub_'+(++c)+'_'+Date.now(),name:s.name,createdAt:Date.now(),
          videos:vid?[{...vid,iid:'seed_'+vid.id,completed:false,notes:[],votes:0,votedBy:[]}]:[]};
      })
    }))
  };
  fs.writeFileSync('public/data/course-resolve.json',JSON.stringify(course,null,2));
  const total=course.modules.reduce((a,m)=>a+m.subs.reduce((b,s)=>b+s.videos.length,0),0);
  console.log('Done: '+total+'/18 videos with full data');
}
main();
