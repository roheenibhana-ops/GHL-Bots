/** The control panel page. Plain HTML, CSS and JavaScript so it needs nothing else. All customer text is written with textContent, never as HTML. */
export const DASH_HTML = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dunzo Control</title>
<style>
:root{--bg:#f4f5f7;--panel:#fff;--ink:#14171c;--mute:#6a7280;--line:#e5e8ee;--brand:#0b7a4b;--brand2:#e8f5ee;--warn:#b45309;--warn2:#fef3e2;--bad:#c0262d;--bad2:#fdecee;--blue:#1d5fd1;--blue2:#e8f0fd;--me:#e6efff;--shadow:0 1px 2px rgba(16,24,40,.06),0 4px 14px rgba(16,24,40,.05)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0e1116;--panel:#171b22;--ink:#eef1f6;--mute:#9aa3b2;--line:#262c36;--brand:#34c57f;--brand2:#12281d;--warn:#f0a84a;--warn2:#2c2111;--bad:#ff7076;--bad2:#2e1618;--blue:#6ea2ff;--blue2:#16233b;--me:#1a2a47;--shadow:none}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
.app{display:grid;grid-template-columns:232px 1fr;min-height:100vh}
.side{background:var(--panel);border-right:1px solid var(--line);padding:18px 12px;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:4px}
.logo{display:flex;align-items:center;gap:10px;padding:6px 10px 16px;font-weight:700;font-size:17px;letter-spacing:-.01em}
.logo i{width:30px;height:30px;border-radius:9px;background:var(--brand);display:grid;place-items:center;color:#fff;font-style:normal;font-size:15px}
.nav{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--mute);cursor:pointer;border:0;background:none;text-align:left;font-weight:550;width:100%}
.nav:hover{background:var(--bg);color:var(--ink)}.nav.on{background:var(--brand2);color:var(--brand)}
.nav svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.nav b{margin-left:auto;background:var(--bad);color:#fff;border-radius:99px;font-size:11px;padding:1px 7px}
.spacer{flex:1}
.main{min-width:0;display:flex;flex-direction:column;overflow-x:hidden}
.top{display:flex;align-items:center;gap:12px;padding:14px 26px;border-bottom:1px solid var(--line);background:var(--panel);position:sticky;top:0;z-index:5}
.top h1{margin:0;font-size:19px;letter-spacing:-.01em}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;font-weight:600;font-size:13px}
.pill i{width:8px;height:8px;border-radius:50%;background:currentColor}
.ok{background:var(--brand2);color:var(--brand)}.wr{background:var(--warn2);color:var(--warn)}.bd{background:var(--bad2);color:var(--bad)}.bl{background:var(--blue2);color:var(--blue)}
.btn{border:1px solid var(--line);background:var(--panel);padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:600}
.btn:hover{background:var(--bg)}.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}.btn.pri:hover{filter:brightness(1.08)}
.btn.dng{background:var(--bad);border-color:var(--bad);color:#fff}.btn.sm{padding:5px 10px;font-size:13px;border-radius:8px}
.btn[disabled]{opacity:.5;cursor:default}
.page{padding:24px 26px 60px;max-width:1280px;width:100%;min-width:0}
.grid{display:grid;gap:16px}.grid>*{min-width:0}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.g2{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow)}
.card h3{margin:0 0 12px;font-size:14px;color:var(--mute);font-weight:650;text-transform:uppercase;letter-spacing:.05em}
.kpi .n{font-size:34px;font-weight:750;letter-spacing:-.03em;line-height:1.1}.kpi .l{color:var(--mute);margin-top:4px;font-size:13.5px}
.banner{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:16px;margin-bottom:16px;font-weight:600}
.banner .t{flex:1}.banner small{display:block;font-weight:450;opacity:.85;margin-top:2px}
.row{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--line);cursor:pointer}
.row:last-child{border:0}.row:hover{background:var(--bg)}
.av{width:38px;height:38px;border-radius:50%;background:var(--brand2);color:var(--brand);display:grid;place-items:center;font-weight:700;flex:none}
.grow{flex:1;min-width:0}.nm{font-weight:650}.sub{color:var(--mute);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;background:var(--bg);color:var(--mute)}
.tag.g{background:var(--brand2);color:var(--brand)}.tag.o{background:var(--warn2);color:var(--warn)}.tag.r{background:var(--bad2);color:var(--bad)}.tag.b{background:var(--blue2);color:var(--blue)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--bad);flex:none}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.chip{padding:6px 13px;border-radius:99px;border:1px solid var(--line);background:var(--panel);cursor:pointer;font-weight:600;font-size:13.5px;color:var(--mute)}
.chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.split{display:grid;grid-template-columns:360px 1fr;gap:16px;height:calc(100vh - 170px);min-height:480px}
.split .card{padding:0;overflow:hidden;display:flex;flex-direction:column}
.list{overflow:auto;padding:6px 12px}.thread{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}
.b{max-width:76%;padding:9px 13px;border-radius:16px;white-space:pre-wrap;word-wrap:break-word;line-height:1.4}
.b.in{background:var(--panel);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:5px}
.b.out{background:var(--me);align-self:flex-end;border-bottom-right-radius:5px}
.b.hum{background:var(--brand2);align-self:flex-end;border-bottom-right-radius:5px}
.meta{font-size:11.5px;color:var(--mute);margin:-4px 6px 2px}.meta.r{text-align:right;align-self:flex-end}
.chead{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.facts{display:flex;gap:7px;flex-wrap:wrap;margin-top:6px}
.compose{display:flex;gap:10px;padding:12px;border-top:1px solid var(--line);background:var(--panel)}
.compose textarea{flex:1;resize:none;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg);height:44px}
.empty{color:var(--mute);text-align:center;padding:50px 20px}
.sw{position:relative;width:46px;height:26px;flex:none}.sw input{opacity:0;width:0;height:0}
.sw span{position:absolute;inset:0;background:#c5cbd6;border-radius:99px;cursor:pointer;transition:.15s}
.sw span:before{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:.15s}
.sw input:checked+span{background:var(--brand)}.sw input:checked+span:before{transform:translateX(20px)}
.set{display:flex;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}.set:last-child{border:0}
.set .grow b{display:block}.set .grow span{color:var(--mute);font-size:13.5px}
.set select,.set input[type=number],.set input[type=text]{padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);min-width:120px}
.mate{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--line)}.mate:last-child{border:0}
.mate .av{border-radius:12px}
pre{white-space:pre-wrap;word-wrap:break-word;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px;font-size:12.5px;max-height:420px;overflow:auto}
.bar{height:10px;border-radius:99px;background:var(--bg);overflow:hidden}.bar i{display:block;height:100%;background:var(--brand);border-radius:99px}
.fun{display:grid;grid-template-columns:150px 1fr 54px;gap:12px;align-items:center;padding:8px 0}
.gate{position:fixed;inset:0;background:var(--bg);display:none;place-items:center;z-index:50}.gate.on{display:grid}
.gate .card{width:min(400px,92vw);text-align:center;padding:30px}.gate input{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;margin:14px 0;background:var(--bg)}
.err{color:var(--bad);font-weight:600;margin-top:8px}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:12px;font-weight:600;z-index:60;display:none;box-shadow:var(--shadow)}
.tabs{display:none}
@media(max-width:900px){
 .app{grid-template-columns:1fr}.side{display:none}.page{padding:16px 14px 90px}.top{padding:12px 14px;flex-wrap:wrap}
 .g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g2{grid-template-columns:minmax(0,1fr)}.split{grid-template-columns:1fr;height:auto}
 .split .thread{min-height:320px;max-height:60vh}.fun{grid-template-columns:110px 1fr 44px}
 .tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--line);z-index:9;padding:6px 4px;justify-content:space-around}
 .tabs button{border:0;background:none;color:var(--mute);font-size:10px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;flex:1;min-width:0}
 .tabs button.on{color:var(--brand)}.tabs svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
}
</style></head><body>
<div class="gate" id="gate"><div class="card"><div class="logo" style="justify-content:center"><i>D</i>Dunzo Control</div>
<div style="color:var(--mute)">Enter your admin token to open the control panel.</div>
<input id="tok" type="password" placeholder="Admin token" autocomplete="current-password"><button class="btn pri" id="enter" style="width:100%">Open</button><div class="err" id="gerr"></div></div></div>
<div class="app" id="app" style="display:none">
<aside class="side"><div class="logo"><i>D</i>Dunzo Control</div><div id="nav"></div><div class="spacer"></div>
<button class="nav" id="lock"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Lock</button></aside>
<div class="main"><div class="top"><h1 id="title">Overview</h1><span class="pill ok" id="status"><i></i>Loading</span><span class="spacer"></span>
<button class="btn" id="refresh">Refresh</button><button class="btn dng" id="panic">Pause everything</button></div>
<div class="page" id="page"></div></div></div>
<div class="tabs" id="tabs"></div><div class="toast" id="toast"></div>
<script>
var ICON={overview:'<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 8h6V4h-6z"/>',inbox:'<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5a3 3 0 0 0 6 0h5"/>',approve:'<path d="M5 12l4 4 10-10"/>',results:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',agents:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.6 3 5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',sim:'<path d="M4 5h16v11H9l-5 4z"/>'};
var VIEWS=[['overview','Overview'],['inbox','Inbox'],['approve','Approvals'],['results','Results'],['agents','Agents'],['settings','Settings'],['sim','Simulator']];
var T=sessionStorage.getItem('t')||'',view='overview',S={},timer=null,openId=null,filter='all',pendingCount=0;
function $(i){return document.getElementById(i)}
function el(tag,cls,txt,kids){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;(kids||[]).forEach(function(k){if(k)e.appendChild(k)});return e}
function svg(n){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.innerHTML=ICON[n];return s}
function toast(m){var t=$('toast');t.textContent=m;t.style.display='block';setTimeout(function(){t.style.display='none'},2800)}
function api(path,body){var o={headers:{'Authorization':'Bearer '+T,'Content-Type':'application/json'}};if(body!==undefined){o.method='POST';o.body=JSON.stringify(body)}
 return fetch(path,o).then(function(r){return r.json().then(function(j){if(r.status===401){lock();throw new Error('Wrong token')}if(!r.ok)throw new Error(j.error||('Error '+r.status));return j})})}
