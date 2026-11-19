const $=s=>document.querySelector(s),A=$('#app');
const LS={g:(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},s:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const TOPICS=[...new Set(QUESTIONS.map(q=>q.t))],cnt=t=>QUESTIONS.filter(q=>q.t===t).length;
let user=null,profile=null,S=null,timer=null,prefs=LS.g('mls_prefs',{theme:'light',size:'medium'}),sel=LS.g('mls_sel',null);
function applyPrefs(){document.documentElement.dataset.theme=prefs.theme;document.documentElement.style.fontSize={small:'14px',medium:'16px',large:'19px'}[prefs.size]||'16px'}
const msg=(m,ok)=>'<p class="m '+(ok?'ok':'er')+'">'+esc(m)+'</p>';

/* ---------- AUTH ---------- */
function authView(mode,note,ok){
 mode=mode||'login';clearInterval(timer);$('#gs').hidden=true;
 const T={login:'Login',signup:'Create account',forgot:'Reset password'}[mode];
 A.innerHTML='<div class="card"><h2>'+T+'</h2><p class="sub">OlamDev MLS201 Quiz</p>'+(note?msg(note,ok):'')+
 (mode==='signup'?'<input id="n" placeholder="Full name">':'')+'<input id="e" type="email" placeholder="Email">'+
 (mode!=='forgot'?'<input id="p" type="password" placeholder="Password (min 6 characters)">':'')+
 '<button class="btn big" onclick="authGo(\''+mode+'\')">'+(mode==='forgot'?'Send reset link':T)+'</button>'+
 (mode!=='login'?'<a class="l" onclick="authView(\'login\')">Back to login</a>':'<a class="l" onclick="authView(\'signup\')">New student? Sign up</a><a class="l" onclick="authView(\'forgot\')">Forgot password?</a>')+'</div>';
}
async function authGo(mode){
 const e=$('#e').value.trim(),p=$('#p')?$('#p').value:'',n=$('#n')?$('#n').value.trim():'';
 if(!e)return authView(mode,'Enter your email');
 try{
  if(mode==='forgot'){const r=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});return authView('login',r.error?r.error.message:'Reset link sent. Check your email.',!r.error)}
  if(p.length<6)return authView(mode,'Password must be at least 6 characters');
  if(mode==='signup'){
   if(!n)return authView(mode,'Enter your full name');
   const r=await sb.auth.signUp({email:e,password:p,options:{data:{full_name:n,app_name:APP_NAME}}});
   if(r.error)throw r.error;
   if(r.data.session)return enter(r.data.session.user);
   return authView('login','Account created. Confirm your email, then login.',true);
  }
  const r=await sb.auth.signInWithPassword({email:e,password:p});
  if(r.error)throw r.error;enter(r.data.user);
 }catch(x){authView(mode,x.message||'Something went wrong')}
}
async function enter(u){
 const r=await sb.from('profiles').select('*').eq('id',u.id).eq('app_name',APP_NAME).maybeSingle();
 if(!r.data){await sb.auth.signOut();user=null;return authView('login','This account is not for MLS201')}
 user=u;profile=r.data;$('#gs').hidden=false;home();
}
function resetView(){A.innerHTML='<div class="card"><h2>Set new password</h2><input id="p" type="password" placeholder="New password (min 6)"><button class="btn big" onclick="newPw()">Save password</button></div>'}
async function newPw(){
 const p=$('#p').value;if(p.length<6)return alert('Minimum 6 characters');
 const r=await sb.auth.updateUser({password:p});if(r.error)return alert(r.error.message);
 alert('Password updated');const s=await sb.auth.getSession();s.data.session?enter(s.data.session.user):authView();
}
async function logout(){await sb.auth.signOut();user=null;profile=null;authView()}

/* ---------- HOME ---------- */
function home(){
 clearInterval(timer);S=null;const s=sel&&sel.t?sel:{t:TOPICS,n:'20',m:'practice'};
 A.innerHTML='<div class="card"><h2>Welcome, '+esc(profile.full_name||'Student')+'</h2><p class="sub">Medical Microbiology 201 - Medical Microbiology ('+QUESTIONS.length+' questions)</p></div>'+
 '<div class="card"><h3>Select topics</h3><div class="row"><button class="btn s" onclick="selAll(1)">Select All</button><button class="btn s o" onclick="selAll(0)">Clear All</button></div>'+
 TOPICS.map(t=>'<label class="chk"><input type="checkbox" class="tc" value="'+esc(t)+'" '+(s.t.includes(t)?'checked':'')+'> '+esc(t)+' ('+cnt(t)+' questions)</label>').join('')+'</div>'+
 '<div class="card"><h3>Number of questions</h3><select id="nq">'+['10','20','30','50','100','All'].map(n=>'<option '+(s.n===n?'selected':'')+'>'+n+'</option>').join('')+'</select>'+
 '<h3>Mode</h3><select id="md">'+[['practice','Practice (instant answers, no timer)'],['exam','Exam (timer, answers at end)'],['timed','Track / Timed (60s per question)']].map(m=>'<option value="'+m[0]+'" '+(s.m===m[0]?'selected':'')+'>'+m[1]+'</option>').join('')+'</select></div>'+
 '<button class="btn big" onclick="start()">Start Quiz</button><button class="btn big o" onclick="scores()">My Scores</button>';
}
function selAll(v){document.querySelectorAll('.tc').forEach(c=>c.checked=!!v)}

