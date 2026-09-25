import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Search,ArrowUpRight,Share2,ChevronLeft,LoaderCircle,Sparkles} from 'lucide-react';
import './styles.css';
import {listRecords,createRecord,updateRecord,deleteRecord} from './dataApi.js';
const API=import.meta.env.VITE_API_URL||'http://localhost:8000';

function Home({onResult,token,user,onAuth,onLogout}){
 const [q,setQ]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [apps,setApps]=useState([]),[appsLoading,setAppsLoading]=useState(true),[appSearch,setAppSearch]=useState('');
 useEffect(()=>{
  let active=true;
  fetch(API+'/api/apps')
   .then(async r=>{if(!r.ok)throw Error('Unable to load created apps');return r.json()})
   .then(data=>{if(active)setApps(Array.isArray(data)?data:[])})
   .catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setAppsLoading(false)});
  return ()=>{active=false};
 },[]);
 async function submit(e){if(e)e.preventDefault();if(!q.trim()||loading)return;if(!token){onAuth();return;}setLoading(true);setError('');
  try{const r=await fetch(API+'/api/search',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({query:q.trim()})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Something went wrong');setApps(prev=>[d.app,...prev.filter(x=>x.slug!==d.app.slug)]);onResult(d.app);window.location.assign('/run/'+d.app.slug)}
  catch(e){if(e.message.includes('Authentication')||e.message.includes('Invalid or expired'))onLogout();setError(e.message)}finally{setLoading(false)}
 }
 return <main className="home"><div className="account-bar">{user?<><span>{user.name||user.email}</span><button onClick={onLogout}>Sign out</button></>:<button onClick={onAuth}>Sign in</button>}</div><div className="hero"><div className="brand">AI Store</div><form className="search" onSubmit={submit}><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="What do you want to build?" aria-label="What do you want to build?"/><button aria-label="Build application" disabled={!q.trim()||loading}>{loading?<><LoaderCircle className="spin"/><span className="build-label">Building</span></>:<><Search/><span className="build-label">Build</span></>}</button></form>{error&&<div className="error">{error}</div>}
  {(appsLoading||apps.length>0)&&<section className="library" aria-label="Created apps"><div className="library-head"><h2>Created Apps</h2>{appsLoading&&<LoaderCircle className="spin"/>}</div>{!appsLoading&&<><div className="app-search"><Search/><input value={appSearch} onChange={e=>setAppSearch(e.target.value)} placeholder="Search created apps..." aria-label="Search created apps"/></div><div className="app-list">{apps.filter(app=>{const q=appSearch.trim().toLowerCase();return !q||app.name.toLowerCase().includes(q)}).map(app=><a className="app-tile" href={'/app/'+app.slug} key={app.slug}><span className="tile-icon">{app.icon}</span><span className="tile-copy"><strong>{app.name}</strong><small>{app.category}</small></span><ArrowUpRight/></a>)}</div>{apps.length>0&&apps.filter(app=>{const q=appSearch.trim().toLowerCase();return !q||app.name.toLowerCase().includes(q)}).length===0&&<div className="app-search-empty">No created apps match “{appSearch}”.</div>}</>}</section>}
  </div></main>
}

function AuthModal({onClose,onAuthenticated}){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function submit(e){e.preventDefault();if(loading)return;setLoading(true);setError('');try{const endpoint=mode==='login'?'/api/auth/login':'/api/auth/register';const r=await fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name})});let data={};try{data=await r.json()}catch{}if(!r.ok)throw Error(data.detail||('Authentication request failed ('+r.status+').'));onAuthenticated(data)}catch(err){setError(err instanceof TypeError?'Unable to reach the AI Store API. Please try again in a moment.':err.message)}finally{setLoading(false)}}
 return <div className="auth-overlay" role="dialog" aria-modal="true"><div className="auth-card"><button className="auth-close" onClick={onClose} aria-label="Close">×</button><div className="auth-brand">AI Store</div><h2>{mode==='login'?'Welcome back':'Create your account'}</h2><p>{mode==='login'?'Sign in to create and save your AI apps.':'Create an account to own your generated apps.'}</p><form onSubmit={submit}>{mode==='register'&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" maxLength="120" autoComplete="name"/>}<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (8+ characters)" type="password" minLength="8" maxLength="128" autoComplete={mode==='login'?'current-password':'new-password'} required/>{error&&<div className="auth-error">{error}</div>}<button className="primary auth-submit" disabled={loading}>{loading?<LoaderCircle className="spin"/>:mode==='login'?'Sign in':'Create account'}</button></form><button className="auth-switch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Already have an account? Sign in'}</button></div></div>
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

function entityByName(runtime,name){return (runtime.entities||[]).find(entity=>entity.name===name)}

function fieldDefault(field){
 if(field.default!==null&&field.default!==undefined)return field.default;
 if(field.type==='boolean')return false;
 return '';
}

function DataForm({entity,onCreate}) {
 const [draft,setDraft]=useState(()=>Object.fromEntries(entity.fields.map(field=>[field.key,fieldDefault(field)])));
 const [message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 function update(key,value){setDraft(current=>({...current,[key]:value}));setMessage('')}
 async function submit(e){
  e.preventDefault();if(saving)return;
  const missing=entity.fields.find(field=>field.required&&(draft[field.key]===undefined||draft[field.key]===null||draft[field.key]===''));
  if(missing){setMessage(missing.label+' is required.');return}
  setSaving(true);setMessage('');
  try{await onCreate({...draft});setDraft(Object.fromEntries(entity.fields.map(field=>[field.key,fieldDefault(field)])));setMessage('Saved to your account.')}
  catch(error){setMessage(error.message||'Could not save record.')}
  finally{setSaving(false)}
 }
 return <form className="data-form" onSubmit={submit}>
  {entity.fields.map(field=><label className="runtime-field" key={field.key}><span>{field.label}{field.required?' *':''}</span>{field.type==='select'?<select required={field.required} value={String(draft[field.key]??'')} onChange={e=>update(field.key,e.target.value)}><option value="">Choose...</option>{(field.options||[]).map((option,i)=><option key={i} value={option}>{option}</option>)}</select>:field.type==='boolean'?<input type="checkbox" checked={Boolean(draft[field.key])} onChange={e=>update(field.key,e.target.checked)}/>:<input required={field.required} type={field.type==='number'?'number':field.type==='date'?'date':'text'} value={String(draft[field.key]??'')} onChange={e=>update(field.key,field.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)} />}</label>)}
  <div className="data-form-actions"><button className="runtime-action" type="submit" disabled={saving}>{saving?'Saving…':'Add '+entity.name}</button>{message&&<span className="data-form-message" role="status">{message}</span>}</div>
 </form>
}

function DataTable({entity,fields,state,onUpdate,onDelete,limit}) {
 const rows=((state.__data||{})[entity.name]||[]).slice(-limit).reverse();
 const columns=fields.length?entity.fields.filter(field=>fields.includes(field.key)):entity.fields;
 const [editingId,setEditingId]=useState(null),[draft,setDraft]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 function startEdit(row){setEditingId(row.__id);setDraft(Object.fromEntries(entity.fields.map(field=>[field.key,row[field.key]??fieldDefault(field)]));setError('')}
 function cancelEdit(){setEditingId(null);setDraft({});setError('')}
 async function saveEdit(){if(busy)return;setBusy(true);setError('');try{await onUpdate(editingId,draft);cancelEdit()}catch(e){setError(e.message||'Update failed')}finally{setBusy(false)}}
 async function remove(id){if(busy)return;setBusy(true);setError('');try{await onDelete(id)}catch(e){setError(e.message||'Delete failed')}finally{setBusy(false)}}
 function update(key,value){setDraft(current=>({...current,[key]:value}))}
 return <div className="data-table-wrap">{error&&<div className="error" role="alert">{error}</div>}{rows.length?<table className="data-table"><thead><tr>{columns.map(field=><th key={field.key}>{field.label}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map(row=>{const editing=row.__id===editingId;return <tr key={row.__id}>{columns.map(field=><td key={field.key}>{editing?(field.type==='select'?<select className="data-edit-input" value={String(draft[field.key]??'')} onChange={e=>update(field.key,e.target.value)}><option value="">Choose...</option>{(field.options||[]).map((option,i)=><option key={i} value={option}>{option}</option>)}</select>:field.type==='boolean'?<input type="checkbox" checked={Boolean(draft[field.key])} onChange={e=>update(field.key,e.target.checked)}/>:<input className="data-edit-input" type={field.type==='number'?'number':field.type==='date'?'date':'text'} value={String(draft[field.key]??'')} onChange={e=>update(field.key,field.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/>):field.type==='boolean'?(row[field.key]?'Yes':'No'):String(row[field.key]??'')}</td>)}<td className="data-row-actions">{editing?<><button className="data-edit save" disabled={busy} onClick={saveEdit} type="button">Save</button><button className="data-edit" disabled={busy} onClick={cancelEdit} type="button">Cancel</button></>:<><button className="data-edit" disabled={busy} onClick={()=>startEdit(row)} type="button">Edit</button><button className="data-delete" disabled={busy} onClick={()=>remove(row.__id)} type="button">Delete</button></>}</td></tr>})}</tbody></table>:<div className="runtime-empty">No {entity.name.toLowerCase()} records yet.</div>}</div>
}

function DataSummary({entity,field,aggregate,state}){
 const rows=((state.__data||{})[entity.name]||[]);
 let value=rows.length;
 if(aggregate!=='count'&&field){const values=rows.map(row=>Number(row[field])).filter(value=>Number.isFinite(value));value=values.length?(aggregate==='sum'?values.reduce((a,b)=>a+b,0):values.reduce((a,b)=>a+b,0)/values.length):0}
 return <div className="runtime-stat"><span>{aggregate==='count'?'Total '+entity.name:aggregate.toUpperCase()+' '+field}</span><strong>{aggregate==='count'?value:Number(value).toFixed(2)}</strong></div>
}

function RuntimeComponent({component,state,setState,onAction,isGame,runtime,onCreate,onUpdate,onDelete}){
 const value=component.data_key?state[component.data_key]??'':'';
 if(component.type==='data_form'){
  const entity=entityByName(runtime,component.entity);
  return entity?<DataForm entity={entity} onCreate={data=>onCreate(entity.name,data)}/>:null;
 }
 if(component.type==='data_table'){
  const entity=entityByName(runtime,component.entity);
  return entity?<DataTable entity={entity} fields={component.fields||[]} state={state} onUpdate={(id,data)=>onUpdate(entity.name,id,data)} onDelete={id=>onDelete(entity.name,id)} limit={component.limit||50}/>:null;
 }
 if(component.type==='data_summary'){
  const entity=entityByName(runtime,component.entity);
  return entity?<DataSummary entity={entity} field={component.data_key} aggregate={component.aggregate||'count'} state={state}/>:null;
 }
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

function AppRuntime({slug,token,onLogout}){
 const [app,setApp]=useState(null),[err,setErr]=useState(''),[activePage,setActivePage]=useState(0),[state,setState]=useState({});
 useEffect(()=>{fetch(API+'/api/apps/'+slug).then(async r=>{if(!r.ok)throw Error('Application not found');setApp(await r.json())}).catch(e=>setErr(e.message))},[slug]);
 useEffect(()=>{if(!app)return;let active=true;const entities=app.specification?.runtime?.entities||[];setState({});if(!entities.length)return;
  if(!token){setErr('Sign in to load and save this app’s private records.');return;}
  Promise.all(entities.map(async entity=>[entity.name,await listRecords(app.slug,entity.name,token)]))
   .then(entries=>{if(active){setState({__data:Object.fromEntries(entries.map(([name,records])=>[name,records.map(record=>({...record.data,__id:String(record.id)}))]))});setErr('')}})
   .catch(error=>{if(active){setErr(error.message);if(error.message.includes('session has expired'))onLogout?.() }});
  return()=>{active=false};
 },[app,token,slug]);
 async function createRuntimeRecord(entity,data){const record=await createRecord(app.slug,entity,token,data);setState(current=>({...current,__data:{...(current.__data||{}),[entity]:[...((current.__data||{})[entity]||[]),{...record.data,__id:String(record.id)}]}}))}
 async function updateRuntimeRecord(entity,id,data){const record=await updateRecord(app.slug,entity,id,token,data);setState(current=>({...current,__data:{...(current.__data||{}),[entity]:((current.__data||{})[entity]||[]).map(row=>row.__id===String(id)?{...record.data,__id:String(record.id)}:row)}}))}
 async function deleteRuntimeRecord(entity,id){await deleteRecord(app.slug,entity,id,token);setState(current=>({...current,__data:{...(current.__data||{}),[entity]:((current.__data||{})[entity]||[]).filter(row=>row.__id!==String(id))}}))}
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
 return <div className="shell runtime-shell"><header className="top"><a className="back" href={'/app/'+app.slug}><ChevronLeft/> Back to App</a><span className="topmark"><Sparkles/> AI Store</span></header><main className="runtime"><div className="runtime-head"><div className="app-icon">{app.icon}</div><div><span className="pill">{app.category}</span><h1>{app.name}</h1><p>{app.description}</p></div></div><div className="runtime-grid"><aside className="runtime-nav"><h2>Pages</h2>{pages.map((item,i)=><button key={i} className={i===activePage?'active':''} onClick={()=>setActivePage(i)}>{item.name}</button>)}</aside><section className="runtime-panel"><div className="runtime-panel-head"><div><h2>{page.name}</h2><p>Interactive generated application.</p></div></div><div className="runtime-components">{page.components.map((component,i)=><RuntimeComponent key={i} component={component} state={state} setState={setState} onAction={onAction} isGame={runtime.app_type==='game'} runtime={runtime} onCreate={createRuntimeRecord} onUpdate={updateRuntimeRecord} onDelete={deleteRuntimeRecord}/>)}</div></section></div></main></div>
}
function PublicApp({slug}){
 const [app,setApp]=useState(null),[err,setErr]=useState('');
 useEffect(()=>{fetch(API+'/api/apps/'+slug).then(async r=>{if(!r.ok)throw Error('Application not found');setApp(await r.json())}).catch(e=>setErr(e.message))},[slug]);
 if(err)return <div className="center"><p>{err}</p><a className="secondary" href="/">Back to AI Store</a></div>;
 if(!app)return <div className="center"><LoaderCircle className="spin"/></div>;
 return <AppView app={app} onBack={()=>location.href='/'}/>
}

function Root(){
 const [app,setApp]=useState(null),[token,setToken]=useState(()=>localStorage.getItem('ai-store-token')||''),[user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('ai-store-user')||'null')}catch{return null}}),[authOpen,setAuthOpen]=useState(false),path=location.pathname;
 function authenticated(data){localStorage.setItem('ai-store-token',data.token);localStorage.setItem('ai-store-user',JSON.stringify(data.user));setToken(data.token);setUser(data.user);setAuthOpen(false)}
 function logout(){localStorage.removeItem('ai-store-token');localStorage.removeItem('ai-store-user');setToken('');setUser(null)}
 if(app)return <AppView app={app} onBack={()=>setApp(null)}/>;
 if(path.startsWith('/run/'))return <AppRuntime slug={path.slice(5)} token={token} onLogout={logout}/>;
 if(path.startsWith('/app/'))return <PublicApp slug={path.slice(5)}/>;
 return <><Home onResult={setApp} token={token} user={user} onAuth={()=>setAuthOpen(true)} onLogout={logout}/>{authOpen&&<AuthModal onClose={()=>setAuthOpen(false)} onAuthenticated={authenticated}/>}</>;
}
createRoot(document.getElementById('root')).render(<Root/>);
