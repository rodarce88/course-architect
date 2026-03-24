const fs = require('fs');
const YOUTUBE_API_KEY = 'AIzaSyApv4VpAo73Y4Rlpch-3EyZ97cAffSx7ko';

async function fetchVid(url) {
  const m = url.match(/v=([a-zA-Z0-9_-]{11})/);
  if (!m) return null;
  const id = m[1];
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${YOUTUBE_API_KEY}`);
  const d = await r.json();
  if (!d.items?.length) { console.log('  SKIP:', url); return null; }
  const v = d.items[0];
  const dur = v.contentDetails.duration;
  const dm = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  let duration = '';
  if (dm) { const h=dm[1]||'',mi=dm[2]||'0',s=(dm[3]||'0').padStart(2,'0'); duration=h?`${h}:${mi.padStart(2,'0')}:${s}`:`${mi}:${s}`; }
  const cr = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${v.snippet.channelId}&key=${YOUTUBE_API_KEY}`);
  const cd = await cr.json();
  const ch = cd.items?.[0];
  const sc = parseInt(ch?.statistics?.subscriberCount||'0');
  const hidden = ch?.statistics?.hiddenSubscriberCount===true;
  let subs = '';
  if (!hidden&&sc>0) { if(sc>=1e6)subs=(sc/1e6).toFixed(1).replace('.0','')+'M';else if(sc>=1e3)subs=(sc/1e3).toFixed(1).replace('.0','')+'K';else subs=sc.toString(); }
  const rv=parseInt(v.statistics.viewCount||'0'), rl=parseInt(v.statistics.likeCount||'0');
  const fmt=n=>{if(n>=1e6)return(n/1e6).toFixed(1).replace('.0','')+'M';if(n>=1e3)return(n/1e3).toFixed(1).replace('.0','')+'K';return n.toString();};
  return { id, iid:'seed_'+id, title:v.snippet.title, thumbnail:v.snippet.thumbnails.high.url, channel:v.snippet.channelTitle, channelImg:ch?.snippet?.thumbnails?.default?.url||'', subscribers:subs, views:rv.toLocaleString(), viewsShort:fmt(rv), likes:rl.toLocaleString(), likesShort:fmt(rl), duration, url, completed:false, notes:[], votes:0, votedBy:[] };
}

const modules = [
  { name:"The Professional Workflow & Media Management", subs:[
    { name:"Setting Up for Success", urls:["https://www.youtube.com/watch?v=sO7m_R0NAsM"] },
    { name:"Proxy Workflow & Optimized Media", urls:["https://www.youtube.com/watch?v=FjS6mCHn2k0"] },
    { name:"Smart Bins & Organization", urls:["https://www.youtube.com/watch?v=n76V9v9WJks"] },
  ]},
  { name:"Advanced Editing Techniques", subs:[
    { name:"Dynamic Trimming & J-K-L Editing", urls:["https://www.youtube.com/watch?v=685O_e0C7pI"] },
    { name:"Multicam Editing", urls:["https://www.youtube.com/watch?v=uK48q24k7_M"] },
    { name:"Speed Ramps & Time Remapping", urls:["https://www.youtube.com/watch?v=KshB6_21XfE"] },
  ]},
  { name:"Color Correction", subs:[
    { name:"Reading Scopes & Balancing", urls:["https://www.youtube.com/watch?v=7zE3yGInU3k"] },
    { name:"Parallel & Layer Nodes", urls:["https://www.youtube.com/watch?v=Xv6yI_4p0-Q"] },
    { name:"Skin Tone Accuracy", urls:["https://www.youtube.com/watch?v=r0fN2Hn1N_I"] },
  ]},
  { name:"Cinematic Color Grading", subs:[
    { name:"Teal & Orange Look", urls:["https://www.youtube.com/watch?v=O6X2S6K5K4g"] },
    { name:"LUTs vs Manual Grading", urls:["https://www.youtube.com/watch?v=f-n9-4iM3zY"] },
    { name:"Film Grain & Halation", urls:["https://www.youtube.com/watch?v=1F9h_k5S6-Y"] },
  ]},
  { name:"Fusion VFX & Motion Graphics", subs:[
    { name:"Node-Based Compositing", urls:["https://www.youtube.com/watch?v=mYvK2vW_zGo"] },
    { name:"Motion Tracking & Object Removal", urls:["https://www.youtube.com/watch?v=uD9H62YyC78"] },
    { name:"3D Text & Title Design", urls:["https://www.youtube.com/watch?v=mU_S6j13XbE"] },
  ]},
  { name:"Fairlight Audio Post-Production", subs:[
    { name:"EQ & Compression for Voiceovers", urls:["https://www.youtube.com/watch?v=f0Yp-Y7XW24"] },
    { name:"Noise Reduction & Audio Repair", urls:["https://www.youtube.com/watch?v=ZfF32D-I6Xk"] },
    { name:"Sound Design & Foley", urls:["https://www.youtube.com/watch?v=LqO2fDskP7E"] },
  ]},
];

async function main() {
  let c = 0;
  const result = {
    id: 'seed_resolve_' + Date.now(),
    name: "Cinematic Resolve Masterclass",
    description: "Go beyond simple cuts. Master professional color grading workflows, Fairlight audio post-production, and Fusion VFX in the world's most powerful editor.",
    category: "Video Editing",
    isPublic: true, active: true,
    owner: "Course Architect", ownerHandle: "coursearchitect", ownerImg: "",
    enrolledBy: [], shareCode: "RSV-PRO", createdAt: Date.now(),
    modules: []
  };

  for (const mod of modules) {
    const m = { id: 'mod_'+(++c)+'_'+Date.now(), name: mod.name, createdAt: Date.now(), subs: [] };
    for (const sub of mod.subs) {
      const s = { id: 'sub_'+(++c)+'_'+Date.now(), name: sub.name, createdAt: Date.now(), videos: [] };
      for (const url of sub.urls) {
        process.stdout.write('  Fetching: ' + url.split('v=')[1] + '...');
        const vid = await fetchVid(url);
        if (vid) { s.videos.push(vid); console.log(' OK'); }
        else console.log(' FAIL');
        await new Promise(r => setTimeout(r, 250));
      }
      m.subs.push(s);
    }
    result.modules.push(m);
    console.log('Module done: ' + mod.name);
  }

  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/course-resolve.json', JSON.stringify(result, null, 2));
  const total = result.modules.reduce((a,m) => a + m.subs.reduce((b,s) => b + s.videos.length, 0), 0);
  console.log('\nDone! ' + total + '/18 videos');
  console.log('Saved to public/data/course-resolve.json');
}

main().catch(console.error);
