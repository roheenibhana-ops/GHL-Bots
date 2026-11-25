/** The control panel page. Plain HTML, CSS and JavaScript so it needs nothing else. All customer text is written with textContent, never as HTML. */
export const DASH_HTML = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Partridge Standard</title>
<style>
:root{--bg:#f4f5f7;--panel:#fff;--ink:#14171c;--mute:#6a7280;--line:#e5e8ee;--brand:#0b7a4b;--brand2:#e8f5ee;--warn:#b45309;--warn2:#fef3e2;--bad:#c0262d;--bad2:#fdecee;--blue:#1d5fd1;--blue2:#e8f0fd;--me:#e6efff;--vio:#6d3fd6;--vio2:#f0eafd;--shadow:0 1px 2px rgba(16,24,40,.06),0 4px 14px rgba(16,24,40,.05)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0e1116;--panel:#171b22;--ink:#eef1f6;--mute:#9aa3b2;--line:#262c36;--brand:#34c57f;--brand2:#12281d;--warn:#f0a84a;--warn2:#2c2111;--bad:#ff7076;--bad2:#2e1618;--blue:#6ea2ff;--blue2:#16233b;--me:#1a2a47;--vio:#b79cff;--vio2:#221a3a;--shadow:none}}
:root[data-theme=dark]{--bg:#0e1116;--panel:#171b22;--ink:#eef1f6;--mute:#9aa3b2;--line:#262c36;--brand:#34c57f;--brand2:#12281d;--warn:#f0a84a;--warn2:#2c2111;--bad:#ff7076;--bad2:#2e1618;--blue:#6ea2ff;--blue2:#16233b;--me:#1a2a47;--vio:#b79cff;--vio2:#221a3a;--shadow:none}
.wfm{position:fixed;inset:0;z-index:80;background:rgba(10,14,20,.55);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;backdrop-filter:blur(3px)}
.wfb{background:var(--panel);border-radius:20px;width:100%;max-width:640px;box-shadow:0 20px 60px rgba(0,0,0,.35);border:1px solid var(--line)}
.wfh{display:flex;gap:14px;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel);border-radius:20px 20px 0 0;z-index:2}
.wfh .nm{font-weight:700;font-size:18px}.wfh .x{margin-left:auto;border:0;background:var(--bg);width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;color:var(--ink)}
.wfk{display:flex;gap:14px;flex-wrap:wrap;padding:12px 20px 0;font-size:12.5px;color:var(--mute)}.wfk span:before{content:'';display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:var(--c);vertical-align:-1px}
.wff{padding:18px 20px 24px}
.wfn{position:relative;border-radius:14px;padding:12px 14px;border:1.5px solid var(--c);background:var(--b);margin-bottom:26px}
.wfn:after{content:'';position:absolute;left:28px;bottom:-21px;width:2px;height:15px;background:var(--line)}
.wfn:before{content:'';position:absolute;left:23.5px;bottom:-26px;border:5.5px solid transparent;border-top:7px solid var(--mute);border-bottom:0}
.wfn:last-child{margin-bottom:0}.wfn:last-child:after,.wfn:last-child:before{display:none}
.wfn.start{--c:var(--brand);--b:var(--brand2)}.wfn.step{--c:var(--line);--b:var(--panel)}.wfn.check{--c:var(--warn);--b:var(--warn2)}.wfn.hand{--c:var(--blue);--b:var(--blue2);cursor:pointer}.wfn.end{--c:var(--vio);--b:var(--vio2)}
.wfn .k{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c);margin-bottom:3px}.wfn.step .k{color:var(--mute)}
.wfn .t{font-weight:650;font-size:15px;line-height:1.3}.wfn .d{color:var(--mute);font-size:13.5px;margin-top:3px;line-height:1.4}
.wfn .sy{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.wfn .sy i{font-style:normal;font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:99px;background:var(--bg);border:1px solid var(--line);color:var(--ink)}
.wfbr{margin-top:9px;display:grid;gap:6px}.wfbr div{display:flex;gap:8px;align-items:flex-start;font-size:13px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:7px 10px}
.wfbr b{color:var(--warn);white-space:nowrap}.wfbr em{font-style:normal;color:var(--mute)}.wfbr span{flex:1}
.wfgo{color:var(--brand);font-weight:700;font-size:12px;margin:-18px 0 8px 44px;position:relative}
.plan-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.plan-h h3{margin:0}.plan-h .sub{color:var(--mute);font-size:13px;margin-top:4px}
.plan-big{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}.plan-big small{font-size:13px;font-weight:500;color:var(--mute);margin-left:6px}
.pbar{display:flex;height:12px;border-radius:99px;overflow:hidden;background:var(--line);gap:2px}
.pbar i{display:block;height:100%;transition:width .6s}.pbar .s{background:var(--brand)}.pbar .a{background:var(--vio)}.pbar .w{background:var(--blue)}.pbar .h{background:var(--warn)}
.pleg{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0 16px;font-size:13px;color:var(--mute)}.pleg b{color:var(--ink);font-variant-numeric:tabular-nums}
.pleg span:before{content:'';display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;background:var(--c)}
.pdays{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.pday{border-radius:14px;padding:12px;border:1px solid transparent;background:var(--b);color:var(--c);position:relative;min-width:0}
.pday.done{--c:var(--brand);--b:var(--brand2)}.pday.today{--c:var(--blue);--b:var(--blue2);border-color:var(--blue)}.pday.next{--c:var(--vio);--b:var(--vio2)}.pday.off{--c:var(--warn);--b:var(--warn2)}
.pday .d{font-size:12px;font-weight:600;display:flex;justify-content:space-between;gap:6px;white-space:nowrap}
.pday .d em{font-style:normal;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
.pday .n{font-size:24px;font-weight:700;margin:6px 0 2px;color:var(--ink);font-variant-numeric:tabular-nums}.pday .n small{font-size:13px;font-weight:500;color:var(--mute)}
.pday .m{height:6px;border-radius:99px;background:color-mix(in srgb,var(--c) 22%,transparent);overflow:hidden}.pday .m i{display:block;height:100%;background:var(--c);border-radius:99px;transition:width .6s}
.pday.today .d em:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--blue);margin-right:5px;animation:pp 1.6s infinite}
@keyframes pp{0%,100%{opacity:1}50%{opacity:.25}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
.app{display:grid;grid-template-columns:232px 1fr;min-height:100vh}
.side{background:var(--panel);border-right:1px solid var(--line);padding:18px 12px;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:4px}
.logo{display:flex;align-items:center;gap:10px;padding:6px 10px 16px;font-weight:750;font-size:15.5px;line-height:1.15;letter-spacing:-.01em;color:var(--ink)}
.logo i{width:34px;height:34px;border-radius:10px;background:var(--brand);display:grid;place-items:center;color:#fff;font-style:normal;font-size:17px;font-weight:800;flex:none}
.nav{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--mute);cursor:pointer;border:0;background:none;text-align:left;font-weight:550;width:100%}
.nav:hover{background:var(--bg);color:var(--ink)}.nav.on{background:var(--brand2);color:var(--brand)}
.nav svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.nav b{margin-left:auto;background:var(--bad);color:#fff;border-radius:99px;font-size:11px;padding:1px 7px}
.spacer{flex:1}
.navh{font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.07em;color:var(--mute);opacity:.75;padding:14px 12px 4px}.navh:first-child{padding-top:2px}
.main{min-width:0;display:flex;flex-direction:column;overflow-x:hidden}
.top{display:flex;align-items:center;gap:12px;padding:14px 26px;border-bottom:1px solid var(--line);background:var(--panel);position:sticky;top:0;z-index:5}
.top h1{margin:0;font-size:19px;letter-spacing:-.01em}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;font-weight:600;font-size:13px}
.pill i{width:8px;height:8px;border-radius:50%;background:currentColor}
.ok{background:var(--brand2);color:var(--brand)}.wr{background:var(--warn2);color:var(--warn)}.bd{background:var(--bad2);color:var(--bad)}.bl{background:var(--blue2);color:var(--blue)}
.btn{border:1px solid var(--line);background:var(--panel);padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:600}
.btn:hover{background:var(--bg)}.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}.btn.pri:hover{filter:brightness(1.08)}
.btn.dng{background:var(--bad);border-color:var(--bad);color:#fff}
:root[data-theme=dark] .btn.dng,:root:not([data-theme=light]) .btn.dng{color:#1a0a0b}
.theme{width:40px;padding:8px 0;text-align:center}
.sb-top{display:none;text-decoration:none;color:var(--ink)}
a.nav{text-decoration:none}
.seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:6px 14px;border-radius:9px;font-weight:650;color:var(--mute);cursor:pointer;font-size:13.5px}
.seg button.on{background:var(--panel);color:var(--ink);box-shadow:var(--shadow)}
.org{display:grid;gap:16px}.units{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.top-card{text-align:center;border:2px solid var(--brand)}.top-card .av{margin:0 auto 8px;width:46px;height:46px}
.stem{width:2px;height:22px;background:var(--line);margin:-6px auto 0}
.team{font-size:12px;font-weight:700;color:var(--mute);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 2px}
.dim{opacity:1}
.mcard.tool{cursor:default}.mcard.tool:hover{transform:none}.tname{font-weight:700;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px;margin-right:8px}.tname:hover{color:var(--brand)}.mcard.tool .sub2{white-space:normal;margin-top:5px;line-height:1.4}.tnote{margin-top:7px;font-size:12.5px;color:var(--mute);border-left:3px solid var(--line);padding-left:9px;line-height:1.4}
.oc{display:flex;flex-direction:column;align-items:center;margin-top:12px;padding:26px 18px;overflow-x:auto}
.onode{display:flex;gap:10px;align-items:center;padding:7px 11px 7px 7px;border:1px solid var(--line);border-radius:14px;background:var(--panel);cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s;min-width:0}
.onode:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--brand)}.onode:hover .avl{transform:rotate(-4deg) scale(1.08)}
.otag{display:inline-block;font-size:10.5px;padding:1px 8px;white-space:nowrap;margin-top:4px}
.onode.big .otag{font-size:12px}.oc-key .otag{margin-top:0}
.onode .nm{font-size:14px;line-height:1.2}.onode .sub2{font-size:12px;line-height:1.25}.onode .sdot{flex:none}
.onode.big{padding:12px 18px 12px 12px;border:2px solid var(--brand);box-shadow:var(--shadow)}.onode.big .nm{font-size:17px}.onode.big .sub2{font-size:13.5px}
.oc-branch{display:grid;grid-template-columns:1fr 1fr;gap:18px;width:100%;position:relative;padding-top:24px;margin-top:24px}
.oc-branch:before{content:"";position:absolute;top:0;left:25%;right:25%;height:2px;background:var(--line)}
.oc-branch:after{content:"";position:absolute;top:-24px;left:50%;width:2px;height:24px;background:var(--line);margin-left:-1px}
.oc-branch.one{grid-template-columns:1fr}.oc-branch.one:before{display:none}
.oc-col{display:flex;flex-direction:column;align-items:center;position:relative;min-width:0}
.oc-col:before{content:"";position:absolute;top:-24px;left:50%;width:2px;height:24px;background:var(--line);margin-left:-1px}
.oc-branch.one>.oc-col:before{display:none}
.oc-co{text-align:center;padding:10px 20px;border-radius:14px;background:var(--brand2);border:1px solid var(--brand);color:var(--brand)}.oc-co .sub2{color:inherit;opacity:.8}
.oc-pill{font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--mute);background:var(--bg);border:1px solid var(--line);padding:5px 12px;border-radius:99px}
.oc-list{align-self:stretch;margin:10px 0 0 18px;border-left:2px solid var(--line);display:flex;flex-direction:column;gap:8px;padding:8px 0 2px}
.oc-item{position:relative;margin-left:16px}.oc-item:before{content:"";position:absolute;left:-16px;top:50%;width:16px;height:2px;background:var(--line)}
.oc-shared{width:100%;margin-top:26px;padding-top:20px;border-top:2px dashed var(--line);display:flex;flex-direction:column;align-items:center;gap:12px}
.oc-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;width:100%}
.oc-key{display:flex;gap:18px;flex-wrap:wrap;margin-top:18px}
@media(max-width:1100px){.oc-branch.wide{grid-template-columns:1fr}.oc-branch.wide:before{display:none}.oc-branch.wide>.oc-col{margin-top:24px}}
@media(max-width:600px){.oc-branch{grid-template-columns:1fr}.oc-branch:before{display:none}}

.mono{width:42px;height:42px;border-radius:12px;color:#fff;display:grid;place-items:center;font-weight:800;font-size:17px;flex:none;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.15)}
.sst{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:650;color:var(--mute);white-space:nowrap;margin-top:7px}
.sysgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-top:14px;align-items:start}
.mcard.sys{padding:16px;gap:14px;align-items:flex-start}.mcard.sys .mono{width:46px;height:46px}.sdot{width:9px;height:9px;border-radius:50%;background:var(--mute)}
.sdot.ok{background:var(--brand);box-shadow:0 0 0 3px var(--brand2)}.sdot.bad{background:var(--bad);box-shadow:0 0 0 3px var(--bad2)}.sdot.run{background:var(--blue)}.sdot.plan{background:var(--warn)}
.sdet{padding:10px 12px;margin-top:6px;background:var(--bg);border-radius:12px;font-size:13.5px;line-height:1.45}.mcard.sys .sub2{white-space:normal}
.journey{display:flex;align-items:flex-start;gap:0;margin-top:18px;overflow-x:auto;padding-bottom:4px}
.jstep{text-align:center;min-width:132px;flex:1}.jdot{width:34px;height:34px;border-radius:50%;color:#fff;display:grid;place-items:center;font-weight:750;margin:0 auto 6px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.jt{font-weight:700}.jline{height:2px;background:var(--line);width:34px;margin-top:17px;flex:none}
.lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:14px;margin-top:14px;align-items:start}
.lane{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
.lhead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 4px}.lb{padding:0 14px 8px;font-size:12.5px}
.rcard{padding:11px 14px;border-top:1px solid var(--line);cursor:pointer;transition:background .1s}.rcard:hover{background:var(--bg)}
.rtop{display:flex;gap:10px;align-items:center}.remo{font-size:22px}.rdet{margin-top:8px;color:var(--mute);font-size:13.5px;line-height:1.45}
@media(max-width:900px){.jstep{min-width:110px}}

