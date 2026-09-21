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
 return <main className="home"><div className="hero"><div className="brand">AI Store</div><form className="search" onSubmit={submit}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="What do you want to build?" aria-label="What do you want to build?"/><button aria-label="Search" disabled={!q.trim()||loading}>{loading?<LoaderCircle className="spin"/>:<Search/>}</button></form>{error&&<div className="error">{error}</div>}
  {(appsLoading||apps.length>0)&&<section className="library" aria-label="Created apps"><div className="library-head"><h2>Created Apps</h2>{appsLoading&&<LoaderCircle className="spin"/>}</div>{!appsLoading&&<div className="app-list">{apps.map(app=><a className="app-tile" href={'/app/'+app.slug} key={app.slug}><span className="tile-icon">{app.icon}</span><span className="tile-copy"><strong>{app.name}</strong><small>{app.category}</small></span><ArrowUpRight/></a>)}</div>}</section>}
  </div></main>
}

function AppView({app,onBack}){
 const [shared,setShared]=useState(false);
 async function share(){try{const r=await fetch(API+'/api/apps/'+app.slug+'/share',{method:'POST'});const d=await r.json();if(navigator.clipboard)await navigator.clipboard.writeText(d.url);setShared(true);setTimeout(()=>setShared(false),1800)}catch{}}
 return <div className="shell"><header className="top"><button className="back" onClick={onBack}><ChevronLeft/> AI Store</button><span className="topmark"><Sparkles/> AI Store</span></header><main className="result"><div className="app-card"><div className="app-icon">{app.icon}</div><div className="pill">{app.category}</div><h1>{app.name}</h1><p className="description">{app.description}</p><div className="actions"><a className="primary" href={'/run/'+app.slug}>Open App <ArrowUpRight/></a><button className="secondary" onClick={share}><Share2/> {shared?'Link copied':'Share'}</button></div><div className="meta">Created {new Date(app.created_at).toLocaleDateString()}</div></div><section className="details"><div><h2>Features</h2><div className="chips">{(app.features||[]).map((x,i)=><span key={i}>{x}</span>)}</div></div><div><h2>Pages</h2><div className="pages">{((app.specification||{}).pages||[]).map((x,i)=><div key={i}>{x}</div>)}</div></div></section></main></div>
}

function SnakeBoard(){
 const size=16;
 const [snake,setSnake]=useState([[8,8],[7,8],[6,8]]),[food,setFood]=useState([11,8]),[dir,setDir]=useState([1,0]),[running,setRunning]=useState(false),[score,setScore]=useState(0);
 useEffect(()=>{const onKey=e=>{const keys={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};const next=keys[e.key];if(!next)return;e.preventDefault();if(next[0]===-dir[0]&&next[1]===-dir[1])return;setDir(next)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[dir]);
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>{setSnake(current=>{const head=[current[0][0]+dir[0],current[0][1]+dir[1]];const hitWall=head[0]<0||head[0]>=size||head[1]<0||head[1]>=size;const hitSelf=current.some(([x,y])=>x===head[0]&&y===head[1]);if(hitWall||hitSelf){setRunning(false);return current}const ate=head[0]===food[0]&&head[1]===food[1];if(ate){setScore(s=>s+10);setFood([Math.floor(Math.random()*size),Math.floor(Math.random()*size)]);return [head,...current]}return [head,...current.slice(0,-1)]})},140);return()=>clearInterval(timer)},[running,dir,food]);
 function reset(){setSnake([[8,8],[7,8],[6,8]]);setFood([11,8]);setDir([1,0]);setScore(0);setRunning(false)}
 return <div className="game-wrap"><div className="game-top"><strong>Score: {score}</strong><span>{running?'Playing':'Paused'}</span></div><div className="game-board">{Array.from({length:size*size},(_,i)=>{const x=i%size,y=Math.floor(i/size),isSnake=snake.some(([sx,sy])=>sx===x&&sy===y),isFood=food[0]===x&&food[1]===y;return <div key={i} className={'game-cell '+(isSnake?'snake':'')+(isFood?' food':'')}/>})}</div><div className="game-controls"><button className="primary" onClick={()=>setRunning(true)}>Start</button><button className="secondary" onClick={()=>setRunning(false)}>Pause</button><button className="secondary" onClick={reset}>Reset</button></div><p className="game-help">Use the arrow keys to move.</p></div>
}

