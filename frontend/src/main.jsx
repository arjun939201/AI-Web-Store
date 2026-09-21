import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Search,ArrowUpRight,Share2,ChevronLeft,LoaderCircle,Sparkles} from 'lucide-react';
import './styles.css';
const API=import.meta.env.VITE_API_URL||'http://localhost:8000';

function Home({onResult}){
 const [q,setQ]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [apps,setApps]=useState([]),[appsLoading,setAppsLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  fetch(API+'/api/apps')
   .then(async r=>{if(!r.ok)throw Error('Unable to load created apps');return r.json()})
   .then(data=>{if(active)setApps(Array.isArray(data)?data:[])})
   .catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setAppsLoading(false)});
  return ()=>{active=false};
 },[]);
 async function submit(e){if(e)e.preventDefault();if(!q.trim()||loading)return;setLoading(true);setError('');
  try{const r=await fetch(API+'/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q.trim()})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Something went wrong');setApps(prev=>[d.app,...prev.filter(x=>x.slug!==d.app.slug)]);onResult(d.app)}
  catch(e){setError(e.message)}finally{setLoading(false)}
 }
 return <main className="home"><div className="hero"><form className="search" onSubmit={submit}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="What do you want to build?" aria-label="What do you want to build?"/><button aria-label="Search" disabled={!q.trim()||loading}>{loading?<LoaderCircle className="spin"/>:<Search/>}</button></form><div className="brand">AI Store</div>{error&&<div className="error">{error}</div>}
  {(appsLoading||apps.length>0)&&<section className="library" aria-label="Created apps"><div className="library-head"><h2>Created Apps</h2>{appsLoading&&<LoaderCircle className="spin"/>}</div>{!appsLoading&&<div className="app-list">{apps.map(app=><a className="app-tile" href={'/app/'+app.slug} key={app.slug}><span className="tile-icon">{app.icon}</span><span className="tile-copy"><strong>{app.name}</strong><small>{app.category}</small></span><ArrowUpRight/></a>)}</div>}</section>}
  </div></main>
}

function AppView({app,onBack}){
 const [shared,setShared]=useState(false);
 async function share(){try{const r=await fetch(API+'/api/apps/'+app.slug+'/share',{method:'POST'});const d=await r.json();if(navigator.clipboard)await navigator.clipboard.writeText(d.url);setShared(true);setTimeout(()=>setShared(false),1800)}catch{}}
 return <div className="shell"><header className="top"><button className="back" onClick={onBack}><ChevronLeft/> AI Store</button><span className="topmark"><Sparkles/> AI Store</span></header><main className="result"><div className="app-card"><div className="app-icon">{app.icon}</div><div className="pill">{app.category}</div><h1>{app.name}</h1><p className="description">{app.description}</p><div className="actions"><a className="primary" href={'/run/'+app.slug}>Open App <ArrowUpRight/></a><button className="secondary" onClick={share}><Share2/> {shared?'Link copied':'Share'}</button></div><div className="meta">Created {new Date(app.created_at).toLocaleDateString()}</div></div><section className="details"><div><h2>Features</h2><div className="chips">{(app.features||[]).map((x,i)=><span key={i}>{x}</span>)}</div></div><div><h2>Pages</h2><div className="pages">{((app.specification||{}).pages||[]).map((x,i)=><div key={i}>{x}</div>)}</div></div></section></main></div>
}

function AppRuntime({slug}){
 const [app,setApp]=useState(null),[err,setErr]=useState('');
 useEffect(()=>{fetch(API+'/api/apps/'+slug).then(async r=>{if(!r.ok)throw Error('Application not found');setApp(await r.json())}).catch(e=>setErr(e.message))},[slug]);
 if(err)return <div className="center"><p>{err}</p><a className="secondary" href="/">Back to AI Store</a></div>;
 if(!app)return <div className="center"><LoaderCircle className="spin"/></div>;
 const pages=(app.specification||{}).pages||[];
 const features=app.features||[];
 return <div className="shell runtime-shell"><header className="top"><a className="back" href={'/app/'+app.slug}><ChevronLeft/> Back to App</a><span className="topmark"><Sparkles/> AI Store</span></header><main className="runtime"><div className="runtime-head"><div className="app-icon">{app.icon}</div><div><span className="pill">{app.category}</span><h1>{app.name}</h1><p>{app.description}</p></div></div><div className="runtime-grid"><aside className="runtime-nav"><h2>Pages</h2>{pages.length?pages.map((page,i)=><button key={i} className={i===0?'active':''}>{page}</button>):<span>No pages defined</span>}</aside><section className="runtime-panel"><div className="runtime-panel-head"><div><h2>{pages[0]||'App Home'}</h2><p>Your generated app workspace.</p></div></div><div className="runtime-features"><h3>Available Features</h3>{features.length?features.map((feature,i)=><div className="runtime-feature" key={i}><span>✓</span>{feature}</div>):<div className="runtime-empty">No features defined.</div>}</div></section></div></main></div>
}

function PublicApp({slug}){
 const [app,setApp]=useState(null),[err,setErr]=useState('');
 useEffect(()=>{fetch(API+'/api/apps/'+slug).then(async r=>{if(!r.ok)throw Error('Application not found');setApp(await r.json())}).catch(e=>setErr(e.message))},[slug]);
 if(err)return <div className="center"><p>{err}</p><a className="secondary" href="/">Back to AI Store</a></div>;
 if(!app)return <div className="center"><LoaderCircle className="spin"/></div>;
 return <AppView app={app} onBack={()=>location.href='/'}/>
}

function Root(){
 const [app,setApp]=useState(null),path=location.pathname;
 if(app)return <AppView app={app} onBack={()=>setApp(null)}/>;
 if(path.startsWith('/run/'))return <AppRuntime slug={path.slice(5)}/>;
 if(path.startsWith('/app/'))return <PublicApp slug={path.slice(5)}/>;
 return <Home onResult={setApp}/>;
}
createRoot(document.getElementById('root')).render(<Root/>);