.top-card .avl{margin:0 auto 8px}
.avl{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;font-size:24px;flex:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.22));transition:transform .18s}.avl svg{display:block}
.mcard:hover .avl,.top-card:hover .avl{transform:translateY(-3px) rotate(-4deg) scale(1.08)}
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:6px}
.mcard{display:flex;gap:11px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:var(--panel);cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s}
.mcard:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--brand)}.mcard.live{background:var(--panel)}
.sub2{color:var(--mute);font-size:13px}.hov{transition:box-shadow .12s}.hov:hover{box-shadow:0 8px 26px rgba(0,0,0,.1)}
.prof{display:flex;gap:16px;align-items:flex-start}.prof .acts{display:flex;gap:8px;flex:none}.studio-head .prof{align-items:center}
.studio{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:16px;align-items:start}
.chatcard{display:flex;flex-direction:column;height:calc(100vh - 300px);min-height:520px}
.bchat{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px 10px}
.bb{max-width:94%;padding:9px 13px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}.bb.bot{background:var(--bg);border:1px solid var(--line);align-self:flex-start}.bb.me{background:var(--brand);color:#fff;align-self:flex-end}
.chatcard .chips{margin:8px 0}.chatcard .compose{border:0;padding:8px 0 0;background:none}.chatcard .compose textarea{height:62px}
.rightcard{min-height:520px}.tabs2{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin:-4px 0 14px;padding-bottom:10px}
.tabs2 button{border:0;background:none;padding:7px 12px;border-radius:9px;color:var(--mute);font-weight:650;cursor:pointer}.tabs2 button.on{background:var(--brand2);color:var(--brand)}
textarea.big{width:100%;min-height:380px;margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--bg);line-height:1.5;font-size:13.5px}
.btnrow{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.seg2{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:3px;gap:2px}.seg2 button{border:0;background:none;padding:6px 13px;border-radius:8px;font-weight:650;color:var(--mute);cursor:pointer;text-transform:capitalize}.seg2 button.on{background:var(--brand);color:#fff}
.diff{margin-top:10px;border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:12.5px}.dl{padding:6px 10px;white-space:pre-wrap;word-wrap:break-word}.dl.add{background:var(--brand2);color:var(--brand)}.dl.del{background:var(--bad2);color:var(--bad)}.dl.same{color:var(--mute);background:var(--bg)}
.row2{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.row2:last-child{border:0}
.pk{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}.pk .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.pk .col{background:var(--bg);border-radius:10px;padding:10px}.pk .nm .tag{margin-left:8px}.pk .nm{white-space:normal}.pk .sub{white-space:normal}
.lock{width:30px;text-align:center}
@media(max-width:900px){.studio{grid-template-columns:minmax(0,1fr)}.chatcard{height:auto;min-height:380px}.bchat{max-height:300px}.prof{flex-wrap:wrap}.pk .two{grid-template-columns:1fr}}
.btn.sm{padding:5px 10px;font-size:13px;border-radius:8px}
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
.mate .sub{white-space:normal;overflow:visible}
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
 .g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g2{grid-template-columns:minmax(0,1fr)}.split{grid-template-columns:1fr;height:auto}.units{grid-template-columns:minmax(0,1fr)}
 .split .thread{min-height:320px;max-height:60vh}.fun{grid-template-columns:110px 1fr 44px}
 .sb-top{display:inline-block}
 .tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--line);z-index:9;padding:6px 4px;justify-content:space-around}
 .tabs button{border:0;background:none;color:var(--mute);font-size:10px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;flex:1;min-width:0}
 .tabs button.on{color:var(--brand)}.tabs svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
}
</style></head><body>
<div class="gate" id="gate"><div class="card"><div class="logo" style="justify-content:center"><i>P</i>The Partridge Standard</div>
<div style="color:var(--mute)">Enter your admin token to open the control panel.</div>
<input id="tok" type="password" placeholder="Admin token" autocomplete="current-password"><button class="btn pri" id="enter" style="width:100%">Open</button><div class="err" id="gerr"></div></div></div>
<div class="app" id="app" style="display:none">
<aside class="side"><div class="logo"><i>P</i>The Partridge Standard</div><div id="nav"></div><div class="spacer"></div>
<button class="nav" id="lock"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Lock</button></aside>
<div class="main"><div class="top"><h1 id="title">Overview</h1><div class="seg" id="seg"></div><span class="pill ok" id="status"><i></i>Loading</span><span class="spacer"></span>
<a class="btn sb-top" href="https://santas-lights-scoreboard.roheeni-bhana.workers.dev/" target="_blank" rel="noopener">Scoreboard</a><button class="btn theme" id="theme" title="Switch light or dark"></button><button class="btn" id="refresh">Refresh</button><button class="btn dng" id="panic">Pause everything</button></div>
<div class="page" id="page"></div></div></div>
<div class="tabs" id="tabs"></div><div class="toast" id="toast"></div>
<script>
var ICON={overview:'<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 8h6V4h-6z"/>',inbox:'<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5a3 3 0 0 0 6 0h5"/>',approve:'<path d="M5 12l4 4 10-10"/>',results:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',roadmap:'<path d="M5 19c4-1 3-6 7-7s3-6 7-7"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',director:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',agents:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.6 3 5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',sim:'<path d="M4 5h16v11H9l-5 4z"/>'};
var VIEWS=[['overview','Overview','Every day'],['inbox','Inbox','Every day'],['approve','Approvals','Every day'],['results','Results','How it is going'],['director','Director','How it is going'],['agents','Agents','The team'],['sim','Practice chat','The team'],['roadmap','Roadmap','Plan and setup'],['settings','Settings','Plan and setup']];
var ACC='all';try{ACC=localStorage.getItem('acc')||'all'}catch(e){}
function accQ(){return ACC==='all'?'':'?account='+ACC}
function seg(){var s=$('seg');s.textContent='';[['all','All'],['dunzo','Dunzo'],['lights','Lights']].forEach(function(x){var b=el('button',ACC===x[0]?'on':'',x[1]);b.onclick=function(){ACC=x[0];try{localStorage.setItem('acc',ACC)}catch(e){}seg();render()};s.appendChild(b)})}
var T=sessionStorage.getItem('t')||'',view='overview',S={},timer=null,openId=null,filter='all',pendingCount=0;
function $(i){return document.getElementById(i)}
function el(tag,cls,txt,kids){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;(kids||[]).forEach(function(k){if(k)e.appendChild(k)});return e}
function svg(n){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.innerHTML=ICON[n];return s}
function toast(m){var t=$('toast');t.textContent=m;t.style.display='block';setTimeout(function(){t.style.display='none'},2800)}
function api(path,body){var o={headers:{'Authorization':'Bearer '+T,'Content-Type':'application/json'}};if(body!==undefined){o.method='POST';o.body=JSON.stringify(body)}
 return fetch(path,o).then(function(r){return r.json().then(function(j){if(r.status===401){lock();throw new Error('Wrong token')}if(!r.ok)throw new Error(j.error||('Error '+r.status));return j})})}
function ago(iso){var s=(Date.now()-new Date(iso).getTime())/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function lock(){sessionStorage.removeItem('t');T='';$('app').style.display='none';$('gate').classList.add('on');clearInterval(timer)}
function nav(){var n=$('nav'),tb=$('tabs');n.textContent='';tb.textContent='';var grp='';VIEWS.forEach(function(v){
 if(v[2]!==grp){if(grp==='How it is going'){var sl=el('a','nav');sl.id='sblink';sl.href='https://santas-lights-scoreboard.roheeni-bhana.workers.dev/';sl.target='_blank';sl.rel='noopener';sl.innerHTML='<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';sl.appendChild(document.createTextNode('Scoreboard'));n.appendChild(sl)}grp=v[2];n.appendChild(el('div','navh',grp))}
 var b=el('button','nav'+(v[0]===view?' on':''),null,[svg(v[0]),el('span',null,v[1])]);if(v[0]==='inbox'&&pendingCount)b.appendChild(el('b',null,String(pendingCount)));b.onclick=function(){go(v[0])};n.appendChild(b);
 var t=el('button',v[0]===view?'on':'',null,[svg(v[0]),el('span',null,v[1]==='Approvals'?'Approve':v[1]==='Practice chat'?'Practice':v[1])]);t.onclick=function(){go(v[0])};tb.appendChild(t)})}
function go(v){view=v;openId=null;studioKey=null;studioMeta=null;ST=null;nav();$('title').textContent=(VIEWS.filter(function(x){return x[0]===v})[0]||[0,'']) [1];render()}
function status(){var s=S.settings||{};var p=$('status'),pa=s.PAUSE_ALL==='true';
 var sending=s.SENDING_ENABLED==='true'&&Number(s.DAILY_CAP)>0;
 var txt,cls;if(pa){txt='Paused';cls='bd'}else if(s.BOT_MODE==='live'){txt=sending?'Live and sending':'Live';cls='ok'}else if(s.BOT_MODE==='test'){txt='Test mode';cls='wr'}else{txt='Bot is off';cls='bl'}
 p.className='pill '+cls;p.textContent='';p.appendChild(el('i'));p.appendChild(document.createTextNode(txt));
 var b=$('panic');b.textContent=pa?'Resume':'Pause everything';b.className='btn '+(pa?'pri':'dng')}
function load(){return api('/admin/dash/overview'+accQ()).then(function(o){S=o;pendingCount=o.conversations.withTeam;status();nav()})}
var renderN=0;
function render(){var p=$('page');p.textContent='';clearInterval(timer);var myN=++renderN;
 if(T.length<20){var w=el('div','banner wr','Your admin token is short. This page shows real customer conversations, so please change ADMIN_TOKEN in Cloudflare to a long random one (at least 20 characters).');p.appendChild(w)}load().then(function(){if(myN!==renderN)return;({overview:vOverview,inbox:vInbox,approve:vApprove,results:vResults,director:vDirector,roadmap:vRoadmap,agents:vAgents,settings:vSettings,sim:vSim})[view](p)}).catch(function(e){p.appendChild(el('div','empty',e.message))})}
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
 var pc=el('div','card');pc.style.marginTop='16px';p.appendChild(pc);
 var qc=el('div','card');qc.style.marginTop='16px';qc.appendChild(el('h3',null,'Promo queue ('+s.BATCH_CAMPAIGN+')'));
 var qg=el('div','grid g4');[['Waiting for approval',q.waiting],['Approved, to send',q.approved],['Sent',q.sent],['Held or failed',q.held+q.failed]].forEach(function(x){qg.appendChild(el('div','kpi',null,[el('div','n',String(x[1])),el('div','l',x[0])]))});qc.appendChild(qg);p.appendChild(qc);
 api('/admin/dash/inbox'+accQ()).then(function(d){var need=d.rows.filter(function(r){return r.status==='handed_off'||r.waiting}).slice(0,6);
  if(!need.length)left.appendChild(el('div','empty','Nothing needs you right now.'));
  need.forEach(function(r){left.appendChild(rowFor(r,true))})});
 function feed(){api('/admin/dash/activity'+accQ()).then(function(d){right.querySelectorAll('.row').forEach(function(x){x.remove()});
  d.rows.slice(0,10).forEach(function(m){var r=el('div','row',null,[el('div','av',m.direction==='inbound'?'C':'B'),el('div','grow',null,[el('div','nm',m.direction==='inbound'?(m.contact_name||'Customer'):'Bot'),el('div','sub',m.body||'')]),el('div','sub',ago(m.created_at))]);right.appendChild(r)})})}
 function plan(){api('/admin/dash/plan').then(function(d){pc.textContent='';var t=d.totals,done=t.sent,all=t.sent+t.toSend+t.waiting+t.held;
  var sub=!d.sending?'Sending is switched off, so nothing more is scheduled.':(d.finishLabel?'On track to finish '+d.finishLabel+'.':'Nothing left to send.');
  if(d.deadlineLabel)sub+=' Price good through '+d.deadlineLabel.replace(/^[A-Za-z]+, /,'')+'.';
  var hd=el('div','plan-h',null,[el('div',null,null,[el('h3',null,'Send plan'),el('div','sub',sub)]),el('div','plan-big',String(done),[el('small',null,'of '+(t.sent+t.toSend)+' sent')])]);pc.appendChild(hd);
  if(d.late)pc.appendChild(el('div','banner wr','At this pace the last texts go out after the deadline. Raise the daily limit or move the deadline in Settings.'));
  var bar=el('div','pbar');[['s',t.sent],['a',t.toSend],['w',t.waiting],['h',t.held]].forEach(function(x){if(!x[1])return;var i=el('i',x[0]);i.style.width=(x[1]/Math.max(1,all)*100)+'%';bar.appendChild(i)});pc.appendChild(bar);
  var lg=el('div','pleg');[['Sent',t.sent,'var(--brand)'],['Scheduled',t.toSend,'var(--vio)'],['Waiting for approval',t.waiting,'var(--blue)'],['Held back',t.held,'var(--warn)']].forEach(function(x){var sp=el('span',null,x[0]+' ',[el('b',null,String(x[1]))]);sp.style.setProperty('--c',x[2]);lg.appendChild(sp)});pc.appendChild(lg);
  var g=el('div','pdays');d.days.forEach(function(y){var off=y.state==='off';var tag=y.state==='done'?'Done':y.state==='today'?'Today':off?'Day off':'Coming';
   var n=el('div','n',off?'0':String(y.state==='next'?y.planned:y.sent));if(y.state!=='next'&&!off)n.appendChild(el('small',null,' / '+y.planned));
   var m=el('div','m',null,[el('i')]);m.firstChild.style.width=(y.planned?Math.min(100,y.sent/y.planned*100):0)+'%';
   g.appendChild(el('div','pday '+y.state,null,[el('div','d',y.label,[el('em',null,tag)]),n,m]))});pc.appendChild(g)}).catch(function(){})}
 plan();feed();timer=setInterval(function(){if(view==='overview'){feed();plan()}},15000)}
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
 api('/admin/dash/inbox'+accQ()).then(function(d){var rows=d.rows.filter(function(r){return filter==='all'||(filter==='team'&&r.status==='handed_off')||(filter==='waiting'&&r.waiting)||(filter==='quote'&&(r.stage==='Quote sent'||r.stage==='Approved'))||(filter==='active'&&r.status==='active')||(filter==='closed'&&r.status==='closed')});
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
   th.appendChild(el('div','meta'+(out?' r':''),(out?(m.campaign==='human'?'You':(m.campaign==='bot'?'Bot':'Promo')):'Customer')+' · '+ago(m.sent_at||m.created_at)+(m.status==='failed'?' · failed':'')))});
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
 var fu=el('div','card');fu.style.marginTop='16px';fu.appendChild(el('h3',null,'Follow ups from Dash'));fu.appendChild(el('div','sub','Dash is '+(s.DASH_MODE==='off'?'OFF. Switch him on in Settings.':s.DASH_MODE==='approve'?'ON, and his messages wait here for you to approve.':'ON, and sending by himself.')));p.appendChild(fu);
 api('/admin/dash/followups').then(function(d){var wait=d.rows.filter(function(r){return r.status==='pending_approval'}),rest=d.rows.filter(function(r){return r.status!=='pending_approval'});
  if(!d.rows.length){fu.appendChild(el('div','empty','No follow ups yet.'));return}
  wait.forEach(function(m){var ta=el('textarea');ta.value=m.body;ta.style.cssText='width:100%;min-height:64px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--bg);margin-top:6px';
   var ok=el('button','btn sm pri','Approve'),no=el('button','btn sm','Skip');ok.style.marginRight='8px';
   ok.onclick=function(){api('/admin/dash/followup-action',{id:m.id,action:'approve',body:ta.value}).then(function(){toast('Approved. It sends in the next few minutes.');render()}).catch(function(e){toast(e.message)})};
   no.onclick=function(){api('/admin/dash/followup-action',{id:m.id,action:'skip'}).then(function(){toast('Skipped');render()}).catch(function(e){toast(e.message)})};
   fu.appendChild(el('div','pk',null,[el('div','nm',(m.contact_name||'Customer')+'  '+(m.phone_e164||''),[]),el('div','sub',m.segment==='quote'?'Sitting on a quote':'Never answered the offer'),ta,(function(){var w=el('div');w.style.marginTop='8px';w.appendChild(ok);w.appendChild(no);return w})()]))});
  rest.slice(0,15).forEach(function(m){fu.appendChild(el('div','row',null,[el('div','av',(m.contact_name||'C').charAt(0).toUpperCase()),el('div','grow',null,[el('div','nm',m.contact_name||'Customer'),el('div','sub',m.body||'')]),el('span','tag '+(m.status==='sent'?'g':m.status==='approved'?'b':''),m.status==='approved'?'Going out':m.status)]))})}).catch(function(e){fu.appendChild(el('div','empty',e.message))});
 var sl=el('div','card');sl.style.marginTop='16px';sl.appendChild(el('h3',null,'Sent so far (newest first)'));p.appendChild(sl);
 api('/admin/dash/sent').then(function(d){if(!d.rows.length){sl.appendChild(el('div','empty','Nothing sent yet.'));return}
  d.rows.forEach(function(m){var when=m.sent_at?new Date(m.sent_at).toLocaleString('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' Pacific':'';
   var row=el('div','row',null,[el('div','av',(m.contact_name||'C').charAt(0).toUpperCase()),el('div','grow',null,[el('div','nm',(m.contact_name||'Customer')+'  '+(m.phone_e164||'')),el('div','sub',m.body||'')]),el('div',null,null,[el('span','tag '+(m.status==='sent'?(m.replied?'g':'b'):'r'),m.status==='sent'?(m.replied?'Replied':'Sent'):m.status),el('div','sub',when)])]);
   row.onclick=function(){openId=m.contact_id;view='inbox';nav();$('title').textContent='Inbox';render()};sl.appendChild(row)})}).catch(function(e){sl.appendChild(el('div','empty',e.message))});
 var l=el('div','card');l.style.marginTop='16px';l.appendChild(el('h3',null,'Drafts waiting (oldest first)'));p.appendChild(l);
 api('/admin/pending?campaign='+encodeURIComponent(s.BATCH_CAMPAIGN)).then(function(d){if(!d.messages.length)l.appendChild(el('div','empty','No drafts waiting.'));
  d.messages.slice(0,40).forEach(function(m){var rj=el('button','btn sm','Skip this one');rj.onclick=function(){api('/admin/reject',{id:m.id}).then(function(){toast('Skipped');render()}).catch(function(e){toast(e.message)})};
   l.appendChild(el('div','row',null,[el('div','av',(m.contact_name||'C').charAt(0).toUpperCase()),el('div','grow',null,[el('div','nm',m.contact_name||'Customer'),el('div','sub',m.body)]),rj]))})}).catch(function(e){l.appendChild(el('div','empty',e.message))})}
function vResults(p){if(ACC==='lights'){p.appendChild(el('div','card',null,[el('h3',null,'Santa\'s Lights results'),el('div','empty','Lights results are not tracked yet. The funnel here is for the Dunzo promo. Switch to Dunzo or All to see it.')]));return}
 var c=el('div','card');c.appendChild(el('h3',null,'Loading results'));p.appendChild(c);
 api('/admin/stats?campaign='+encodeURIComponent((S.settings||{}).BATCH_CAMPAIGN||'pilot-2')).then(function(d){c.textContent='';c.appendChild(el('h3',null,'Campaign '+d.campaign));
  var f=d.funnel,t=d.texts,r=d.replies;var base=Math.max(1,t.sent||1);
  var rows=[['Promo texts sent',t.sent||0],['Replied',r.replied||0],['Chose home size',f.chosenHomeSize],['Confirmed address',f.confirmedAddress],['Gave email',f.gaveEmail],['Quote created',f.quotesCreated],['Quote approved',f.quotesApproved]];
  rows.forEach(function(x){var pct=Math.min(100,Math.round(x[1]/base*100));var bar=el('div','bar',null,[(function(){var i=el('i');i.style.width=pct+'%';return i})()]);c.appendChild(el('div','fun',null,[el('div',null,x[0]),bar,el('b',null,String(x[1]))]))});
  c.appendChild(el('div','sub','Reply rate '+r.replyRate+' · Approval rate of repliers '+f.approvalRateOfReplies+' · With the team '+d.outcomes.handedToTeam+' · STOP requests '+d.outcomes.stopRequests));
  var jq=d.jobberQuoteStatuses||{};c.appendChild(el('div','sub','Jobber quote statuses: '+(Object.keys(jq).length?Object.keys(jq).map(function(k){return k+' '+jq[k]}).join(', '):'none yet')))}).catch(function(e){c.textContent='';c.appendChild(el('div','empty',e.message))})}
function vDirector(p){
 var c=el('div','card');c.appendChild(el('h3',null,'Sales and Marketing Director: weekly report'));
 c.appendChild(el('div','sub','A plain English look at the last 7 days, built from your real numbers, with three things to do next week. It reads your data and writes a report. It does not send anything to anyone.'));
 var b=el('button','btn pri','Write this week\'s report');b.style.marginTop='14px';var out=el('div');out.style.marginTop='14px';
 b.onclick=function(){b.disabled=true;b.textContent='Writing...';out.textContent='';api('/admin/dash/director'+accQ()).then(function(d){b.disabled=false;b.textContent='Write it again';
  var box=el('pre',null,d.report);box.style.maxHeight='none';box.style.fontSize='14.5px';box.style.lineHeight='1.55';out.appendChild(box);
  var det=el('details');det.style.marginTop='12px';det.appendChild(el('summary',null,'The numbers behind it'));det.appendChild(el('pre',null,JSON.stringify(d.facts,null,2)));out.appendChild(det)}).catch(function(e){b.disabled=false;b.textContent='Try again';out.appendChild(el('div','empty',e.message))})};
 c.appendChild(b);c.appendChild(out);p.appendChild(c)}
var studioKey=null,studioMeta=null,ST=null,ALLMATES=[];
var SQL7="create table if not exists agent_versions (\n  id uuid primary key default gen_random_uuid(),\n  agent text not null,\n  status text not null check (status in ('draft','published','archived')),\n  instructions text not null,\n  dials jsonb not null default '{}'::jsonb,\n  note text,\n  created_at timestamptz not null default now(),\n  published_at timestamptz\n);\ncreate index if not exists agent_versions_agent_idx on agent_versions (agent, created_at);\nalter table agent_versions enable row level security;\ngrant all on table public.agent_versions to service_role;";
var SK={fair:'#f3cfae',tan:'#e0a878',deep:'#a8714a',deer:'#b9825a',grey:'#a9b0bb',white:'#f6f2ea',ice:'#d9efff',fox:'#e58a3c'};
var P={
 rays:function(c){var s='';for(var i=0;i<12;i++){var a=i*Math.PI/6,x1=50+36*Math.cos(a),y1=56+36*Math.sin(a),x2=50+47*Math.cos(a),y2=56+47*Math.sin(a);s+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>'}return s},
 antlers:function(c){var one='M33 36 L25 16 M27 22 L17 18 M29 28 L19 27 M25 16 L24 8';var s='<g stroke="'+c+'" stroke-width="4" stroke-linecap="round" fill="none"><path d="'+one+'"/><path transform="translate(100,0) scale(-1,1)" d="'+one+'"/></g>';return s},
 ears:function(c){return '<ellipse cx="22" cy="48" rx="7" ry="12" transform="rotate(-25 22 48)" fill="'+c+'"/><ellipse cx="78" cy="48" rx="7" ry="12" transform="rotate(25 78 48)" fill="'+c+'"/><ellipse cx="22" cy="48" rx="3.4" ry="7" transform="rotate(-25 22 48)" fill="#f2b5b5" opacity=".7"/><ellipse cx="78" cy="48" rx="3.4" ry="7" transform="rotate(25 78 48)" fill="#f2b5b5" opacity=".7"/>'},
 cloud:function(){return '<path d="M30 28 Q30 16 42 17 Q46 8 58 13 Q70 12 71 24 Q80 26 76 34 L28 34 Q22 30 30 28 Z" fill="#fff" stroke="#9aa6b8" stroke-width="2"/><path d="M52 34 L45 46 L52 46 L47 58 L60 41 L53 41 L58 34 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.4"/>'},
 beam:function(){return '<path d="M74 40 L98 24 L98 60 Z" fill="#fff3a8" opacity=".75"/>'},
 face:function(c,id){return '<ellipse cx="50" cy="60" rx="27" ry="26" fill="#000" opacity=".18" filter="url(#bl'+id+')" transform="translate(2,4)"/><ellipse cx="50" cy="58" rx="27" ry="26" fill="url(#sk'+id+')"/><ellipse cx="41" cy="44" rx="13" ry="8" fill="#fff" opacity=".32" filter="url(#bl'+id+')"/>'},
 muzzle:function(){return '<ellipse cx="50" cy="69.5" rx="13" ry="10" fill="#000" opacity=".12"/><ellipse cx="50" cy="68" rx="13" ry="10" fill="#f1dcc2"/><ellipse cx="46" cy="64" rx="6" ry="3" fill="#fff" opacity=".45"/>'},
 eyes:function(){return '<ellipse cx="41" cy="56" rx="5.6" ry="6.2" fill="#fff"/><ellipse cx="59" cy="56" rx="5.6" ry="6.2" fill="#fff"/><circle cx="41.6" cy="56.6" r="4.1" fill="#2a1c14"/><circle cx="59.6" cy="56.6" r="4.1" fill="#2a1c14"/><circle cx="43" cy="54.8" r="1.7" fill="#fff"/><circle cx="61" cy="54.8" r="1.7" fill="#fff"/><circle cx="40.2" cy="58.4" r=".8" fill="#fff" opacity=".7"/><circle cx="58.2" cy="58.4" r=".8" fill="#fff" opacity=".7"/>'},
 smile:function(id){return '<path d="M42 69.5 Q50 77.5 58 69.5" stroke="#3a2418" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="33.5" cy="65" rx="5" ry="3.6" fill="#ff7d7d" opacity=".5" filter="url(#bl'+id+')"/><ellipse cx="66.5" cy="65" rx="5" ry="3.6" fill="#ff7d7d" opacity=".5" filter="url(#bl'+id+')"/>'},
 cap:function(c){return '<path d="M25 50 Q25 24 50 24 Q75 24 75 50 Z" fill="'+c+'"/><path d="M48 50 L86 50 Q86 57 70 56 L48 56 Z" fill="'+c+'" opacity=".82"/><circle cx="50" cy="24" r="3" fill="#fff" opacity=".8"/>'},
 beanie:function(c){return '<path d="M25 48 Q25 22 50 22 Q75 22 75 48 Z" fill="'+c+'"/><rect x="23" y="44" width="54" height="9" rx="4" fill="#fff" opacity=".9"/><circle cx="50" cy="19" r="6" fill="#fff"/>'},
 santa:function(){return '<path d="M25 48 Q27 22 52 20 Q66 20 72 8 Q78 24 75 48 Z" fill="#d93a32"/><rect x="23" y="44" width="54" height="9" rx="4.5" fill="#fff"/><circle cx="73" cy="8" r="5.5" fill="#fff"/>'},
 headband:function(c){return '<rect x="24" y="38" width="52" height="8" rx="4" fill="'+c+'"/><path d="M76 42 L90 36 M76 44 L92 44 M76 46 L90 52" stroke="'+c+'" stroke-width="2.6" stroke-linecap="round"/>'},
 scarf:function(a,b){return '<path d="M26 78 Q50 92 74 78 L74 88 Q50 100 26 88 Z" fill="'+a+'"/><path d="M34 82 L38 96 L48 96 L44 84 Z" fill="'+b+'"/><path d="M30 82 l6 8 M44 87 l6 8 M58 87 l6 8" stroke="'+b+'" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>'},
 tinsel:function(){return '<path d="M24 78 Q50 94 76 78 L76 88 Q50 104 24 88 Z" fill="#d93a32"/><path d="M26 80 Q50 96 74 80" stroke="#2fa35a" stroke-width="3" fill="none" stroke-dasharray="4 3"/><path d="M26 86 Q50 102 74 86" stroke="#ffd23f" stroke-width="3" fill="none" stroke-dasharray="3 3"/>'},
 bow:function(c){return '<path d="M50 84 L38 78 L38 92 Z M50 84 L62 78 L62 92 Z" fill="'+c+'"/><circle cx="50" cy="85" r="4" fill="'+c+'"/>'},
 star:function(){return '<path d="M50 6 L54 17 L66 17 L56 24 L60 36 L50 29 L40 36 L44 24 L34 17 L46 17 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.4"/>'},
 glasses:function(c){return '<g fill="rgba(255,255,255,.35)" stroke="'+c+'" stroke-width="2.6"><circle cx="41" cy="56" r="8.5"/><circle cx="59" cy="56" r="8.5"/><path d="M49.5 55 L50.5 55"/></g>'},
 shades:function(){return '<g fill="#1b1b1f"><rect x="31" y="50" width="17" height="11" rx="4"/><rect x="52" y="50" width="17" height="11" rx="4"/></g><path d="M48 54 L52 54" stroke="#1b1b1f" stroke-width="2.4"/>'},
 headset:function(){return '<path d="M26 56 Q26 26 50 26 Q74 26 74 56" stroke="#394150" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="21" y="50" width="9" height="15" rx="4" fill="#394150"/><rect x="70" y="50" width="9" height="15" rx="4" fill="#394150"/><path d="M26 66 Q30 78 44 76" stroke="#394150" stroke-width="3" fill="none"/><circle cx="46" cy="76" r="3" fill="#394150"/>'},
 camera:function(){return '<rect x="58" y="76" width="34" height="22" rx="5" fill="#394150"/><rect x="66" y="72" width="12" height="6" rx="2" fill="#394150"/><circle cx="75" cy="87" r="8" fill="#9ad0ff" stroke="#fff" stroke-width="2.4"/><circle cx="75" cy="87" r="3" fill="#1b1b1f"/>'},
 paper:function(){return '<rect x="58" y="74" width="34" height="24" rx="3" fill="#fff" stroke="#cfd5de" stroke-width="2"/><path d="M63 80 H87 M63 85 H87 M63 90 H78" stroke="#8a93a3" stroke-width="2.4" stroke-linecap="round"/>'},
 book:function(){return '<path d="M56 78 L74 82 L92 78 L92 98 L74 102 L56 98 Z" fill="#3b6fd1"/><path d="M74 82 L74 102" stroke="#fff" stroke-width="2"/>'},
 chart:function(){return '<rect x="58" y="74" width="34" height="24" rx="4" fill="#fff" stroke="#cfd5de" stroke-width="2"/><rect x="63" y="88" width="6" height="7" fill="#34a36a"/><rect x="72" y="83" width="6" height="12" fill="#3b6fd1"/><rect x="81" y="78" width="6" height="17" fill="#d93a32"/>'},
 calendar:function(){return '<rect x="60" y="74" width="30" height="26" rx="4" fill="#fff" stroke="#cfd5de" stroke-width="2"/><rect x="60" y="74" width="30" height="8" rx="4" fill="#d93a32"/><text x="75" y="95" font-size="12" font-weight="800" text-anchor="middle" fill="#394150">24</text>'},
 bulb:function(){return '<circle cx="50" cy="12" r="15" fill="#fff3a8" opacity=".6"/><path d="M50 4 Q61 4 61 15 Q61 21 56 25 L56 29 L44 29 L44 25 Q39 21 39 15 Q39 4 50 4 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.6"/><rect x="44" y="29" width="12" height="4" rx="1.5" fill="#9aa6b8"/>'},
 snow:function(){return '<g stroke="#8ec9ff" stroke-width="2.6" stroke-linecap="round"><path d="M16 14 V30 M9 18 L23 26 M9 26 L23 18"/><path d="M84 8 V20 M79 11 L89 17 M79 17 L89 11"/></g>'},
 beak:function(c){return '<path d="M43 63 L57 63 L50 76 Z" fill="'+c+'"/>'},
 brow:function(){return '<path d="M34 47 L46 51 M66 47 L54 51" stroke="#2b2b33" stroke-width="3.4" stroke-linecap="round"/>'},
 feathers:function(){return '<path d="M30 34 L24 18 L36 28 M70 34 L76 18 L64 28" stroke="#f6f2ea" stroke-width="5" stroke-linecap="round" fill="none"/>'},
 nose:function(c){return '<ellipse cx="50" cy="63.2" rx="6.6" ry="5.2" fill="#000" opacity=".2"/><ellipse cx="50" cy="62" rx="6.6" ry="5.2" fill="'+c+'"/><ellipse cx="47.8" cy="60.2" rx="2.4" ry="1.5" fill="#fff" opacity=".75"/>'},
 trunk:function(){return '<path d="M42 66 Q50 70 58 66 Q64 80 54 90 Q46 92 48 84 Q52 78 50 74 Q44 74 42 66 Z" fill="#9aa3af"/>'},
 elephant:function(){return '<ellipse cx="19" cy="56" rx="12" ry="16" fill="#b8c0cb"/><ellipse cx="81" cy="56" rx="12" ry="16" fill="#b8c0cb"/>'},
 hardhat:function(){return '<path d="M24 46 Q24 22 50 22 Q76 22 76 46 Z" fill="#ffc83a"/><rect x="20" y="44" width="60" height="7" rx="3.5" fill="#f2a900"/><rect x="45" y="20" width="10" height="10" rx="3" fill="#f2a900"/>'},
 sheriff:function(){return '<path d="M16 44 Q50 34 84 44 L78 50 Q50 44 22 50 Z" fill="#8a5a2b"/><path d="M30 44 Q31 20 50 20 Q69 20 70 44 Z" fill="#a8703a"/><path d="M50 62 L53 70 L61 70 L55 75 L57 83 L50 78 L43 83 L45 75 L39 70 L47 70 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.2"/>'},
 heart:function(){return '<path d="M50 18 C50 8 36 6 36 16 C36 24 50 32 50 32 C50 32 64 24 64 16 C64 6 50 8 50 18 Z" fill="#ff5a7a"/>'},
 bolt:function(){return '<path d="M52 32 L44 46 L51 46 L47 58 L60 42 L52 42 L57 32 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="1.4"/>'},
 comet:function(){return '<path d="M96 8 L58 30" stroke="#8ec9ff" stroke-width="9" stroke-linecap="round" opacity=".55"/><circle cx="56" cy="31" r="7" fill="#fff3a8" stroke="#ffd23f" stroke-width="2"/>'},
 sparkle:function(){return '<g fill="#ffd23f"><path d="M84 14 L86 20 L92 22 L86 24 L84 30 L82 24 L76 22 L82 20 Z"/><path d="M14 30 L15.5 34 L19.5 35.5 L15.5 37 L14 41 L12.5 37 L8.5 35.5 L12.5 34 Z"/></g>'},
 bird:function(){return '<ellipse cx="50" cy="20" rx="12" ry="9" fill="#ffd23f"/><circle cx="56" cy="17" r="2" fill="#1b1b1f"/><path d="M60 19 L68 21 L60 23 Z" fill="#f08a24"/><path d="M40 20 Q34 12 42 14 Z" fill="#f0b400"/>'},
 beret:function(c){return '<ellipse cx="50" cy="28" rx="26" ry="11" fill="'+c+'"/><circle cx="50" cy="17" r="3.4" fill="'+c+'"/>'},
 newsboy:function(c){return '<path d="M24 46 Q26 22 50 22 Q74 22 76 46 Z" fill="'+c+'"/><path d="M24 44 Q50 38 76 44 L76 50 Q50 44 24 50 Z" fill="'+c+'" opacity=".8"/>'},
 mountain:function(){return '<path d="M38 34 L50 14 L62 34 Z" fill="#7a8aa0"/><path d="M45 23 L50 14 L55 23 Z" fill="#fff"/>'}
};
var SPEC={
 Maverick:{skin:SK.white,back:['feathers'],front:['brow','beak:#f5a623','shades'],noMouth:true},
 Gus:{skin:SK.fair,front:['cap:#e0392f']},
 Flash:{skin:SK.tan,front:['headband:#7b5cff','camera']},
 Relay:{skin:SK.deep,front:['headset']},
 Dash:{skin:SK.fair,front:['headband:#1d9bf0']},
 Cal:{skin:SK.tan,front:['glasses:#394150','calendar']},
 Summit:{skin:SK.fair,front:['beanie:#2f9e6b','mountain']},
 Scoop:{skin:SK.fair,front:['newsboy:#8a5a2b','paper']},
 Chirp:{skin:SK.tan,front:['bird']},
 Sunny:{skin:SK.fair,back:['rays:#ffb02e'],front:[]},
 Stormy:{skin:SK.grey,front:['cloud']},
 Beacon:{skin:SK.deep,back:['beam'],front:['hardhat']},
 Shutter:{skin:SK.tan,front:['beret:#3b6fd1','camera']},
 Tinsel:{skin:SK.fair,front:['tinsel','star']},
 Pixel:{skin:SK.tan,front:['bulb']},
 Frosty:{skin:SK.ice,back:['snow'],front:['beanie:#6aa9ff']},
 Snap:{skin:SK.fair,front:['santa','camera']},
 Rudolph:{skin:SK.deer,deer:true,nose:'#e63946',front:[]},
 Dasher:{skin:SK.deer,deer:true,nose:'#4a3426',front:['headband:#ff7b1c']},
 Dancer:{skin:SK.deer,deer:true,nose:'#4a3426',front:['bow:#8a4fd1']},
 Prancer:{skin:SK.deer,deer:true,nose:'#4a3426',front:['sparkle']},
 Vixen:{skin:SK.deer,deer:true,nose:'#4a3426',front:['shades']},
 Comet:{skin:SK.deer,deer:true,nose:'#4a3426',back:['comet'],front:[]},
 Cupid:{skin:SK.deer,deer:true,nose:'#4a3426',front:['heart']},
 Donner:{skin:SK.deer,deer:true,nose:'#4a3426',front:['bolt']},
 Blitzen:{skin:SK.deer,deer:true,nose:'#4a3426',front:['hardhat']},
 Memo:{skin:SK.grey,elephant:true,front:['trunk']},
 Sheriff:{skin:SK.fair,front:['sheriff']},
 Tally:{skin:SK.tan,front:['glasses:#394150','chart']},
 Sage:{skin:SK.fair,front:['glasses:#8a5a2b','book']},
 Mentor:{skin:SK.tan,front:['glasses:#394150','star']},
 Quill:{skin:SK.deep,front:['glasses:#394150','paper']},
 Pin:{skin:SK.fair,front:['beret:#d93a32']},
 Holly:{skin:SK.tan,front:['beanie:#2f9e6b','book']},
 North:{skin:SK.ice,front:['star']}
};
function part(spec){var bits=spec.split(':');var f=P[bits[0]];if(!f)return '';return f(bits[1],bits[2])}
function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;function c(v){return Math.max(0,Math.min(255,Math.round(f>0?v+(255-v)*f:v*(1+f))))}return 'rgb('+c(r)+','+c(g)+','+c(b)+')'}
function avatarSVG(name){var S=SPEC[name];if(!S)return null;var h=hue(name),id=name;
 var s='<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs>'
  +'<radialGradient id="bg'+id+'" cx="32%" cy="24%" r="95%"><stop offset="0" stop-color="hsl('+h+' 95% 93%)"/><stop offset=".55" stop-color="hsl('+((h+25)%360)+' 80% 80%)"/><stop offset="1" stop-color="hsl('+((h+50)%360)+' 62% 62%)"/></radialGradient>'
  +'<radialGradient id="sk'+id+'" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="'+shade(S.skin,.38)+'"/><stop offset=".55" stop-color="'+S.skin+'"/><stop offset="1" stop-color="'+shade(S.skin,-.3)+'"/></radialGradient>'
  +'<linearGradient id="gl'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>'
  +'<radialGradient id="vg'+id+'" cx="50%" cy="42%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient>'
  +'<filter id="bl'+id+'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>'
  +'<filter id="ds'+id+'" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.2" stdDeviation="1.5" flood-color="#000" flood-opacity=".32"/></filter>'
  +'<clipPath id="cp'+id+'"><rect width="100" height="100" rx="26"/></clipPath></defs>'
  +'<g clip-path="url(#cp'+id+')"><rect width="100" height="100" fill="url(#bg'+id+')"/><ellipse cx="50" cy="93" rx="30" ry="7" fill="#000" opacity=".22" filter="url(#bl'+id+')"/>';
 s+='<g filter="url(#ds'+id+')">';(S.back||[]).forEach(function(b){s+=part(b)});
 if(S.deer){s+=P.antlers('#c99a5e')+P.ears(S.skin)}
 if(S.elephant)s+=P.elephant();
 s+='</g>';
 s+=P.face(S.skin,id);
 if(S.deer)s+=P.muzzle();
 s+=P.eyes();
 if(S.deer)s+=P.nose(S.nose);
 if(!S.noMouth)s+=P.smile(id);
 s+='<g filter="url(#ds'+id+')">';
 if(S.deer&&S.nose==='#e63946')s+=P.scarf('#2f9e6b','#d93a32');else if(S.deer&&(S.front||[]).length===0)s+=P.scarf('#3b6fd1','#fff');
 (S.front||[]).forEach(function(b){s+=part(b)});
 s+='</g><rect width="100" height="100" fill="url(#vg'+id+')"/><path d="M0 0 H100 V34 Q50 52 0 34 Z" fill="url(#gl'+id+')"/></g>'
  +'<rect x=".8" y=".8" width="98.4" height="98.4" rx="25.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>';
 return s+'</svg>'}

function hue(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return h}
function avatar(m,size){var a=el('div','avl');var sv=avatarSVG(m.name);
 if(sv){a.innerHTML=sv;a.style.background='none';a.style.boxShadow='none'}else{a.textContent=m.emoji||'?';var h=hue(m.name);a.style.background='linear-gradient(135deg,hsl('+h+' 85% 88%),hsl('+((h+40)%360)+' 80% 80%))'}
 if(size){a.style.width=size+'px';a.style.height=size+'px';a.style.fontSize=Math.round(size*.52)+'px'}return a}
var FLOWS={};
function openFlow(name){var m=ALLMATES.filter(function(x){return x.name===name})[0];var f=FLOWS[name];if(!m||!f)return toast('No workflow for '+name+' yet');
 var old=document.querySelector('.wfm');if(old)old.remove();
 var ov=el('div','wfm');var box=el('div','wfb');ov.appendChild(box);ov.onclick=function(e){if(e.target===ov)ov.remove()};
 var x=el('button','x','\u00d7');x.onclick=function(){ov.remove()};
 var live=m.state==='live',ext=m.state==='external';
 box.appendChild(el('div','wfh',null,[avatar(m,52),el('div',null,null,[el('div','nm',m.name+'\'s workflow'),el('div','sub2',m.role)]),stag(m,'Planned'),x]));
 if(!live&&!ext)box.appendChild(el('div','banner wr','Not built yet. This is how '+m.name+' will work once built.'));
 var key=el('div','wfk');[['Starts when','var(--brand)'],['Does','var(--mute)'],['Decides','var(--warn)'],['Passes on','var(--blue)'],['Result','var(--vio)']].forEach(function(k){var sp=el('span',null,k[0]);sp.style.setProperty('--c',k[1]);key.appendChild(sp)});box.appendChild(key);
 var fl=el('div','wff');var LAB={start:'Starts when',step:'Step',check:'Decides',hand:'Passes on',end:'Result'},n=0;
 f.forEach(function(st){var nd=el('div','wfn '+st.k);if(st.k==='step')n++;
  nd.appendChild(el('div','k',st.k==='step'?'Step '+n:LAB[st.k]));nd.appendChild(el('div','t',st.t));if(st.d)nd.appendChild(el('div','d',st.d));
  if(st.br){var br=el('div','wfbr');st.br.forEach(function(b){br.appendChild(el('div',null,null,[el('b',null,'If'),el('span',null,b[0],[el('em',null,' \u2192 '+b[1])])]))});nd.appendChild(br);nd.appendChild(el('div','d','Otherwise it carries on below.'))}
  if(st.sys&&st.sys.length){var sy=el('div','sy');st.sys.forEach(function(z){sy.appendChild(el('i',null,z))});nd.appendChild(sy)}
  if(st.k==='hand'&&st.to){nd.title='Open '+st.to+'\'s workflow';nd.onclick=function(){openFlow(st.to)};nd.appendChild(el('div','d','Click to see '+st.to+'\'s workflow.'))}
  fl.appendChild(nd)});box.appendChild(fl);document.body.appendChild(ov)}
function flowBtn(m,cls){var b=el('button',cls||'btn','Workflow');b.onclick=function(e){e.stopPropagation();if(Object.keys(FLOWS).length)return openFlow(m.name);api('/admin/dash/agents').then(function(d){ALLMATES=d.mates;FLOWS=d.flows||{};openFlow(m.name)})};return b}
function stag(m,soon){if(m.label)return el('span','tag otag '+(m.tone||''),m.label);return el('span','tag otag '+(m.state==='live'?'g':m.state==='external'?'b':'o'),m.state==='live'?'Live':m.state==='external'?'Your Claude':(soon||'Soon'))}
function mateCard(m){var c=el('div','mcard'+(m.state==='live'?' live':''),null,[avatar(m),el('div','grow',null,[el('div','nm',m.name),el('div','sub2',m.role)]),stag(m)]);
 c.title=m.does;c.onclick=function(){studioKey=m.agent||('profile:'+m.name);studioMeta=m;render()};return c}
var AVIEW='org';try{AVIEW=localStorage.getItem('aview')||'org'}catch(e){}
function onode(m,big){var st=m.state==='live'?'ok':m.state==='external'?'run':'plan';
 var n=el('div','onode'+(big?' big':''),null,[avatar(m,big?58:42),el('div','grow',null,[el('div','nm',m.name,[]),el('div','sub2',m.role),stag(m)])]);
 n.title=(m.state==='live'?'Live. ':m.state==='external'?'Handled by your own Claude setup. ':'Planned. ')+m.does;n.onclick=function(){studioKey=m.agent||('profile:'+m.name);studioMeta=m;render()};return n}
function orgTeam(title,list){var col=el('div','oc-col');col.appendChild(el('div','oc-pill',title+' · '+list.length));var ul=el('div','oc-list');list.forEach(function(m){var it=el('div','oc-item');it.appendChild(onode(m));ul.appendChild(it)});col.appendChild(ul);return col}
function orgCompany(title,sub,list){var col=el('div','oc-col');col.appendChild(el('div','oc-co',null,[el('b',null,title),el('div','sub2',sub)]));
 var br=el('div','oc-branch');br.appendChild(orgTeam('Sales',list.filter(function(m){return m.team==='Sales'})));br.appendChild(orgTeam('Marketing',list.filter(function(m){return m.team==='Marketing'})));col.appendChild(br);return col}
function orgChart(p,d){var c=el('div','card oc');
 var dir=d.mates.filter(function(m){return m.unit==='director'})[0];var top=onode(dir,true);top.classList.add('oc-top');c.appendChild(top);
 var br=el('div','oc-branch wide');
 if(ACC!=='lights')br.appendChild(orgCompany('Dunzo Gutters','Gutters and exterior care',d.mates.filter(function(m){return m.unit==='dunzo'})));
 if(ACC!=='dunzo')br.appendChild(orgCompany('Santa\'s Lights','Christmas and permanent lighting',d.mates.filter(function(m){return m.unit==='lights'})));
 if(br.children.length===1)br.classList.add('one');c.appendChild(br);
 var sh=el('div','oc-shared');sh.appendChild(el('div','oc-pill','Shared by both companies'));var row=el('div','oc-row');d.mates.filter(function(m){return m.unit==='shared'}).forEach(function(m){row.appendChild(onode(m))});sh.appendChild(row);c.appendChild(sh);
 var key=el('div','oc-key');[['g','Live','working today'],['b','Your Claude','handled by your own Claude setup'],['o','Soon','planned, not built yet']].forEach(function(k){key.appendChild(el('span','sst',null,[el('span','tag otag '+k[0],k[1]),document.createTextNode(k[2])]))});c.appendChild(key);
 p.appendChild(c)}
function vAgents(p){
 if(studioKey){return vStudio(p)}
 api('/admin/dash/agents').then(function(d){ALLMATES=d.mates;FLOWS=d.flows||{};
  p.appendChild(el('div','sub','Meet the team. Click anyone to see what they do, and to open their studio.'));
  var vw=el('div','chips');vw.style.marginTop='10px';[['org','Org chart'],['cards','Cards']].forEach(function(x){var c=el('button','chip'+(AVIEW===x[0]?' on':''),x[1]);c.onclick=function(){AVIEW=x[0];try{localStorage.setItem('aview',AVIEW)}catch(e){}render()};vw.appendChild(c)});p.appendChild(vw);
  if(AVIEW==='org'){orgChart(p,d);var sb0=el('div','card');sb0.style.marginTop='16px';p.appendChild(sb0);vSystems(sb0,null);api('/admin/dash/systems').then(function(r){sb0.textContent='';vSystems(sb0,r.checks)}).catch(function(){});return}
  var dir=d.mates.filter(function(m){return m.unit==='director'})[0];
  var top=el('div','card top-card hov',null,[avatar(dir,64),el('div','nm',dir.name+', '+dir.role),el('span','tag g','Live'),el('div','sub',dir.does)]);top.querySelector('.sub:last-child').style.whiteSpace='normal';top.style.cursor='pointer';top.onclick=function(){studioKey=dir.agent;studioMeta=dir;render()};
  p.appendChild(top);p.appendChild(el('div','stem'));
  function unit(title,sub,list,dim){var c=el('div','card'+(dim?' dim':''),null,[el('h3',null,title),el('div','sub',sub)]);
   ['Sales','Marketing'].forEach(function(t){var ms=list.filter(function(m){return m.team===t});if(!ms.length)return;c.appendChild(el('div','team',t));var g=el('div','mgrid');ms.forEach(function(m){g.appendChild(mateCard(m))});c.appendChild(g)});return c}
  var units=el('div','units');
  units.appendChild(unit('Dunzo Gutters','Gutter and exterior cleaning, repairs and installs',d.mates.filter(function(m){return m.unit==='dunzo'}),ACC==='lights'));
  units.appendChild(unit('Santa\'s Lights','Christmas and permanent lighting',d.mates.filter(function(m){return m.unit==='lights'}),ACC==='dunzo'));
  p.appendChild(units);
  var sh=el('div','card');sh.style.marginTop='16px';sh.appendChild(el('h3',null,'Shared by both companies'));var g=el('div','mgrid');d.mates.filter(function(m){return m.unit==='shared'}).forEach(function(m){g.appendChild(mateCard(m))});sh.appendChild(g);p.appendChild(sh);var sysbox=el('div','card');sysbox.style.marginTop='16px';p.appendChild(sysbox);vSystems(sysbox,null);api('/admin/dash/systems').then(function(r){sysbox.textContent='';vSystems(sysbox,r.checks)}).catch(function(){})}).catch(function(e){p.appendChild(el('div','empty',e.message))})}

var SYSTEMS=[
 {name:'Jobber',mono:'J',color:'#4aa83a',role:'Quotes, clients and jobs',checks:['jobberDunzo','jobberLights'],does:'Where quotes, clients, properties and jobs live. The bot creates the client, property and quote here and texts the customer the link. It also reads past quotes and jobs so every customer is greeted with their history.',notes:'Connected for Dunzo and Santa\'s Lights. Approvals and the Quote Sent stage still come from your Zap.'},
 {name:'GoHighLevel',mono:'G',color:'#1d6fe5',role:'Contacts, texting and pipelines',checks:['ghlDunzo','ghlLights'],does:'The CRM and the phone line. The bot reads contacts, notes and opportunities, sends the texts, adds tags and notes, and moves photo leads between stages. Both accounts are connected.',notes:'Your existing pipelines and Zaps are left exactly as they are.'},
 {name:'Quo',mono:'Q',color:'#6b46e5',role:'Calls, texts and voicemail',checks:['quo'],status:'planned',does:'The phone system. Once connected, the agents read it but never send or change anything in it: the Mentor studies real calls and texts to learn the house voice, and each agent sees recent phone calls with the customer it is talking to.',notes:'Connect it in Settings with a Quo API key. Still to come: a call or voicemail pausing the bot on that customer.'},
 {name:'Old GHL bots',mono:'6',color:'#e08a1d',role:'The six Agent Studio bots',checks:[],status:'running',does:'01 Take Off, 02 Pics Received and the others you built in GHL. They keep running for the rest of your pipeline, and every one of them has been told to ignore any contact tagged winter promo.',notes:'We turn them off one by one only when each replacement is proven. Nothing is switched off yet.'},
 {name:'Zapier',mono:'Z',color:'#ff4a00',role:'Jobber to GHL, Quo to GHL, scoreboard',checks:[],status:'running',does:'Moves information between Jobber, GHL, Quo and the scoreboard. It creates the opportunity in Quote Sent when a quote goes out, and handles the later stages.',notes:'Kept running on purpose. Zapier has no live check we can read from here, so look at it in Zapier. We are not replacing any Zap for now.'},
 {name:'CompanyCam',mono:'CC',color:'#0a66ff',role:'Crew job photos',checks:[],status:'planned',does:'Where the crew\'s job photos live. Today a Zap links it to Jobber.',notes:'Not connected directly yet. Planned: Flash reads these photos for take offs, and Shutter and Snap turn them into before and after posts.'},
 {name:'Meta Ads',mono:'M',color:'#0866ff',role:'Ad spend per ad',checks:[],status:'planned',does:'Facebook and Instagram ad spend. The plan is to match spend to sold jobs so you know which ads make money.',notes:'Not connected yet. It feeds the ad reporter and the scoreboard.'},
 {name:'Supabase',mono:'S',color:'#2fa36b',role:'The memory',checks:['database'],does:'Conversations, messages, drafts, agent versions and settings all live here.',notes:'One project for this system. The scoreboard has its own.'},
 {name:'Claude',mono:'C',color:'#d97757',role:'The brain',checks:[],status:'running',does:'Writes every reply and every draft. Your monthly API credit pays for it.',notes:'Checked with real use, not a ping, so it costs nothing to look at.'}
];
function vSystems(box,checks){box.appendChild(el('h3',null,'Connected systems'));box.appendChild(el('div','sub','The tools our agents work with, and the ones still running on their own. Green means a live check just passed.'));var g=el('div','mgrid');
 g.className='sysgrid';SYSTEMS.forEach(function(sy){var res=(sy.checks||[]).map(function(k){return checks?checks[k]:undefined});var bad=res.filter(function(r){return r&&r!=='ok'});var ok=res.length&&res.every(function(r){return r==='ok'});
  var dot=el('span','sdot '+(ok?'ok':bad.length?'bad':sy.status==='planned'?'plan':'run'));var label=ok?'Connected':bad.length?'Problem':sy.status==='planned'?'Not connected yet':sy.status==='running'?'Running':'Checking';
  var mono=el('div','mono',sy.mono);mono.style.background=sy.color;
  var det=el('div','sdet');det.style.display='none';det.appendChild(el('div',null,sy.does));det.appendChild(el('div','sub',sy.notes));if(bad.length)det.appendChild(el('div','err',bad.join(' ')));
  var c=el('div','mcard sys',null,[mono,el('div','grow',null,[el('div','nm',sy.name),el('div','sub2',sy.role),el('span','sst',null,[dot,document.createTextNode(label)])])]);
  var wrap=el('div',null,null,[c,det]);c.onclick=function(){det.style.display=det.style.display==='none'?'block':'none'};g.appendChild(wrap)});box.appendChild(g)}
function diffLines(a,b){var x=a.split('\n'),y=b.split('\n'),n=x.length,m=y.length,L=[],i,j;for(i=0;i<=n;i++)L.push(new Array(m+1).fill(0));
 for(i=n-1;i>=0;i--)for(j=m-1;j>=0;j--)L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 var out=[];i=0;j=0;while(i<n&&j<m){if(x[i]===y[j]){out.push(['same',x[i]]);i++;j++}else if(L[i+1][j]>=L[i][j+1]){out.push(['del',x[i]]);i++}else{out.push(['add',y[j]]);j++}}
 while(i<n)out.push(['del',x[i++]]);while(j<m)out.push(['add',y[j++]]);return out}
function diffView(a,b){var box=el('div','diff');var d=diffLines(a,b),same=0,changed=0;
 function flush(){if(same){box.appendChild(el('div','dl same',same+' unchanged line'+(same>1?'s':'')));same=0}}
 d.forEach(function(r){if(r[0]==='same'){same++;return}flush();changed++;box.appendChild(el('div','dl '+r[0],(r[0]==='add'?'+ ':'- ')+r[1]))});flush();
 if(!changed){box.textContent='';box.appendChild(el('div','dl same','No changes.'))}return box}
function libLine(s){var g=s.ghl||{},gs=0,gu=0;['dunzo','lights'].forEach(function(k){if(g[k]){gs+=g[k].seen;gu+=g[k].used}});return 'Read '+s.msgSeen+' Quo text messages ('+s.teamSeen+' written by the team), '+s.callsRead+' phone calls, and '+gs+' GoHighLevel conversations ('+gu+' with a real back and forth), in '+s.batches+' batches.'}
function voicePanel(p){var c=el('div','card');c.style.marginTop='16px';c.appendChild(el('h3',null,'The library: what every agent learns from real calls and texts'));p.appendChild(c);var body=el('div');c.appendChild(body);var running=false;
 function list(title,items,fmt){if(!items||!items.length)return null;var d=document.createElement('details');d.style.margin='8px 0';var sm=document.createElement('summary');sm.textContent=title+' ('+items.length+')';sm.style.cssText='cursor:pointer;font-weight:650';d.appendChild(sm);var ul=el('div','sub');ul.style.cssText='white-space:pre-wrap;margin-top:6px;line-height:1.55';ul.textContent=items.map(function(x){return '\u2022 '+fmt(x)}).join('\n');d.appendChild(ul);return d}
 function draw(d){body.textContent='';
  if(!d.connected){body.appendChild(el('div','banner wr',null,[el('div','t','Quo is not connected yet',[el('small',null,'Add the Quo API key in Settings, under Connections. Then come back here.')])]));var g=el('button','btn','Open Settings');g.onclick=function(){go('settings')};body.appendChild(g);return}
  body.appendChild(el('div','sub','The Mentor reads every text and phone call in Quo and every text conversation in GoHighLevel, thousands of them, and boils them down into one playbook per company: how the team really talks, what customers ask, why they hesitate, the words they use, and post ideas. You read it, then switch it on. From then on the sales agents and the marketing writers all learn from it. Nothing changes for customers until you switch it on.'));
  var st=d.state,prog=el('div','banner '+(st&&st.finishedAt?'ok':'wr'));var pt=el('div','t',!st?'Nothing has been studied yet':st.finishedAt?'Study finished':'Study in progress');var ps=el('small',null,st?(libLine(st)+(st.finishedAt?' Finished '+ago(st.finishedAt)+'.':'')):'Press the button to start. It takes a few minutes and you can leave this page open.');pt.appendChild(ps);prog.appendChild(pt);body.appendChild(prog);
  function loop(){running=true;api('/admin/dash/library-step',{}).then(function(r){var s2=r.state;ps.textContent=libLine(s2)+' Still reading...';
    if(!r.done)return loop();ps.textContent='Reading finished. Writing the Dunzo playbook...';
    return api('/admin/dash/library-build',{company:'dunzo'}).catch(function(e){toast('Dunzo: '+e.message)}).then(function(){ps.textContent='Writing the Santa\'s Lights playbook...';return api('/admin/dash/library-build',{company:'lights'}).catch(function(e){toast('Lights: '+e.message)})}).then(function(){running=false;toast('The library is ready to read');load2()})}).catch(function(e){running=false;toast(e.message);pt.firstChild.textContent='The study stopped';ps.textContent=e.message+' Press Carry on to pick up where it left off.';var cb=el('button','btn pri','Carry on');cb.style.marginTop='8px';cb.onclick=function(){cb.remove();pt.firstChild.textContent='Study in progress';loop()};body.insertBefore(cb,prog.nextSibling)})}
  var b1=el('button','btn pri',st?'Study everything again':'Study everything');b1.onclick=function(){if(st&&!confirm('Read everything again from the start? The playbooks that are live stay live until you switch on new ones.'))return;b1.disabled=true;pt.firstChild.textContent='Study in progress';api('/admin/dash/library-start',{fresh:true}).then(loop).catch(function(e){toast(e.message);b1.disabled=false})};
  var row=el('div','set',null,[el('div','grow',null,[el('b',null,'Study'),el('span',null,'Reads up to 20,000 Quo text messages, the longer phone calls, and up to 1,500 GoHighLevel conversations for each company. It can take an hour or more, and it picks up where it left off if the page is closed.')])]);
  if(st&&!st.finishedAt){var bc=el('button','btn pri','Carry on');bc.onclick=function(){bc.disabled=true;loop()};row.appendChild(bc)}
  if(st&&st.finishedAt){var b2=el('button','btn','Top up with what is new');b2.onclick=function(){b2.disabled=true;pt.firstChild.textContent='Study in progress';api('/admin/dash/library-start',{fresh:false}).then(loop).catch(function(e){toast(e.message);b2.disabled=false})};row.appendChild(b2)}
  row.appendChild(b1);body.appendChild(row);
  d.companies.forEach(function(co){var w=el('div');w.style.cssText='border-top:1px solid var(--line);margin-top:16px;padding-top:14px';w.appendChild(el('h3',null,co.name));
   w.appendChild(el('div','banner '+(co.live?'ok':'wr'),null,[el('div','t',co.live?'Switched on: every '+co.name+' agent is learning from it':'Not switched on',[el('small',null,co.live?'Sales agents use the voice and what customers ask. Marketing writers use the questions, the customer wording and the post ideas.':'Agents are using the built in house voice and the website knowledge only.')])]));
   var pb=co.draft;if(!pb){w.appendChild(el('div','sub','No playbook yet. Run the study above.'));
    if(st&&st.finishedAt){var bb=el('button','btn','Write the playbook');bb.onclick=function(){bb.disabled=true;bb.textContent='Writing...';api('/admin/dash/library-build',{company:co.company}).then(draw).catch(function(e){toast(e.message);bb.disabled=false;bb.textContent='Write the playbook'})};w.appendChild(bb)}body.appendChild(w);return}
   w.appendChild(el('div','sub','Latest playbook, written '+ago(pb.builtAt)+' from '+pb.from.batches+' batches ('+pb.from.messages+' Quo messages, '+pb.from.calls+' calls, '+(pb.from.conversations||0)+' GoHighLevel conversations).'));
   w.appendChild(el('b',null,'How the team talks (you can edit this)'));var ta=el('textarea');ta.value=pb.voice;ta.style.cssText='width:100%;min-height:210px;margin:8px 0;border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--bg);color:var(--ink);font:inherit;line-height:1.5';w.appendChild(ta);
   [list('Questions customers ask most',pb.questions,function(x){return x.q+(x.about?'  ('+x.about+')':'')}),list('Why customers hesitate, and what helps',pb.objections,function(x){return x.o+(x.works?':  '+x.works:'')}),list('Words and phrases customers use',pb.phrases,function(x){return x}),list('Post ideas from real questions',pb.ideas,function(x){return x}),list('What agents must not copy from the team',pb.avoid,function(x){return x})].forEach(function(x){if(x)w.appendChild(x)});
   var on=el('button','btn pri',co.live?'Replace the live one with this':'Switch on for all '+co.name+' agents');on.style.marginTop='10px';on.onclick=function(){if(!confirm('Switch this playbook on for every '+co.name+' agent? You can switch it off again any time.'))return;api('/admin/dash/library-publish',{company:co.company,on:true,voice:ta.value}).then(function(r){toast('Switched on');draw(r)}).catch(function(e){toast(e.message)})};w.appendChild(on);
   if(co.live){var off=el('button','btn','Switch off');off.style.margin='10px 0 0 8px';off.onclick=function(){if(!confirm('Switch the library off for '+co.name+'?'))return;api('/admin/dash/library-publish',{company:co.company,on:false}).then(function(r){toast('Switched off');draw(r)}).catch(function(e){toast(e.message)})};w.appendChild(off)}
   body.appendChild(w)})}
 function load2(){api('/admin/dash/library').then(draw).catch(function(e){body.textContent='';body.appendChild(el('div','empty',e.message))})}
 load2()}
function vStudio(p){
 var m=studioMeta;
 var back=el('button','btn sm','Back to the team');back.onclick=function(){studioKey=null;studioMeta=null;ST=null;render()};p.appendChild(back);
 if(!m.agent){var c=el('div','card');c.style.marginTop='14px';c.appendChild(el('div','prof',null,[avatar(m,88),el('div','grow',null,[el('div','nm',m.name),el('div','sub2',m.role),stag(m,'Planned')]),flowBtn(m,'btn pri')]));
  c.appendChild(el('p',null,m.does));if(m.note)c.appendChild(el('div','banner wr',m.note));c.appendChild(el('div','sub',m.state==='live'?'Built into the system. It has no studio of its own yet, so there is nothing to set up or edit here: its rules live in the code, and its workflow shows exactly what it does.':'Not built yet. When it is, it gets its own studio here, with the same chat builder, test pack and version history.'));p.appendChild(c);if(m.name==='Mentor')voicePanel(p);return}
 var shell=el('div');p.appendChild(shell);shell.appendChild(el('div','empty','Loading '+m.name+'...'));
 api('/admin/dash/agent?agent='+m.agent).then(function(d){
  var live=d.published?d.published.instructions:d.defaultInstructions,liveDials=d.published?d.published.dials:{};
  ST={m:m,d:d,live:live,liveDials:liveDials,text:d.draft?d.draft.instructions:live,dials:JSON.parse(JSON.stringify(d.draft?d.draft.dials:liveDials)),saved:!!d.draft,dirty:false,draftId:d.draft?d.draft.id:null,tab:'instructions',chat:[],ran:false,pack:null};drawStudio(shell)}).catch(function(e){shell.textContent='';shell.appendChild(el('div','empty',e.message))})}
function differs(){return ST.text.trim()!==ST.live.trim()||JSON.stringify(ST.dials)!==JSON.stringify(ST.liveDials)}
function saveDraft(done){api('/admin/dash/agent-save',{agent:ST.m.agent,instructions:ST.text,dials:ST.dials,note:''}).then(function(r){
  if(r.confirmed){ST.saved=true;ST.dirty=false;ST.draftId=r.id;toast('Draft saved and confirmed');if(done)done(true)}else{toast('NOT saved. The database did not confirm it.');if(done)done(false)}}).catch(function(e){toast('NOT saved: '+e.message);if(done)done(false)})}
function publishNow(id,label){api('/admin/dash/agent-publish',{agent:ST.m.agent,id:id}).then(function(r){if(r.confirmed){toast(label+' is now live');studioKey=ST.m.agent;render()}else toast('Publish was NOT confirmed. Nothing changed.')}).catch(function(e){toast('Not published: '+e.message)})}
function drawStudio(shell){
 shell.textContent='';var m=ST.m,d=ST.d;
 var head=el('div','card studio-head');head.style.marginTop='14px';
 var live=el('span','tag g',d.published?'Live: version '+d.published.n:'Live: built-in default');var st=el('span','tag '+(ST.dirty?'o':''),ST.dirty?'Unsaved changes':(ST.saved?'Draft saved':'No draft'));
 var pub=el('button','btn pri','Publish');var sv=el('button','btn','Save draft');
 function badges(){st.textContent=ST.dirty?'Unsaved changes':(ST.saved?'Draft saved':'No draft');st.className='tag '+(ST.dirty?'o':'');sv.disabled=!d.ready||!ST.dirty;pub.disabled=!d.ready||!(ST.saved||ST.dirty)||!differs()}
 ST.badges=badges;
 sv.onclick=function(){saveDraft(function(){drawStudio(shell)})};
 pub.onclick=function(){var go=function(){if(!ST.ran&&m.agent==='gus'&&!confirm('You have not run the test pack on this draft. Publish anyway? This goes live to real customers straight away.'))return;if(ST.ran||m.agent!=='gus'){if(!confirm('Publish this version? It goes live straight away.'))return}publishNow(ST.draftId,'The new version')};if(ST.dirty)saveDraft(function(ok){if(ok)go()});else go()};
 head.appendChild(el('div','prof',null,[avatar(m,72),el('div','grow',null,[el('div','nm',m.name+' · '+m.role),el('div','sub',m.does),el('div','facts',null,[live,st])]),el('div','acts',null,[flowBtn(m),sv,pub])]));
 shell.appendChild(head);
 if(!d.ready){var bn=el('div','card');bn.style.marginTop='14px';bn.appendChild(el('h3',null,'One setup step'));bn.appendChild(el('div','sub','Saving and publishing need one table. Paste this in the Supabase SQL editor and run it, then reload. You can still chat with the builder and test changes meanwhile.'));var pre=el('pre',null,SQL7);bn.appendChild(pre);var cp=el('button','btn sm','Copy the SQL');cp.onclick=function(){try{navigator.clipboard.writeText(SQL7);toast('Copied')}catch(e){toast('Select the text and copy it')}};bn.appendChild(cp);shell.appendChild(bn)}
 var grid=el('div','studio');grid.style.marginTop='14px';
 // ---- left: the builder chat
 var chat=el('div','card chatcard');chat.appendChild(el('h3',null,'Tell '+m.name+' what to change'));
 var log=el('div','bchat');
 function say(kind,txt){log.appendChild(el('div','bb '+kind,txt));log.scrollTop=log.scrollHeight}
 say('bot','Hi, I am the builder for '+m.name+'. Describe how you want '+(m.agent==='gus'?'him':'them')+' to change in plain words, and I will show you exactly what I would change before anything is saved.');
 ST.chat.forEach(function(c){say(c.kind,c.txt)});
 chat.appendChild(log);
 var chips=el('div','chips');(m.agent==='gus'?['Make him funnier','Be more direct about closing','Shorter replies','Go softer on price pushback','Sound more like a local tradesman']:m.kind==='newsletter'?['Make it punchier','Open with something local','Shorter please','More of my voice','Lead with a tip']:m.agent==='dash'?['Be lighter touch','Mention the rain more','Shorter','Ask about their gutters instead']:m.kind==='blog'?['Pick a different topic','More local detail','Shorter post','Stronger title']:m.kind==='gmb'?['More local','Add an offer post','Shorter posts','Different photo ideas']:m.kind==='social'?['Funnier captions','More before and after posts','Add a video idea to each','Shorter captions','More local hashtags']:['Make it shorter','Focus more on cross selling','Be blunter about what is not working','Add a section on Lights']).forEach(function(t){var c=el('button','chip',t);c.onclick=function(){inp.value=t;sendBtn.click()};chips.appendChild(c)});chat.appendChild(chips);
 var inp=el('textarea');inp.placeholder='For example: be a bit more casual, and never mention the guards price';var sendBtn=el('button','btn pri','Ask');
 sendBtn.onclick=function(){var v=inp.value.trim();if(!v)return;inp.value='';ST.chat.push({kind:'me',txt:v});say('me',v);var w=el('div','bb bot','Working on it...');log.appendChild(w);sendBtn.disabled=true;
  api('/admin/dash/agent-edit',{agent:m.agent,request:v,instructions:ST.text}).then(function(r){w.remove();sendBtn.disabled=false;var card=el('div','bb bot');card.appendChild(el('div',null,r.summary));card.appendChild(diffView(ST.text,r.instructions));
    var ap=el('button','btn sm pri','Apply and save as draft'),ds=el('button','btn sm','Discard');ap.style.margin='10px 8px 0 0';
    ap.onclick=function(){ST.text=r.instructions;ST.dirty=true;ap.disabled=true;ds.remove();if(d.ready){saveDraft(function(ok){say('bot',ok?'Done. It is saved as a draft, and the live agent is not affected. Test it on the right, then Publish.':'I could NOT save that. It is not applied.');ST.tab='instructions';drawStudio(shell)})}else{say('bot','Applied to your working copy here. Run the setup step above to be able to save it.');ST.tab='instructions';drawStudio(shell)}};
    ds.onclick=function(){card.remove();say('bot','Okay, nothing changed.')};card.appendChild(ap);card.appendChild(ds);log.appendChild(card);log.scrollTop=log.scrollHeight;ST.chat.push({kind:'bot',txt:r.summary})}).catch(function(e){w.remove();sendBtn.disabled=false;say('bot','Nothing was changed. '+e.message)})};
 inp.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendBtn.click()}};
 chat.appendChild(el('div','compose',null,[inp,sendBtn]));grid.appendChild(chat);
 // ---- right: the tabs
 var right=el('div','card rightcard');var tabs=el('div','tabs2');
 [['instructions','Instructions'],['dials','Personality']].concat(m.agent==='gus'?[['coach','Mentor']]:[]).concat([['test','Test'],['versions','Versions'],['rules','Safety and knowledge']]).forEach(function(t){var b=el('button',ST.tab===t[0]?'on':'',t[1]);b.onclick=function(){ST.tab=t[0];drawStudio(shell)};tabs.appendChild(b)});var wt=el('button','','Workflow');wt.onclick=function(){flowBtn(m).click()};tabs.appendChild(wt);right.appendChild(tabs);
 var body=el('div','tbody');right.appendChild(body);grid.appendChild(right);shell.appendChild(grid);
 if(ST.tab==='instructions'){
  body.appendChild(el('div','sub','This is how '+m.name+' talks and sells. You can edit it by hand, or ask the builder on the left. The safety rules live in the code and cannot be edited here.'));
  var ta=el('textarea','big');ta.value=ST.text;ta.oninput=function(){ST.text=ta.value;ST.dirty=true;badges()};body.appendChild(ta);
  var row=el('div','btnrow');var rs=el('button','btn sm','Reset the draft to the built-in default');rs.onclick=function(){if(confirm('Replace the draft text with the built-in default?')){ST.text=d.defaultInstructions;ST.dirty=true;drawStudio(shell)}};
  var sd=el('button','btn sm','Show what changed from live');var dv=el('div');sd.onclick=function(){dv.textContent='';dv.appendChild(diffView(ST.live,ST.text))};row.appendChild(rs);row.appendChild(sd);body.appendChild(row);body.appendChild(dv)}
 if(ST.tab==='dials'){body.appendChild(el('div','sub','Quick dials. Each one adds a short instruction on top of the text. Changing a dial makes a draft, so nothing goes live until you publish.'));
  d.dialDefs.forEach(function(df){if(m.agent!=='gus'&&df.key!=='humor'&&df.key!=='length')return;var cur=df.key==='crossSell'?(ST.dials.crossSell===false?'off':'on'):(ST.dials[df.key]||(df.key==='humor'?'balanced':df.key==='length'?'short':'balanced'));
   var segc=el('div','seg2');df.options.forEach(function(o){var b=el('button',cur===o?'on':'',o);b.onclick=function(){if(df.key==='crossSell')ST.dials.crossSell=(o==='on');else ST.dials[df.key]=o;ST.dirty=true;drawStudio(shell)};segc.appendChild(b)});
   body.appendChild(el('div','set',null,[el('div','grow',null,[el('b',null,df.label),el('span',null,df.blurb)]),segc]))});
  if(m.kind){var rf=el('div');rf.style.marginTop='16px';rf.appendChild(el('b',null,'Reference: copy you already like'));rf.appendChild(el('div','sub','Paste your best newsletters, letters, funnel copy or posts from your other projects. '+m.name+' learns the voice, rhythm and structure from them. It never copies sentences and never takes prices or facts from them: facts only come from the knowledge base.'));
   var rt=el('textarea','big');rt.style.minHeight='220px';rt.placeholder='Paste examples here. A few strong ones are better than a lot.';rt.value=ST.dials.reference||'';rt.oninput=function(){ST.dials.reference=rt.value;ST.dirty=true;ST.badges()};rf.appendChild(rt);body.appendChild(rf)}}
 if(ST.tab==='test'){
  if(m.agent==='gus'){
   body.appendChild(el('div','sub','Try your draft before any customer sees it. Type as a customer, or run the test pack to see the live and draft versions side by side on tricky messages.'));
   var th=el('div','thread');th.style.cssText='height:240px;border-radius:12px;margin:12px 0';var facts={firstName:'Sam',address:{street1:'2752 Argolis Way',city:'Sacramento',province:'CA',postalCode:'95826'},opening:"Hi Sam, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single story home or $319 for two stories. Reply 1 or 2 and we'll text you a quote to approve and pay online. Reply STOP to opt out."},hist=[];th.appendChild(el('div','b out',facts.opening));
   var ta2=el('textarea');ta2.placeholder='Type as the customer and press Enter';ta2.style.cssText='flex:1;resize:none;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg);height:44px';
   function go2(){var v=ta2.value.trim();if(!v)return;ta2.value='';th.appendChild(el('div','b in',v));hist.push({role:'user',content:v});var w=el('div','meta','Thinking...');th.appendChild(w);th.scrollTop=th.scrollHeight;
    api('/admin/sim',{facts:facts,history:hist,instructions:ST.text,dials:ST.dials}).then(function(r){w.remove();hist.push({role:'assistant',content:r.output.reply});facts=r.facts;th.appendChild(el('div','b out',r.output.reply));th.appendChild(el('div','meta r','intent: '+r.output.intent));th.scrollTop=th.scrollHeight}).catch(function(e){w.textContent=e.message})}
   ta2.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go2()}};body.appendChild(th);body.appendChild(el('div','compose',null,[ta2]));
   var run=el('button','btn pri','Run the test pack (9 tricky messages, live against draft)');run.style.marginTop='14px';var res=el('div');res.style.marginTop='12px';
   function showPack(rs){res.textContent='';var bad=0;rs.forEach(function(r){var c=el('div','pk');var flag=function(x){return x.problems.length?el('span','tag r','Blocked: '+x.problems[0].slice(0,60)):el('span','tag g','Safe')};
    var same=r.live.reply===r.draft.reply;c.appendChild(el('div','nm',r.name,[el('span','tag',same?'same reply':'changed')]));c.appendChild(el('div','sub','Should: '+(r.expect||'')));
    var two=el('div','two');var a=el('div','col',null,[el('div','sub','LIVE ('+r.live.intent+')'),el('div',null,r.live.reply),flag(r.live)]),b2=el('div','col',null,[el('div','sub','DRAFT ('+r.draft.intent+')'),el('div',null,r.draft.reply),flag(r.draft)]);two.appendChild(a);two.appendChild(b2);c.appendChild(two);if(r.draft.problems.length)bad++;res.appendChild(c)});
    res.insertBefore(el('div','banner '+(bad?'bd':'ok'),bad?bad+' draft reply'+(bad>1?'ies were':' was')+' blocked by the safety rules. Fix before publishing.':'Every draft reply passed the safety rules.'),res.firstChild)}
   if(ST.pack)showPack(ST.pack);
   run.onclick=function(){run.disabled=true;run.textContent='Running... about 30 seconds';res.textContent='';api('/admin/dash/agent-testpack',{agent:'gus',instructions:ST.text,dials:ST.dials}).then(function(r){run.disabled=false;run.textContent='Run it again';ST.ran=true;ST.pack=r.results;showPack(r.results)}).catch(function(e){run.disabled=false;run.textContent='Run the test pack';res.appendChild(el('div','empty',e.message))})};
   body.appendChild(run);body.appendChild(res)}
  else if(m.kind){body.appendChild(el('div','sub','Write this week\'s copy with your draft. It uses the real knowledge base, the season and what is running now. Prices and links are checked before you see it. Nothing is sent or posted.'));
   var wb2=el('button','btn pri',m.kind==='newsletter'?'Write this week\'s newsletter':m.kind==='blog'?'Write this week\'s blog post':m.kind==='gmb'?'Write this week\'s Google posts':'Write this week\'s five posts');wb2.style.marginTop='12px';var co=el('div');co.style.marginTop='12px';
   wb2.onclick=function(){wb2.disabled=true;wb2.textContent='Writing...';co.textContent='';api('/admin/dash/content-draft',{agent:m.agent,instructions:ST.text,dials:ST.dials}).then(function(r){wb2.disabled=false;wb2.textContent='Write another version';ST.ran=true;
    co.appendChild(el('div','banner '+(r.problems.length?'bd':'ok'),r.problems.length?'Checks failed: '+r.problems.join(' '):'Checks passed: only real prices and approved links.'));var pr=el('pre',null,r.text);pr.style.maxHeight='none';pr.style.fontSize='14px';pr.style.lineHeight='1.55';co.appendChild(pr);
    var cp2=el('button','btn sm','Copy');cp2.onclick=function(){try{navigator.clipboard.writeText(r.text);toast('Copied')}catch(e){toast('Select the text and copy it')}};co.appendChild(cp2)}).catch(function(e){wb2.disabled=false;wb2.textContent='Try again';co.appendChild(el('div','empty',e.message))})};body.appendChild(wb2);body.appendChild(co)}
  else if(m.agent==='dash'){body.appendChild(el('div','sub','See what Dash would write with your draft, for two made up customers. Nothing is sent.'));
   var db=el('button','btn pri','Write two sample follow ups');db.style.marginTop='12px';var dout=el('div');dout.style.marginTop='12px';
   db.onclick=function(){db.disabled=true;db.textContent='Writing...';dout.textContent='';api('/admin/dash/dash-sample',{instructions:ST.text,dials:ST.dials}).then(function(r){db.disabled=false;db.textContent='Write two more';ST.ran=true;
    [['Never answered the offer',r.promo],['Sitting on a quote, mentioned an overflowing back gutter',r.quote]].forEach(function(x){dout.appendChild(el('div','pk',null,[el('div','sub',x[0]),el('div',null,x[1].text),el('span','tag '+(x[1].problems.length?'r':'g'),x[1].problems.length?'Blocked: '+x[1].problems[0]:'Safe')]))})}).catch(function(e){db.disabled=false;db.textContent='Try again';dout.appendChild(el('div','empty',e.message))})};body.appendChild(db);body.appendChild(dout)}
  else{body.appendChild(el('div','sub','See how your draft changes the report. It reads your real numbers and writes a sample. Nothing is sent to anyone.'));
   var wb=el('button','btn pri','Write a sample report with this draft');wb.style.marginTop='12px';var ro=el('div');ro.style.marginTop='12px';wb.onclick=function(){wb.disabled=true;wb.textContent='Writing...';ro.textContent='';api('/admin/dash/agent-sample'+accQ(),{instructions:ST.text,dials:ST.dials}).then(function(r){wb.disabled=false;wb.textContent='Write it again';ST.ran=true;var pr=el('pre',null,r.report);pr.style.maxHeight='none';ro.appendChild(pr)}).catch(function(e){wb.disabled=false;wb.textContent='Try again';ro.appendChild(el('div','empty',e.message))})};body.appendChild(wb);body.appendChild(ro)}}
 if(ST.tab==='coach'){body.appendChild(el('div','sub','The mentor reads the last two weeks of real conversations, compares the ones that went well with the ones that did not, and suggests specific changes. Nothing changes unless you draft, test and publish it.'));
  var cb=el('button','btn pri','Review recent conversations');cb.style.marginTop='12px';var co2=el('div');co2.style.marginTop='12px';
  function showCoach(r){co2.textContent='';co2.appendChild(el('div','banner '+(r.conversations?'ok':'wr'),'Reviewed '+r.conversations+' conversation'+(r.conversations===1?'':'s')+'. '+(r.note||'')));
   co2.appendChild(el('p',null,r.summary));
   [['What is working',r.working,'g'],['What is not',r.notWorking,'o']].forEach(function(x){if(!x[1].length)return;co2.appendChild(el('div','team',x[0]));x[1].forEach(function(t){co2.appendChild(el('div','row2',null,[el('span','tag '+x[2],x[2]==='g'?'Keep':'Fix'),el('div','grow',t)]))})});
   if(r.suggestions.length)co2.appendChild(el('div','team','Suggested changes'));
   r.suggestions.forEach(function(sg){var b=el('button','btn sm pri','Draft this change');b.onclick=function(){inp.value=sg.change;sendBtn.click();toast('Sent to the builder on the left')};
    co2.appendChild(el('div','pk',null,[el('div','nm',sg.change),el('div','sub',sg.why),sg.evidence?el('div','tnote',sg.evidence):null,(function(){var w=el('div');w.style.marginTop='10px';w.appendChild(b);return w})()]))})}
  if(ST.coach)showCoach(ST.coach);
  cb.onclick=function(){cb.disabled=true;cb.textContent='Reading conversations...';co2.textContent='';api('/admin/dash/agent-coach').then(function(r){cb.disabled=false;cb.textContent='Review again';ST.coach=r;showCoach(r)}).catch(function(e){cb.disabled=false;cb.textContent='Try again';co2.appendChild(el('div','empty',e.message))})};
  var hb=el('button','btn','Head start: learn from your GHL history');hb.style.cssText='margin:12px 0 0 10px';
  hb.onclick=function(){hb.disabled=true;cb.disabled=true;co2.textContent='';var batches=[],total=0,page=0,PAGES=5;
   function step(before){page++;hb.textContent='Reading your GHL history, part '+page+' of '+PAGES+'...';
    api('/admin/dash/agent-coach-history'+(before?'?before='+before:'')).then(function(r){if(r.conversations){batches.push({summary:r.summary,working:r.working,notWorking:r.notWorking,suggestions:r.suggestions});total+=r.conversations}
     if(page<PAGES&&r.next){step(r.next)}else finish()}).catch(function(e){if(batches.length)finish();else{hb.disabled=false;cb.disabled=false;hb.textContent='Try the head start again';co2.appendChild(el('div','empty',e.message))}})}
   function finish(){hb.textContent='Putting it together...';api('/admin/dash/agent-coach-merge',{batches:batches,total:total}).then(function(r){hb.disabled=false;cb.disabled=false;hb.textContent='Run the head start again';r.note='From your GHL history: Clark, the team and the old bots.';ST.coach=r;showCoach(r)}).catch(function(e){hb.disabled=false;cb.disabled=false;hb.textContent='Try the head start again';co2.appendChild(el('div','empty',e.message))})}
   step(0)};
  body.appendChild(cb);body.appendChild(hb);body.appendChild(co2)}
 if(ST.tab==='versions'){body.appendChild(el('div','sub','Every published version is kept. Make any of them live again with one click.'));
  var cur=el('div','row2',null,[el('div','grow',null,[el('b',null,'Built-in default'),el('div','sub','The original instructions that came with '+m.name+'.')]),(function(){var b=el('button','btn sm','Use as draft');b.onclick=function(){ST.text=d.defaultInstructions;ST.dials={};ST.dirty=true;ST.tab='instructions';drawStudio(shell)};return b})()]);body.appendChild(cur);
  if(!d.versions.length)body.appendChild(el('div','empty','No versions published yet.'));
  d.versions.forEach(function(v){var vb=el('button','btn sm','View');var mb=el('button','btn sm',v.status==='published'?'Live now':'Make live');mb.disabled=v.status==='published';var out=el('div');
   vb.onclick=function(){api('/admin/dash/agent-version?id='+encodeURIComponent(v.id)).then(function(r){out.textContent='';out.appendChild(diffView(ST.live,r.instructions));out.insertBefore(el('div','sub','Compared with what is live now:'),out.firstChild)})};
   mb.onclick=function(){if(confirm('Make version '+v.n+' live again? It goes live straight away.'))publishNow(v.id,'Version '+v.n)};
   body.appendChild(el('div','row2',null,[el('div','grow',null,[el('b',null,'Version '+v.n),el('div','sub',(v.publishedAt?'Published '+ago(v.publishedAt):'Saved '+ago(v.createdAt))),out]),el('span','tag '+(v.status==='published'?'g':''),v.status==='published'?'Live':'Earlier'),vb,mb]))})}
 if(ST.tab==='rules'){body.appendChild(el('div','sub','These are locked in the code. No instruction, draft or builder request can switch them off.'));
  d.safety.forEach(function(r){body.appendChild(el('div','row2',null,[el('div','lock','🔒'),el('div','grow',r)]))});
  var kb=el('button','btn sm','Show what '+m.name+' knows');var kp=el('pre');kp.style.display='none';kb.style.marginTop='14px';kb.onclick=function(){if(kp.style.display==='none'){api('/admin/dash/agents').then(function(r){kp.textContent=r.knowledge;kp.style.display='block';kb.textContent='Hide'})}else{kp.style.display='none';kb.textContent='Show what '+m.name+' knows'}};body.appendChild(kb);body.appendChild(kp)}
 badges()}