/* ---------- QUIZ ---------- */
function start(re){
 let c=re;
 if(!c){const t=[...document.querySelectorAll('.tc:checked')].map(x=>x.value);if(!t.length)return alert('Select at least one topic');c={t:t,n:$('#nq').value,m:$('#md').value};sel=c;LS.s('mls_sel',c)}
 let qs=shuffle(QUESTIONS.filter(q=>c.t.includes(q.t)));if(c.n!=='All')qs=qs.slice(0,+c.n);
 qs=qs.map(q=>{const o=shuffle(q.o.map((x,i)=>({x:x,c:i===q.a})));return Object.assign({},q,{o:o.map(z=>z.x),a:o.findIndex(z=>z.c)})});
 S={c:c,qs:qs,i:0,ans:qs.map(()=>null),m:c.m,used:0,paused:false,left:c.m==='exam'?qs.length*60:60};
 clearInterval(timer);timer=setInterval(tick,1000);quiz();
}
function tick(){
 if(!S||S.paused)return;S.used++;if(S.m==='practice')return;S.left--;
 if(S.left<=0){if(S.m==='exam')return finish();if(S.i<S.qs.length-1){S.i++;S.left=60;return quiz()}return finish()}
 const e=$('#tm');if(e)e.textContent=fmt(S.left);
}
function quiz(){
 const q=S.qs[S.i],a=S.ans[S.i],n=S.qs.length,rev=S.m==='practice'&&a!==null;
 A.innerHTML='<div class="qh"><span>Question '+(S.i+1)+'/'+n+'</span><span id="tm" class="tm">'+(S.m==='practice'?'No timer':fmt(S.left))+'</span>'+
 (S.m!=='practice'?'<button class="btn s o" onclick="pause()">'+(S.paused?'Resume':'Pause')+'</button>':'')+'</div><div class="bar"><i style="width:'+((S.i+1)/n*100)+'%"></i></div>'+
 (S.paused?'<div class="card"><h3>Paused</h3><p>Press Resume to continue.</p></div>':
 '<div class="card"><small>'+esc(q.t)+' &middot; '+q.d+'</small><h3>'+esc(q.q)+'</h3>'+
 q.o.map((o,i)=>'<button class="opt '+(rev?(i===q.a?'good':i===a?'bad':''):(a===i?'pick':''))+'" '+(rev?'disabled':'')+' onclick="pickA('+i+')"><b>'+'ABCD'[i]+'</b><span>'+esc(o)+'</span></button>').join('')+
 (rev?'<div class="ex"><b>'+(a===q.a?'Correct! ':'Wrong. ')+'</b>'+esc(q.e)+'</div>':'')+'</div>')+
 '<div class="row"><button class="btn o" '+(S.i===0||S.m==='timed'?'disabled':'')+' onclick="go(-1)">Previous</button>'+
 (S.i<n-1?'<button class="btn o" onclick="skip()">Skip</button><button class="btn" onclick="go(1)">Next</button>':'<button class="btn" onclick="finish()">Submit</button>')+'</div>';
}
function pickA(i){S.ans[S.i]=i;quiz()}
function pause(){S.paused=!S.paused;quiz()}
function skip(){if(!(S.m==='practice'&&S.ans[S.i]!==null))S.ans[S.i]=null;go(1)}
function go(d){S.i=Math.max(0,Math.min(S.qs.length-1,S.i+d));if(S.m==='timed')S.left=60;quiz()}
async function finish(){
 clearInterval(timer);const n=S.qs.length,bd={};let c=0,sk=0;
 S.qs.forEach((q,i)=>{const a=S.ans[i];bd[q.t]=bd[q.t]||{c:0,n:0};bd[q.t].n++;if(a===null)sk++;else if(a===q.a){c++;bd[q.t].c++}});
 const pct=Math.round(c/n*1000)/10,g=pct>=70?'A':pct>=60?'B':pct>=50?'C':pct>=45?'D':'F';
 const r={user_id:user.id,full_name:profile.full_name,email:user.email,app_name:APP_NAME,topics:S.c.t.join(', '),mode:S.m,score:c,total_questions:n,percentage:pct,grade:g,pass_fail:pct>=50?'Pass':'Fail',time_used:S.used};
 S.r=Object.assign({},r,{wrong:n-c-sk,skipped:sk});
 const h=LS.g('mls_hist_'+user.id,[]);h.unshift(Object.assign({},r,{bd:bd,created_at:new Date().toISOString()}));LS.s('mls_hist_'+user.id,h);
 result();
 let ok=false;try{const x=await sb.from('results').insert(r);ok=!x.error}catch(e){}
 const e=$('#sv');if(e)e.textContent=ok?'Result saved online and on this device.':'Saved on this device only (online save failed).';
}
function result(){
 const r=S.r;
 A.innerHTML='<div class="card" style="text-align:center"><h2>Result</h2><div class="ring" style="--p:'+r.percentage+'"><span>'+r.percentage+'%</span></div>'+
 '<h3>'+r.score+' / '+r.total_questions+' &middot; Grade '+r.grade+' &middot; '+r.pass_fail+'</h3><div class="grid"><div>Correct<br><b>'+r.score+'</b></div><div>Wrong<br><b>'+r.wrong+'</b></div><div>Skipped<br><b>'+r.skipped+'</b></div><div>Time<br><b>'+fmt(r.time_used)+'</b></div></div><p class="sub" id="sv">Saving...</p></div>'+
 '<div class="row"><button class="btn" onclick="start(S.c)">Retake</button><button class="btn o" onclick="home()">New Quiz</button><button class="btn o" onclick="home()">Go Home</button></div>'+
 '<div class="card"><h3>Review</h3>'+S.qs.map((q,i)=>{const a=S.ans[i];return '<div class="rv '+(a===q.a?'g':'w')+'"><b>'+(i+1)+'. '+esc(q.q)+'</b><br>Your answer: '+(a===null?'Skipped':esc(q.o[a]))+'<br>Correct: '+esc(q.o[q.a])+'<div class="ex">'+esc(q.e)+'</div></div>'}).join('')+'</div>';
}

