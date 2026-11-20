const A=document.getElementById('app');let rows=[],studs=[];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>Math.floor((s||0)/60)+':'+String((s||0)%60).padStart(2,'0');
(async function(){
 const s=await sb.auth.getSession(),u=s.data.session&&s.data.session.user;
 if(!u||(u.email||'').toLowerCase()!==ADMIN_EMAIL.toLowerCase()){A.innerHTML='<div class="card"><h2>Admin only</h2><p>Login as admin in the main app first.</p><a class="l" href="index.html">Go to app</a></div>';return}
 load();
})();
async function load(){
 const r=await sb.from('results').select('*').eq('app_name',APP_NAME).order('created_at',{ascending:false});
 const p=await sb.from('profiles').select('*').eq('app_name',APP_NAME).order('created_at',{ascending:false});
 if(r.error||p.error){A.innerHTML='<div class="card"><p class="m er">'+esc((r.error||p.error).message)+' (did you run admin.sql?)</p></div>';return}
 rows=r.data||[];studs=p.data||[];draw();
}
function draw(){
 const q=(document.getElementById('q')||{value:''}).value.toLowerCase(),m=(document.getElementById('m')||{value:''}).value;
 const f=rows.filter(x=>(!q||(x.full_name||'').toLowerCase().includes(q)||(x.email||'').toLowerCase().includes(q))&&(!m||x.mode===m));
 A.innerHTML='<div class="grid"><div>Students<br><b>'+studs.length+'</b></div><div>Quizzes taken<br><b>'+rows.length+'</b></div></div>'+
 '<div class="card"><input id="q" placeholder="Search name or email" value="'+esc(q)+'" oninput="draw()"><select id="m" onchange="draw()"><option value="">All modes</option>'+['practice','exam','timed'].map(x=>'<option '+(x===m?'selected':'')+'>'+x+'</option>').join('')+'</select><button class="btn" onclick="csv()">Export CSV</button></div>'+
 '<div class="card"><h3>All scores ('+f.length+')</h3><div class="tw"><table><tr><th>Name</th><th>Email</th><th>Topics</th><th>Mode</th><th>Score</th><th>%</th><th>Grade</th><th>Date</th><th>Time</th><th></th></tr>'+
 f.map(x=>'<tr><td>'+esc(x.full_name)+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.topics)+'</td><td>'+esc(x.mode)+'</td><td>'+x.score+'/'+x.total_questions+'</td><td>'+x.percentage+'</td><td>'+esc(x.grade)+'</td><td>'+new Date(x.created_at).toLocaleString()+'</td><td>'+fmt(x.time_used)+'</td><td><button class="btn s bad" onclick="del(\''+x.id+'\')">Delete</button></td></tr>').join('')+'</table></div></div>'+
 '<div class="card"><h3>Registered students</h3><div class="tw"><table><tr><th>Name</th><th>Email</th><th>Joined</th></tr>'+studs.map(x=>'<tr><td>'+esc(x.full_name)+'</td><td>'+esc(x.email)+'</td><td>'+(x.created_at?new Date(x.created_at).toLocaleDateString():'')+'</td></tr>').join('')+'</table></div></div>';
 const qi=document.getElementById('q');if(qi&&q){qi.focus();qi.setSelectionRange(q.length,q.length)}
}
async function del(id){if(!confirm('Delete this score?'))return;const r=await sb.from('results').delete().eq('id',id).eq('app_name',APP_NAME);if(r.error)alert(r.error.message);load()}
function csv(){
 const h=['full_name','email','topics','mode','score','total_questions','percentage','grade','pass_fail','time_used','created_at'];
 const t=[h.join(',')].concat(rows.map(x=>h.map(k=>'"'+String(x[k]==null?'':x[k]).replace(/"/g,'""')+'"').join(','))).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='mls201_scores.csv';a.click();
}