var LANECOL={live:'var(--brand)',now:'var(--bad)',next:'var(--warn)',soon:'var(--blue)',later:'var(--mute)'};
var RAREA='all';
function vRoadmap(p){api('/admin/dash/roadmap').then(function(d){
 var total=d.items.length,built=d.items.filter(function(i){return i.lane==='live'}).length,pct=Math.round(built/total*100);
 var hero=el('div','card');hero.appendChild(el('h3',null,'The road so far'));
 var line=el('div','fun');line.style.gridTemplateColumns='1fr auto';var bar=el('div','bar');var fill=el('i');fill.style.width=pct+'%';bar.appendChild(fill);line.appendChild(bar);line.appendChild(el('b',null,built+' of '+total+' built'));hero.appendChild(line);
 var j=el('div','journey');d.lanes.forEach(function(l,ix){var n=d.items.filter(function(i){return i.lane===l.key}).length;var st=el('div','jstep',null,[(function(){var o=el('div','jdot',String(n));o.style.background=LANECOL[l.key];return o})(),el('div','jt',l.title),el('div','sub',l.blurb)]);j.appendChild(st);if(ix<d.lanes.length-1)j.appendChild(el('div','jline'))});hero.appendChild(j);p.appendChild(hero);
 var chips=el('div','chips');chips.style.marginTop='16px';['all','Sales','Marketing','Platform','Safety'].forEach(function(a){var c=el('button','chip'+(RAREA===a?' on':''),a==='all'?'Everything':a);c.onclick=function(){RAREA=a;render()};chips.appendChild(c)});p.appendChild(chips);
 var lanes=el('div','lanes');
 d.lanes.forEach(function(l){var items=d.items.filter(function(i){return i.lane===l.key&&(RAREA==='all'||i.area===RAREA)});
  var col=el('div','lane');var hd=el('div','lhead',null,[el('b',null,l.title),el('span','tag',String(items.length))]);hd.style.borderTop='4px solid '+LANECOL[l.key];col.appendChild(hd);col.appendChild(el('div','sub lb',l.blurb));
  if(!items.length)col.appendChild(el('div','empty','Nothing here for this filter.'));
  items.forEach(function(i){var det=el('div','rdet',i.detail);det.style.display='none';
   var card=el('div','rcard',null,[el('div','rtop',null,[el('span','remo',i.emoji),el('div','grow',null,[el('div','nm',i.title),i.who?el('div','sub2',i.who):null]),el('span','tag',i.area)]),det]);
   card.onclick=function(){det.style.display=det.style.display==='none'?'block':'none'};col.appendChild(card)});
  lanes.appendChild(col)});
 p.appendChild(lanes);
 var tb=el('div','card');tb.style.marginTop='16px';tb.appendChild(el('h3',null,'Toolbox: what the social and video agents will need'));tb.appendChild(el('div','sub','Free and open source tools, plus the ones you already pay for. Nothing here is installed yet. Click a name to see it.'));
 var groups=[];(d.tools||[]).forEach(function(t){if(groups.indexOf(t.group)<0)groups.push(t.group)});
 groups.forEach(function(g){tb.appendChild(el('div','team',g));var grid=el('div','sysgrid');(d.tools||[]).filter(function(t){return t.group===g}).forEach(function(t){
  var a=el('a','tname',t.name);a.href=t.url;a.target='_blank';a.rel='noopener';
  var c=el('div','mcard sys tool',null,[el('div','grow',null,[el('div','nm',null,[a,el('span','tag '+(t.cost==='Have it'?'g':t.cost==='Free'?'b':'o'),t.cost)]),el('div','sub2',t.what),t.note?el('div','tnote',t.note):null])]);grid.appendChild(c)});tb.appendChild(grid)});
 p.appendChild(tb)}).catch(function(e){p.appendChild(el('div','empty',e.message))})}