function ago(iso){var s=(Date.now()-new Date(iso).getTime())/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function lock(){sessionStorage.removeItem('t');T='';$('app').style.display='none';$('gate').classList.add('on');clearInterval(timer)}
function nav(){var n=$('nav'),tb=$('tabs');n.textContent='';tb.textContent='';VIEWS.forEach(function(v){
 var b=el('button','nav'+(v[0]===view?' on':''),null,[svg(v[0]),el('span',null,v[1])]);if(v[0]==='inbox'&&pendingCount)b.appendChild(el('b',null,String(pendingCount)));b.onclick=function(){go(v[0])};n.appendChild(b);
 var t=el('button',v[0]===view?'on':'',null,[svg(v[0]),el('span',null,v[1]==='Approvals'?'Approve':v[1]==='Simulator'?'Practice':v[1])]);t.onclick=function(){go(v[0])};tb.appendChild(t)})}
function go(v){view=v;openId=null;nav();$('title').textContent=(VIEWS.filter(function(x){return x[0]===v})[0]||[0,'']) [1];render()}
function status(){var s=S.settings||{};var p=$('status'),pa=s.PAUSE_ALL==='true';
 var sending=s.SENDING_ENABLED==='true'&&Number(s.DAILY_CAP)>0;
 var txt,cls;if(pa){txt='Paused';cls='bd'}else if(s.BOT_MODE==='live'){txt=sending?'Live and sending':'Live';cls='ok'}else if(s.BOT_MODE==='test'){txt='Test mode';cls='wr'}else{txt='Bot is off';cls='bl'}
 p.className='pill '+cls;p.textContent='';p.appendChild(el('i'));p.appendChild(document.createTextNode(txt));
 var b=$('panic');b.textContent=pa?'Resume':'Pause everything';b.className='btn '+(pa?'pri':'dng')}
function load(){return api('/admin/dash/overview').then(function(o){S=o;pendingCount=o.conversations.withTeam;status();nav()})}
function render(){var p=$('page');p.textContent='';clearInterval(timer);load().then(function(){({overview:vOverview,inbox:vInbox,approve:vApprove,results:vResults,agents:vAgents,settings:vSettings,sim:vSim})[view](p)}).catch(function(e){p.appendChild(el('div','empty',e.message))})}
function kpi(n,l,tone){return el('div','card kpi',null,[el('div','n',String(n)),el('div','l',l)])}
function who(r){return (r.name||'C').charAt(0).toUpperCase()}
function vOverview(p){
 var s=S.settings,pa=s.PAUSE_ALL==='true',c=S.conversations,q=S.queue;
 var tone=pa?'bd':(s.BOT_MODE==='live'?'ok':'wr');
 var head=pa?'Everything is paused':(s.BOT_MODE==='live'?'The bot is live':s.BOT_MODE==='test'?'The bot is in test mode':'The bot is off');
 var sub=pa?'No replies and no promo texts are going out.':(s.BOT_MODE==='test'?'It only talks to contacts tagged bot-test. Switch to Live in Settings when you are ready.':(s.SENDING_ENABLED==='true'&&Number(s.DAILY_CAP)>0?'Promo texts: up to '+s.DAILY_CAP+' a day, '+s.WINDOW_START+'am to '+(Number(s.WINDOW_END)-12)+'pm.':'Promo texts are not being sent. Turn them on in Settings.'));
 var b=el('div','banner '+tone,null,[el('div','t',head,[el('small',null,sub)])]);p.appendChild(b);
 if(!S.settingsReady){p.appendChild(el('div','banner wr','Dashboard switches need one setup step: run supabase/006_settings.sql in Supabase. Everything else works.'))}
 var g=el('div','grid g4');g.appendChild(kpi(S.today.textsSent,'Texts sent today'));g.appendChild(kpi(S.today.replies,'Customer replies today'));g.appendChild(kpi(c.quotes,'Quotes created'));g.appendChild(kpi(c.approved,'Quotes approved'));p.appendChild(g);
 var two=el('div','grid g2');two.style.marginTop='16px';
 var left=el('div','card',null,[el('h3',null,'Needs you')]);var right=el('div','card',null,[el('h3',null,'Live activity')]);
 two.appendChild(left);two.appendChild(right);p.appendChild(two);
 var qc=el('div','card');qc.style.marginTop='16px';qc.appendChild(el('h3',null,'Promo queue ('+s.BATCH_CAMPAIGN+')'));
 var qg=el('div','grid g4');[['Waiting for approval',q.waiting],['Approved, to send',q.approved],['Sent',q.sent],['Held or failed',q.held+q.failed]].forEach(function(x){qg.appendChild(el('div','kpi',null,[el('div','n',String(x[1])),el('div','l',x[0])]))});qc.appendChild(qg);p.appendChild(qc);
 api('/admin/dash/inbox').then(function(d){var need=d.rows.filter(function(r){return r.status==='handed_off'||r.waiting}).slice(0,6);
  if(!need.length)left.appendChild(el('div','empty','Nothing needs you right now.'));
  need.forEach(function(r){left.appendChild(rowFor(r,true))})});
 function feed(){api('/admin/dash/activity').then(function(d){right.querySelectorAll('.row').forEach(function(x){x.remove()});
  d.rows.slice(0,10).forEach(function(m){var r=el('div','row',null,[el('div','av',m.direction==='inbound'?'C':'B'),el('div','grow',null,[el('div','nm',m.direction==='inbound'?(m.contact_name||'Customer'):'Bot'),el('div','sub',m.body||'')]),el('div','sub',ago(m.created_at))]);right.appendChild(r)})})}
 feed();timer=setInterval(function(){if(view==='overview')feed()},15000)}
function rowFor(r,toInbox){var tone=r.status==='handed_off'?'o':(r.stage==='Approved'?'g':(r.stage==='Quote sent'?'b':''));
 var row=el('div','row',null,[el('div','av',who(r)),el('div','grow',null,[el('div','nm',r.name,[]),el('div','sub',(r.lastFrom==='inbound'?'Customer: ':'Bot: ')+r.last)]),
  el('div',null,null,[el('span','tag '+tone,r.status==='handed_off'?'With the team':r.stage),el('div','sub',ago(r.lastAt))]) ]);
 if(r.waiting)row.insertBefore(el('span','dot'),row.firstChild);
 row.onclick=function(){openId=r.contactId;view='inbox';nav();$('title').textContent='Inbox';render()};return row}
function vInbox(p){
 var wrap=el('div');var chips=el('div','chips');
 [['all','All'],['team','With the team'],['waiting','Customer waiting'],['quote','Quote sent'],['active','Active'],['closed','Closed']].forEach(function(f){var c=el('button','chip'+(filter===f[0]?' on':''),f[1]);c.onclick=function(){filter=f[0];render()};chips.appendChild(c)});
 var split=el('div','split');var list=el('div','card'),lst=el('div','list');list.appendChild(lst);var thread=el('div','card');split.appendChild(list);split.appendChild(thread);wrap.appendChild(chips);wrap.appendChild(split);p.appendChild(wrap);
 thread.appendChild(el('div','empty','Pick a conversation to read it.'));
 api('/admin/dash/inbox').then(function(d){var rows=d.rows.filter(function(r){return filter==='all'||(filter==='team'&&r.status==='handed_off')||(filter==='waiting'&&r.waiting)||(filter==='quote'&&(r.stage==='Quote sent'||r.stage==='Approved'))||(filter==='active'&&r.status==='active')||(filter==='closed'&&r.status==='closed')});
  if(!rows.length)lst.appendChild(el('div','empty','No conversations here yet.'));
  rows.forEach(function(r){var x=rowFor(r);x.onclick=function(){openId=r.contactId;openConv(thread)};lst.appendChild(x)});if(openId)openConv(thread)})}
function openConv(box){box.textContent='';box.appendChild(el('div','empty','Loading...'));
 api('/admin/dash/conversation?contactId='+encodeURIComponent(openId)).then(function(d){box.textContent='';var c=d.contact||{};
  var head=el('div','chead');var info=el('div','grow',null,[el('div','nm',c.name||'Customer'),el('div','sub',(c.phone||'')+(c.email?'  '+c.email:'')),
   el('div','facts',null,[el('span','tag g',d.stage),d.known.homeSize?el('span','tag',d.known.homeSize):null,d.known.address?el('span','tag',d.known.address):null,d.known.quoteNumber?el('span','tag b','Quote #'+d.known.quoteNumber):null,c.dnd?el('span','tag r','Opted out'):null].concat((c.tags||[]).slice(0,8).map(function(t){return el('span','tag',t)})))]);
  head.appendChild(info);var paused=(c.tags||[]).some(function(t){return t==='bot-paused'||t==='bot-needs-human'});
  var a1=el('button','btn sm',paused?'Resume bot':'Pause bot');a1.onclick=function(){api('/admin/dash/contact-action',{contactId:openId,action:paused?'resume':'pause'}).then(function(){toast(paused?'Bot resumed':'Bot paused for this customer');openConv(box)}).catch(function(e){toast(e.message)})};
  var a2=el('button','btn sm','Mark handled');a2.onclick=function(){api('/admin/dash/contact-action',{contactId:openId,action:'handled'}).then(function(){toast('Marked handled');render()}).catch(function(e){toast(e.message)})};
  head.appendChild(a1);head.appendChild(a2);box.appendChild(head);
  var th=el('div','thread');d.messages.forEach(function(m){var out=m.direction==='outbound';var cls='b '+(out?(m.campaign==='human'?'hum':'out'):'in');th.appendChild(el('div',cls,m.body||''));
   th.appendChild(el('div','meta'+(out?' r':''),(out?(m.campaign==='human'?'You':(m.campaign==='bot'?'Bot':'Promo')):'Customer')+' · '+ago(m.created_at)+(m.status==='failed'?' · failed':'')))});
  if(d.background)th.appendChild(el('div','meta','Background the bot has: '+d.background.slice(0,400)));
  box.appendChild(th);setTimeout(function(){th.scrollTop=th.scrollHeight},30);
  var ta=el('textarea');ta.placeholder='Reply as the team (pauses the bot for this customer)';var send=el('button','btn pri','Send');
  send.onclick=function(){var v=ta.value.trim();if(!v)return;send.disabled=true;api('/admin/dash/send',{contactId:openId,message:v}).then(function(){toast('Sent');openConv(box)}).catch(function(e){toast(e.message);send.disabled=false})};
  box.appendChild(el('div','compose',null,[ta,send]))}).catch(function(e){box.textContent='';box.appendChild(el('div','empty',e.message))})}
function vApprove(p){
 var q=S.queue,s=S.settings;
 var g=el('div','grid g4');g.appendChild(kpi(q.waiting,'Waiting for your approval'));g.appendChild(kpi(q.approved,'Approved, going out'));g.appendChild(kpi(q.sent,'Already sent'));g.appendChild(kpi(q.held,'Held back for safety'));p.appendChild(g);
 var c=el('div','card');c.style.marginTop='16px';c.appendChild(el('h3',null,'Approve a batch'));
 c.appendChild(el('div','sub','Read a few of the drafts below, then approve the next batch. Approved texts go out at the daily limit ('+s.DAILY_CAP+' a day), spread across '+s.WINDOW_START+'am to '+(Number(s.WINDOW_END)-12)+'pm. Sending is '+(s.SENDING_ENABLED==='true'?'ON':'OFF')+'.'));
 var n=el('input');n.type='number';n.value='20';n.style.cssText='width:90px;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--bg);margin:14px 10px 0 0';
 var ap=el('button','btn pri','Approve next');ap.style.marginTop='14px';ap.onclick=function(){api('/admin/pilot/approve-batch',{campaign:s.BATCH_CAMPAIGN,count:Number(n.value)}).then(function(r){toast('Approved '+r.approved);render()}).catch(function(e){toast(e.message)})};
 var st=el('button','btn dng','Stop, un-approve everything');st.style.cssText='margin:14px 0 0 10px';st.onclick=function(){if(confirm('Put every approved, unsent text back on hold?'))api('/admin/pilot/unapprove',{campaign:s.BATCH_CAMPAIGN}).then(function(){toast('All put back on hold');render()}).catch(function(e){toast(e.message)})};
 c.appendChild(n);c.appendChild(ap);c.appendChild(st);p.appendChild(c);
 var l=el('div','card');l.style.marginTop='16px';l.appendChild(el('h3',null,'Drafts waiting (oldest first)'));p.appendChild(l);
 api('/admin/pending?campaign='+encodeURIComponent(s.BATCH_CAMPAIGN)).then(function(d){if(!d.messages.length)l.appendChild(el('div','empty','No drafts waiting.'));
  d.messages.slice(0,40).forEach(function(m){var rj=el('button','btn sm','Skip this one');rj.onclick=function(){api('/admin/reject',{id:m.id}).then(function(){toast('Skipped');render()}).catch(function(e){toast(e.message)})};
   l.appendChild(el('div','row',null,[el('div','av',(m.contact_name||'C').charAt(0).toUpperCase()),el('div','grow',null,[el('div','nm',m.contact_name||'Customer'),el('div','sub',m.body)]),rj]))})}).catch(function(e){l.appendChild(el('div','empty',e.message))})}
function vResults(p){var c=el('div','card');c.appendChild(el('h3',null,'Loading results'));p.appendChild(c);
 api('/admin/stats?campaign='+encodeURIComponent((S.settings||{}).BATCH_CAMPAIGN||'pilot-2')).then(function(d){c.textContent='';c.appendChild(el('h3',null,'Campaign '+d.campaign));
  var f=d.funnel,t=d.texts,r=d.replies;var base=Math.max(1,t.sent||1);
  var rows=[['Promo texts sent',t.sent||0],['Replied',r.replied||0],['Chose home size',f.chosenHomeSize],['Confirmed address',f.confirmedAddress],['Gave email',f.gaveEmail],['Quote created',f.quotesCreated],['Quote approved',f.quotesApproved]];
  rows.forEach(function(x){var pct=Math.min(100,Math.round(x[1]/base*100));var bar=el('div','bar',null,[(function(){var i=el('i');i.style.width=pct+'%';return i})()]);c.appendChild(el('div','fun',null,[el('div',null,x[0]),bar,el('b',null,String(x[1]))]))});
  c.appendChild(el('div','sub','Reply rate '+r.replyRate+' · Approval rate of repliers '+f.approvalRateOfReplies+' · With the team '+d.outcomes.handedToTeam+' · STOP requests '+d.outcomes.stopRequests));
  var jq=d.jobberQuoteStatuses||{};c.appendChild(el('div','sub','Jobber quote statuses: '+(Object.keys(jq).length?Object.keys(jq).map(function(k){return k+' '+jq[k]}).join(', '):'none yet')))}).catch(function(e){c.textContent='';c.appendChild(el('div','empty',e.message))})}
function vAgents(p){var c=el('div','card');c.appendChild(el('h3',null,'Your sales team'));p.appendChild(c);
 api('/admin/dash/agents').then(function(d){d.mates.forEach(function(m){c.appendChild(el('div','mate',null,[el('div','av',m.name.charAt(0)),el('div','grow',null,[el('div','nm',m.name),el('div','sub',m.does)]),el('span','tag '+(m.state==='live'?'g':'o'),m.state==='live'?'Live':'Planned')]))});
  [['What the bot is told (instructions)',d.prompt],['What the bot knows (business knowledge)',d.knowledge]].forEach(function(x){var card=el('div','card');card.style.marginTop='16px';var btn=el('button','btn sm','Show');var pre=el('pre',null,x[1]);pre.style.display='none';
   btn.onclick=function(){var on=pre.style.display==='none';pre.style.display=on?'block':'none';btn.textContent=on?'Hide':'Show'};card.appendChild(el('h3',null,x[0],[]));card.appendChild(btn);card.appendChild(pre);p.appendChild(card)})}).catch(function(e){c.appendChild(el('div','empty',e.message))})}
function vSettings(p){api('/admin/dash/settings').then(function(d){
 if(!d.ready)p.appendChild(el('div','banner wr','These switches need one setup step: run supabase/006_settings.sql in the Supabase SQL editor, then reload.'));
 var groups={};d.defs.forEach(function(x){(groups[x.group]=groups[x.group]||[]).push(x)});
 Object.keys(groups).forEach(function(gname){var c=el('div','card');c.style.marginBottom='16px';c.appendChild(el('h3',null,gname));
  groups[gname].forEach(function(x){var val=d.values[x.key],ctl;
   function save(v){api('/admin/dash/settings',{key:x.key,value:String(v)}).then(function(){toast('Saved');load()}).catch(function(e){toast(e.message)})}
   if(x.type==='toggle'){var lab=el('label','sw');var i=el('input');i.type='checkbox';i.checked=val==='true';i.onchange=function(){save(i.checked)};lab.appendChild(i);lab.appendChild(el('span'));ctl=lab}
   else if(x.type==='select'){ctl=el('select');x.options.forEach(function(o){var op=el('option',null,o);op.value=o;if(o===val)op.selected=true;ctl.appendChild(op)});ctl.onchange=function(){save(ctl.value)}}
   else{ctl=el('input');ctl.type=x.type==='number'?'number':'text';ctl.value=val;ctl.onchange=function(){save(ctl.value)}}
   c.appendChild(el('div','set',null,[el('div','grow',null,[el('b',null,x.label),el('span',null,x.help)]),ctl]))});p.appendChild(c)})})}
function vSim(p){var c=el('div','card');c.appendChild(el('h3',null,'Practice chat. Nothing is sent to anyone.'));
 var th=el('div','thread');th.style.cssText='height:50vh;border-radius:12px;margin-bottom:12px';var facts={firstName:'Sam',address:{street1:'2752 Argolis Way',city:'Sacramento',province:'CA',postalCode:'95826'},opening:"Hi Sam, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single story home or $319 for two stories. Reply 1 or 2 and we'll text you a quote to approve and pay online. Reply STOP to opt out."};var hist=[];
 th.appendChild(el('div','b out',facts.opening));
 var ta=el('textarea');ta.placeholder='Type as the customer and press Enter';ta.style.cssText='flex:1;resize:none;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg);height:44px';
 var reset=el('button','btn','Start over');reset.onclick=function(){hist=[];facts.stories=undefined;facts.addressConfirmed=undefined;facts.email=undefined;facts.quoteRequested=undefined;th.textContent='';th.appendChild(el('div','b out',facts.opening))};
 function go(){var v=ta.value.trim();if(!v)return;ta.value='';th.appendChild(el('div','b in',v));hist.push({role:'user',content:v});var w=el('div','meta','Thinking...');th.appendChild(w);th.scrollTop=th.scrollHeight;
  api('/admin/sim',{facts:facts,history:hist}).then(function(d){w.remove();hist.push({role:'assistant',content:d.output.reply});facts=d.facts;th.appendChild(el('div','b out',d.output.reply));th.appendChild(el('div','meta r','intent: '+d.output.intent));th.scrollTop=th.scrollHeight}).catch(function(e){w.textContent=e.message})}
 ta.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}};
 c.appendChild(th);c.appendChild(el('div','compose',null,[ta,reset]));p.appendChild(c)}
$('panic').onclick=function(){var pa=(S.settings||{}).PAUSE_ALL==='true';if(!pa&&!confirm('Pause everything? The bot stops replying and no promo texts go out.'))return;
 api('/admin/dash/settings',{key:'PAUSE_ALL',value:String(!pa)}).then(function(){toast(pa?'Resumed':'Everything paused');render()}).catch(function(e){toast(e.message)})};
$('refresh').onclick=function(){render()};$('lock').onclick=lock;
function start(){$('gate').classList.remove('on');$('app').style.display='grid';go(view)}
$('enter').onclick=function(){var v=$('tok').value.trim();if(!v)return;T=v;$('gerr').textContent='';api('/admin/dash/overview').then(function(){sessionStorage.setItem('t',T);start()}).catch(function(e){$('gerr').textContent=e.message==='Wrong token'?'That token is not right.':e.message;lock()})};
$('tok').onkeydown=function(e){if(e.key==='Enter')$('enter').onclick()};
if(T){api('/admin/dash/overview').then(start).catch(function(){lock()})}else{lock()}
</script></body></html>`;
