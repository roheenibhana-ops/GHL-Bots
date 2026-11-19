/** Simulator page: chat as the customer and read the bot's replies. Sends no texts and creates nothing in Jobber. */
export const SIM_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lead bot: simulator</title>
<style>
body{font:15px system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
fieldset{border:1px solid #ddd;border-radius:10px;margin:10px 0}
label{display:block;margin:6px 0;font-size:13px;color:#555} input,textarea{font:inherit;padding:6px 8px;width:100%;box-sizing:border-box}
.bubble{max-width:80%;padding:8px 12px;border-radius:14px;margin:6px 0;white-space:pre-wrap}
.me{background:#dbeafe;margin-left:auto} .bot{background:#f1f1f1}
.meta{font-size:11px;color:#777;margin:-2px 0 6px} .row{display:flex;gap:8px} button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid #999;background:#fff;cursor:pointer}
button.go{background:#1a7f37;color:#fff;border-color:#1a7f37} #err{color:#b00;margin:6px 0} #facts{font-size:12px;color:#444}
</style></head><body>
<h2>Bot simulator</h2>
<p style="color:#666">Nothing here sends a text or touches Jobber. You are playing the customer.</p>
<fieldset><legend>Customer</legend>
<label>Admin token <input id="tok" type="password"></label>
<div class="row"><label style="flex:1">First name <input id="fn" value="Sam"></label><label style="flex:2">Address on file (street, city, zip, or blank) <input id="addr" value="2752 Argolis Way, Sacramento, 95826"></label></div>
<label>First message we sent them <textarea id="open" rows="2">Hi Sam, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single-story home or $319 for two stories. Reply 1 or 2 and we'll text you a quote to approve and pay online. Reply STOP to opt out.</textarea></label>
<button id="reset">Start over</button></fieldset>
<div id="chat"></div><div id="err"></div>
<div class="row"><input id="msg" placeholder="Type as the customer, press Enter"><button class="go" id="send">Send</button></div>
<p id="facts"></p>
<script>
var tok=document.getElementById('tok'),chat=document.getElementById('chat'),err=document.getElementById('err'),facts={},history=[];
try{tok.value=sessionStorage.getItem('t')||''}catch(e){}
function parseAddr(s){var p=s.split(',').map(function(x){return x.trim()}).filter(Boolean);if(p.length<3)return undefined;var z=(p[p.length-1].match(/\\d{5}/)||[''])[0];return {street1:p[0],city:p[1],province:'CA',postalCode:z}}
function bubble(t,c,meta){var d=document.createElement('div');d.className='bubble '+c;d.textContent=t;chat.appendChild(d);if(meta){var m=document.createElement('div');m.className='meta';m.textContent=meta;chat.appendChild(m)}}
function show(){document.getElementById('facts').textContent='Known: '+JSON.stringify(facts)}
function start(){chat.textContent='';history=[];err.textContent='';facts={firstName:document.getElementById('fn').value,address:parseAddr(document.getElementById('addr').value),opening:document.getElementById('open').value};bubble(facts.opening,'bot','what we texted them');show()}
document.getElementById('reset').onclick=start;
function send(){var box=document.getElementById('msg'),t=box.value.trim();if(!t)return;box.value='';try{sessionStorage.setItem('t',tok.value)}catch(e){}
 bubble(t,'me');history.push({role:'user',content:t});err.textContent='';
 fetch('/admin/sim',{method:'POST',headers:{'Authorization':'Bearer '+tok.value,'Content-Type':'application/json'},body:JSON.stringify({facts:facts,history:history})})
 .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j})})
 .then(function(j){if(j.debug){err.textContent='Could not read the model output. First: '+(j.debug.rawFirst||'')}history.push({role:'assistant',content:j.output.reply});facts=j.facts;bubble(j.output.reply,'bot','intent: '+j.output.intent+(Object.keys(j.output.data).length?' '+JSON.stringify(j.output.data):''));show()})
 .catch(function(e){err.textContent=e.message})}
document.getElementById('send').onclick=send;document.getElementById('msg').onkeydown=function(e){if(e.key==='Enter')send()};
start();
</script></body></html>`;