function vSettings(p){api('/admin/dash/settings').then(function(d){
 if(!d.ready)p.appendChild(el('div','banner wr','These switches cannot save yet. '+(d.error||'Run supabase/006_settings.sql in the Supabase SQL editor, then reload.')));
 var groups={};d.defs.forEach(function(x){(groups[x.group]=groups[x.group]||[]).push(x)});
 Object.keys(groups).forEach(function(gname){var c=el('div','card');c.style.marginBottom='16px';c.appendChild(el('h3',null,gname));
  groups[gname].forEach(function(x){var val=d.values[x.key],ctl;
   function save(v){api('/admin/dash/settings',{key:x.key,value:String(v)}).then(function(){toast('Saved');load()}).catch(function(e){toast(e.message)})}
   if(x.type==='toggle'){var lab=el('label','sw');var i=el('input');i.type='checkbox';i.checked=val==='true';i.onchange=function(){save(i.checked)};lab.appendChild(i);lab.appendChild(el('span'));ctl=lab}
   else if(x.type==='select'){ctl=el('select');x.options.forEach(function(o){var op=el('option',null,o);op.value=o;if(o===val)op.selected=true;ctl.appendChild(op)});ctl.onchange=function(){save(ctl.value)}}
   else{ctl=el('input');ctl.type=x.type==='number'?'number':'text';ctl.value=val;ctl.onchange=function(){save(ctl.value)}}
   c.appendChild(el('div','set',null,[el('div','grow',null,[el('b',null,x.label),el('span',null,x.help)]),ctl]))});p.appendChild(c)});aiKeyCard(p)})}
