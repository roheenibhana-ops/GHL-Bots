/** Approval page. Static HTML, no secrets in it: the admin token is typed in and kept in sessionStorage only. */
export const APP_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lead bot: approvals</title>
<style>
body{font:15px system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
.card{border:1px solid #ddd;border-radius:10px;padding:12px 14px;margin:10px 0}
.meta{font-size:12px;color:#666;margin-bottom:6px}
.msg{white-space:pre-wrap;margin:6px 0 10px}
button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid #999;background:#fff;cursor:pointer;margin-right:8px}
button.go{background:#1a7f37;color:#fff;border-color:#1a7f37}
#status{margin:8px 0;color:#b00}
</style></head><body>
<h2>Pending messages</h2>
<p><label>Admin token <input id="tok" type="password" size="30"></label> <button id="load">Load</button></p>
<p>Campaign <input id="camp" value="pilot-1"></p>
<div id="status"></div><div id="list"></div>
<script>
var tok=document.getElementById('tok'),list=document.getElementById('list'),st=document.getElementById('status');
try{tok.value=sessionStorage.getItem('t')||''}catch(e){}
function api(path,opts){opts=opts||{};opts.headers={'Authorization':'Bearer '+tok.value,'Content-Type':'application/json'};
 return fetch(path,opts).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j})})}
function card(m){var d=document.createElement('div');d.className='card';
 var meta=document.createElement('div');meta.className='meta';
 meta.textContent=(m.contact_name||'Unknown')+' · '+m.account+' · '+(m.segment||'')+' · '+(m.phone_e164||'');
 var body=document.createElement('div');body.className='msg';body.textContent=m.body;
 var ok=document.createElement('button');ok.className='go';ok.textContent='Approve and send';
 var no=document.createElement('button');no.textContent='Skip';
 function act(path){ok.disabled=no.disabled=true;api(path,{method:'POST',body:JSON.stringify({id:m.id})}).then(function(){d.remove()}).catch(function(e){st.textContent=e.message;ok.disabled=no.disabled=false})}
 ok.onclick=function(){act('/admin/approve')};no.onclick=function(){act('/admin/reject')};
 d.append(meta,body,ok,no);return d}
document.getElementById('load').onclick=function(){
 try{sessionStorage.setItem('t',tok.value)}catch(e){}
 st.textContent='';list.textContent='';
 api('/admin/pending?campaign='+encodeURIComponent(document.getElementById('camp').value)).then(function(r){
  if(!r.messages.length){list.textContent='Nothing pending.';return}
  r.messages.forEach(function(m){list.appendChild(card(m))})}).catch(function(e){st.textContent=e.message})}
</script></body></html>`;