function RuntimeComponent({component,state,setState,onAction,isGame}){
 const value=component.data_key?state[component.data_key]??'':'';
 switch(component.type){
  case 'heading': return <h3 className="runtime-component-heading">{component.text||component.label}</h3>;
  case 'text': return <p className="runtime-component-text">{component.text||component.label}</p>;
  case 'button': return <button className="runtime-action" onClick={()=>onAction(component.action||'save')}>{component.label||component.text||'Action'}</button>;
  case 'input': return <label className="runtime-field"><span>{component.label||'Input'}</span><input value={String(value)} placeholder={component.placeholder} onChange={e=>component.data_key&&setState(s=>({...s,[component.data_key]:e.target.value}))}/></label>;
  case 'textarea': return <label className="runtime-field"><span>{component.label||'Text'}</span><textarea value={String(value)} placeholder={component.placeholder} onChange={e=>component.data_key&&setState(s=>({...s,[component.data_key]:e.target.value}))}/></label>;
  case 'select': return <label className="runtime-field"><span>{component.label||'Select'}</span><select value={String(value)} onChange={e=>component.data_key&&setState(s=>({...s,[component.data_key]:e.target.value}))}><option value="">Choose...</option>{component.options.map((option,i)=><option key={i} value={option}>{option}</option>)}</select></label>;
  case 'checkbox': return <label className="runtime-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>component.data_key&&setState(s=>({...s,[component.data_key]:e.target.checked}))}/><span>{component.label||component.text||'Enable'}</span></label>;
  case 'stat': return <div className="runtime-stat"><span>{component.label||'Value'}</span><strong>{String(value||0)}</strong></div>;
  case 'list': return <div className="runtime-list">{Array.isArray(value)&&value.length?value.map((item,i)=><div key={i}>{typeof item==='object'?JSON.stringify(item):String(item)}</div>):<span className="runtime-empty">No items yet.</span>}</div>;
  case 'table': return <div className="runtime-table"><div className="runtime-empty">Add data to see it here.</div></div>;
  case 'chart': return <div className="runtime-chart"><div className="chart-bars">{[35,62,48,78,54,88,68].map((h,i)=><span key={i} style={{height:h+'%'}} title={'Value '+(i+1)}/>)}</div><small>Activity overview</small></div>;
  case 'card': return <div className="runtime-card-block"><strong>{component.label||'Information'}</strong><p>{component.text}</p></div>;
  case 'game_board': return isGame?<SnakeBoard/>:<div className="runtime-card-block">Interactive game board</div>;
  default:return null;
 }
}

function AppRuntime({slug}){
 const [app,setApp]=useState(null),[err,setErr]=useState(''),[activePage,setActivePage]=useState(0),[state,setState]=useState({});
 useEffect(()=>{fetch(API+'/api/apps/'+slug).then(async r=>{if(!r.ok)throw Error('Application not found');setApp(await r.json())}).catch(e=>setErr(e.message))},[slug]);
 useEffect(()=>{if(app){try{const saved=localStorage.getItem('ai-store:'+app.slug);if(saved)setState(JSON.parse(saved))}catch{}}},[app]);
 useEffect(()=>{if(app)try{localStorage.setItem('ai-store:'+app.slug,JSON.stringify(state))}catch{}},[app,state]);
 if(err)return <div className="center"><p>{err}</p><a className="secondary" href="/">Back to AI Store</a></div>;
 if(!app)return <div className="center"><LoaderCircle className="spin"/></div>;
 const runtime=(app.specification||{}).runtime||{};
 const pages=runtime.pages&&runtime.pages.length?runtime.pages:((app.specification||{}).pages||[]).map(name=>({name,components:[{type:'text',text:'This generated page is ready for runtime components.'}]}));
 const page=pages[Math.min(activePage,pages.length-1)]||{name:'Home',components:[]};
 function onAction(action){
  if(action==='toggle_item')setState(s=>({...s,completed:!s.completed}));
  else if(action==='add_item')setState(s=>({...s,items:[...(Array.isArray(s.items)?s.items:[]),s.new_item||'New item'],new_item:''}));
  else if(action==='delete_item')setState(s=>({...s,items:Array.isArray(s.items)?s.items.slice(0,-1):[]}));
  else if(action==='reset')setState({});
  else if(action==='save')setState(s=>({...s,saved:true}));
 }
 return <div className="shell runtime-shell"><header className="top"><a className="back" href={'/app/'+app.slug}><ChevronLeft/> Back to App</a><span className="topmark"><Sparkles/> AI Store</span></header><main className="runtime"><div className="runtime-head"><div className="app-icon">{app.icon}</div><div><span className="pill">{app.category}</span><h1>{app.name}</h1><p>{app.description}</p></div></div><div className="runtime-grid"><aside className="runtime-nav"><h2>Pages</h2>{pages.map((item,i)=><button key={i} className={i===activePage?'active':''} onClick={()=>setActivePage(i)}>{item.name}</button>)}</aside><section className="runtime-panel"><div className="runtime-panel-head"><div><h2>{page.name}</h2><p>Interactive generated application.</p></div></div><div className="runtime-components">{page.components.map((component,i)=><RuntimeComponent key={i} component={component} state={state} setState={setState} onAction={onAction} isGame={runtime.app_type==='game'}/>)}</div></section></div></main></div>
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