function aiKeyCard(p){var hd=el('div','card');hd.style.marginBottom='16px';hd.appendChild(el('h3',null,'Connections'));hd.appendChild(el('div','sub','The outside systems the agents work with. Paste a key to connect one. Every key is tested before it is saved, stored encrypted, and never shown again. A key saved here is used in place of the one set in Cloudflare.'));p.appendChild(hd);
 var box=el('div');p.appendChild(box);var CHK={'ghl-dunzo':['ghlDunzo'],'ghl-lights':['ghlLights'],'jobber':['jobberDunzo','jobberLights'],'quo':['quo']};var checks=null;
 function draw(d){box.textContent='';d.connections.forEach(function(c){var card=el('div','card');card.style.marginBottom='16px';card.appendChild(el('h3',null,c.title));
   var have=c.fields.every(function(f){return f.source!=='none'}),res=(CHK[c.id]||[]).map(function(k){return checks?checks[k]:undefined}),bad=res.filter(function(r){return r&&r!=='ok'}),ok=res.length&&res.every(function(r){return r==='ok'});
   var tone=!have?(c.need?'bd':'wr'):bad.length?'bd':'ok';
   var head=!have?c.name+' is not connected':bad.length?c.name+' has a problem':(ok?c.name+' is connected and working':c.name+' is connected');
   var sub=!have?(c.need?'Needed for the agents to work.':'Optional.'):bad.length?bad.join(' '):(res.length&&!ok?'Checking...':'');
   card.appendChild(el('div','banner '+tone,null,[el('div','t',head,[el('small',null,sub)])]));
   card.appendChild(el('div','sub',c.help));
   var ins={};c.fields.forEach(function(f){var i=el('input');i.type=f.secret?'password':'text';i.placeholder=f.ph;i.autocomplete='off';i.style.minWidth='260px';ins[f.env]=i;
    var cur=f.source==='none'?'Not set.':(f.source==='dashboard'?'Saved here':'Set in Cloudflare')+(f.shown?', '+(f.secret?f.shown:'value '+f.shown):'')+'.';
    card.appendChild(el('div','set',null,[el('div','grow',null,[el('b',null,f.label),el('span',null,cur)]),i]))});
   var sv=el('button','btn pri','Save and test');sv.onclick=function(){var vals={},n=0;c.fields.forEach(function(f){var v=ins[f.env].value.trim();if(v){vals[f.env]=v;n++}});if(!n)return toast('Paste a value first');
    if(have&&c.id!=='quo'&&!confirm('Replace the '+c.title+' details? They are tested first, and nothing changes if the test fails.'))return;
    sv.disabled=true;sv.textContent='Testing with '+c.name+'...';api('/admin/dash/connection',{id:c.id,values:vals}).then(function(r){toast('Saved and working');draw(r);recheck()}).catch(function(e){toast(e.message);sv.disabled=false;sv.textContent='Save and test'})};
   var acts=el('div','set',null,[el('div','grow'),sv]);
   if(c.fields.some(function(f){return f.source==='dashboard'})){var rm=el('button','btn','Remove saved');rm.onclick=function(){if(!confirm('Remove the '+c.title+' details saved here? It goes back to whatever is set in Cloudflare.'))return;api('/admin/dash/connection',{id:c.id,remove:true}).then(function(r){toast('Removed');draw(r);recheck()}).catch(function(e){toast(e.message)})};acts.insertBefore(rm,sv)}
   card.appendChild(acts);
   if(c.id==='jobber'&&have){[['dunzo','Dunzo Gutters','jobberDunzo'],['lights','Santa\'s Lights','jobberLights']].forEach(function(a){var st=checks?checks[a[2]]:undefined;var b=el('button','btn',st==='ok'?'Reconnect':'Connect');b.onclick=function(){window.open('/admin/jobber/connect?key='+encodeURIComponent(T)+'&account='+a[0],'_blank')};
     card.appendChild(el('div','set',null,[el('div','grow',null,[el('b',null,a[1]+' Jobber account'),el('span',null,st==='ok'?'Connected and working.':st?'Not connected: press Connect and approve it in Jobber, then come back and refresh.':'Checking...')]),b]))})}
   box.appendChild(card)});
  var db=el('div','card');db.style.marginBottom='16px';db.appendChild(el('h3',null,'Database (Supabase)'));db.appendChild(el('div','banner ok',null,[el('div','t','Supabase is connected',[el('small',null,'These settings are stored in it, so its own keys stay in Cloudflare and cannot be changed from this page.')])]));box.appendChild(db)}
 var last=null;function recheck(){api('/admin/dash/systems').then(function(r){checks=r.checks;if(last)draw(last)}).catch(function(){})}
 api('/admin/dash/connections').then(function(d){last=d;draw(d);recheck()}).catch(function(e){box.appendChild(el('div','empty',e.message))});
 var _draw=draw;draw=function(d){last=d;_draw(d)}}
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
$('refresh').onclick=function(){render()};
var SUN='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>';
var MOON='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
function theme(t){document.documentElement.setAttribute('data-theme',t);$('theme').innerHTML=t==='dark'?SUN:MOON;$('theme').title=t==='dark'?'Switch to light':'Switch to dark'}
var saved=null;try{saved=localStorage.getItem('theme')}catch(e){}
theme(saved||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'));
$('theme').onclick=function(){var t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';theme(t);try{localStorage.setItem('theme',t)}catch(e){}};$('lock').onclick=lock;
function start(){$('gate').classList.remove('on');$('app').style.display='grid';seg();go(view)}
$('enter').onclick=function(){var v=$('tok').value.trim();if(!v)return;T=v;$('gerr').textContent='';api('/admin/dash/overview').then(function(){sessionStorage.setItem('t',T);start()}).catch(function(e){$('gerr').textContent=e.message==='Wrong token'?'That token is not right.':e.message;lock()})};
$('tok').onkeydown=function(e){if(e.key==='Enter')$('enter').onclick()};
if(T){api('/admin/dash/overview').then(start).catch(function(){lock()})}else{lock()}
</script></body></html>`;