/* ---------- SCORES ---------- */
async function scores(){
 clearInterval(timer);const h=LS.g('mls_hist_'+user.id,[]);let list=h;
 try{const r=await sb.from('results').select('*').eq('app_name',APP_NAME).eq('user_id',user.id).order('created_at',{ascending:false});if(r.data&&r.data.length)list=r.data}catch(e){}
 const tp={};h.forEach(x=>x.bd&&Object.keys(x.bd).forEach(t=>{tp[t]=tp[t]||{c:0,n:0};tp[t].c+=x.bd[t].c;tp[t].n+=x.bd[t].n}));
 const n=list.length,avg=n?Math.round(list.reduce((s,x)=>s+Number(x.percentage),0)/n*10)/10:0,best=n?Math.max.apply(null,list.map(x=>Number(x.percentage))):0;
 A.innerHTML='<div class="card"><h2>My Scores</h2><div class="grid"><div>Quizzes<br><b>'+n+'</b></div><div>Average<br><b>'+avg+'%</b></div><div>Best<br><b>'+best+'%</b></div><div>Last<br><b>'+(n?list[0].percentage+'%':'-')+'</b></div></div></div>'+
 '<div class="card"><h3>Topic progress (weak vs strong)</h3>'+(Object.keys(tp).length?Object.keys(tp).map(t=>{const p=Math.round(tp[t].c/tp[t].n*100);return '<div>'+esc(t)+' - '+p+'% '+(p>=70?'(strong)':p<50?'(weak)':'')+'<div class="bar"><i style="width:'+p+'%"></i></div></div>'}).join(''):'<p class="sub">No data yet.</p>')+'</div>'+
 '<div class="card"><h3>History</h3>'+(n?list.map(x=>'<div class="rv"><b>'+x.score+'/'+x.total_questions+' ('+x.percentage+'%) '+x.grade+'</b><br><small>'+new Date(x.created_at).toLocaleString()+' &middot; '+esc(x.mode)+' &middot; '+fmt(x.time_used||0)+'<br>'+esc(x.topics)+'</small></div>').join(''):'<p class="sub">No quizzes yet.</p>')+'</div>'+
 '<div class="row"><button class="btn o" onclick="home()">Back</button><button class="btn bad" onclick="clearHist()">Clear History</button></div>';
}
function clearHist(){if(confirm('Clear history on this device? (Your teacher still keeps the official record.)')){localStorage.removeItem('mls_hist_'+user.id);scores()}}

/* ---------- SETTINGS ---------- */
function settings(){
 A.innerHTML='<div class="card"><h3>Theme</h3><div class="row">'+['light','dark','green','blue','purple','pink','orange','amoled'].map(t=>'<button class="btn s '+(prefs.theme===t?'':'o')+'" onclick="setP(\'theme\',\''+t+'\')">'+t+'</button>').join('')+'</div>'+
 '<h3>Font size</h3><div class="row">'+['small','medium','large'].map(t=>'<button class="btn s '+(prefs.size===t?'':'o')+'" onclick="setP(\'size\',\''+t+'\')">'+t+'</button>').join('')+'</div>'+
 '<div class="row" style="margin-top:14px"><button class="btn o" onclick="home()">Back</button><button class="btn bad" onclick="logout()">Logout</button></div></div>';
}
function setP(k,v){prefs[k]=v;LS.s('mls_prefs',prefs);applyPrefs();settings()}

/* ---------- INIT / PWA ---------- */
let dp=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('#ib').hidden=false});
$('#ib').onclick=async()=>{if(dp){dp.prompt();await dp.userChoice;dp=null;$('#ib').hidden=true}};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
(async function init(){
 applyPrefs();
 sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY')resetView()});
 try{const s=await sb.auth.getSession();s.data.session?enter(s.data.session.user):authView()}catch(e){authView('login','Cannot reach server. Check your internet.')}
})();
