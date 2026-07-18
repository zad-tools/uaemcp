export function toolExplorerPage(): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#10271f">
  <meta name="description" content="Inspect and run every Open Emirates Intelligence MCP tool.">
  <title>MCP Tools Explorer / Developer Console / Open Emirates</title>
  <style>
    @font-face{font-family:"Dubai";src:url("/assets/fonts/Dubai-Regular.woff") format("woff");font-weight:400;font-display:swap}
    @font-face{font-family:"Dubai";src:url("/assets/fonts/Dubai-Bold.woff") format("woff");font-weight:700;font-display:swap}
    :root{--paper:#f1eddf;--paper-2:#e8e2d2;--ink:#10271f;--forest:#173d2d;--red:#c34032;--gold:#c6a45f;--muted:#65736b;--line:rgba(16,39,31,.24);--soft-line:rgba(241,237,223,.22)}
    *{box-sizing:border-box}
    html,body{min-height:100%;background:var(--paper)}
    html body,html body *{font-family:"Dubai",Arial,sans-serif!important}
    body{margin:0;color:var(--ink);overflow-x:hidden}
    button,input,textarea,select{font:inherit;color:inherit}
    button,a{color:inherit}
    code,pre,textarea.json-editor{font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important}
    button{border-radius:0}
    .top{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 22px;position:sticky;top:0;background:var(--paper);z-index:20}
    .brand{display:flex;align-items:center;gap:12px;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:.1em;white-space:nowrap}
    .brand-mark{width:22px;height:22px;background:var(--forest);color:var(--paper);display:grid;place-items:center;letter-spacing:0;font-size:9px}
    .top nav{display:flex;align-items:center;height:100%}
    .top nav a,.top nav button{height:100%;padding:0 14px;border:0;border-inline-start:1px solid var(--line);background:transparent;text-decoration:none;font-size:10px;font-weight:700;cursor:pointer}
    .top nav a:hover,.top nav button:hover{background:var(--paper-2)}
    .intro{min-height:168px;display:grid;grid-template-columns:minmax(0,1fr) 220px;border-bottom:1px solid var(--line)}
    .intro-copy{padding:28px 32px;display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
    .intro h1{font-size:clamp(32px,4.1vw,58px);line-height:.94;letter-spacing:-.04em;margin:0;max-width:720px}
    .intro p{margin:0;max-width:330px;color:var(--muted);font-size:15px;line-height:1.45}
    .contract-stat{background:var(--forest);color:var(--paper);padding:24px;display:flex;flex-direction:column;justify-content:space-between}
    .contract-stat span,.section-label{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .contract-stat strong{font-size:66px;line-height:.8;color:var(--gold)}
    .contract-stat small{font-size:10px;color:#bfd0c7}
    .console{height:calc(100dvh - 226px);min-height:620px;display:grid;grid-template-columns:300px minmax(430px,1fr) minmax(330px,36vw);border-bottom:1px solid var(--line)}
    .tool-rail{min-width:0;border-inline-end:1px solid var(--line);display:flex;flex-direction:column;background:var(--paper)}
    .rail-controls{padding:14px;border-bottom:1px solid var(--line)}
    .search-row{display:grid;grid-template-columns:1fr 38px}
    .search-row input{height:40px;width:100%;border:1px solid var(--ink);background:transparent;padding:0 12px;outline:none;font-size:13px}
    .search-row span{height:40px;background:var(--ink);color:var(--paper);display:grid;place-items:center;font:11px ui-monospace,SFMono-Regular,monospace!important}
    .filters{display:flex;margin-top:9px}
    .filter{flex:1;height:30px;border:1px solid var(--line);border-inline-end:0;background:transparent;font-size:8px;font-weight:700;cursor:pointer}
    .filter:last-child{border-inline-end:1px solid var(--line)}
    .filter.active{background:var(--red);border-color:var(--red);color:#fff}
    .ledger{overflow:auto;min-height:0;scrollbar-width:thin}
    .tool{width:100%;min-height:57px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;text-align:start;border:0;border-bottom:1px solid var(--line);background:transparent;padding:11px 14px;cursor:pointer}
    .tool:hover{background:var(--paper-2)}
    .tool.active{background:var(--forest);color:var(--paper)}
    .tool code{font-size:11px;font-weight:700;overflow-wrap:anywhere;line-height:1.35}
    .tool-kind{font-size:7px;letter-spacing:.08em;text-transform:uppercase;color:var(--red)}
    .tool.active .tool-kind{color:var(--gold)}
    .mobile-picker{display:none;padding:12px;border-bottom:1px solid var(--line);background:var(--paper)}
    .mobile-picker select{width:100%;height:44px;border:1px solid var(--ink);background:var(--paper);padding:0 10px}
    .tool-contract{min-width:0;overflow:auto;background:var(--paper)}
    .detail-empty,.state{padding:24px;color:var(--muted)}
    .detail-head{padding:24px 26px 20px;border-bottom:1px solid var(--line)}
    .title-line{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
    .detail-head h2{font-size:clamp(28px,3vw,46px);line-height:1;letter-spacing:-.035em;margin:8px 0 10px;overflow-wrap:anywhere}
    .detail-head>code{font-size:11px;color:var(--red)}
    .detail-head p{font-size:14px;line-height:1.5;color:var(--muted);margin:16px 0 0;max-width:720px}
    .kind-flag{min-width:72px;border:1px solid var(--ink);padding:7px 10px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase}
    .meta{display:grid;grid-template-columns:repeat(4,1fr);margin-top:20px;border:1px solid var(--line)}
    .meta span{padding:9px 10px;font-size:8px;font-weight:700;border-inline-end:1px solid var(--line)}
    .meta span:last-child{border-inline-end:0}
    .detail-tabs{height:43px;display:flex;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--paper);z-index:3}
    .detail-tab{padding:0 18px;border:0;border-inline-end:1px solid var(--line);background:transparent;font-size:9px;font-weight:700;cursor:pointer}
    .detail-tab.active{background:var(--ink);color:var(--paper)}
    .tab-panel{padding:22px 26px 32px}
    .tab-panel[hidden]{display:none}
    .argument-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid var(--line);border-inline-start:1px solid var(--line)}
    .argument{min-height:96px;padding:14px;border-inline-end:1px solid var(--line);border-bottom:1px solid var(--line)}
    .argument strong{font:11px ui-monospace,SFMono-Regular,monospace!important;overflow-wrap:anywhere}
    .argument small{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:7px}
    .argument b{display:block;color:var(--red);font-size:7px;letter-spacing:.08em;margin-top:10px}
    .limitation{border-inline-start:4px solid var(--red);padding:11px 13px;color:var(--muted);font-size:12px;line-height:1.5;margin-top:18px}
    .schema{margin:0;background:var(--ink);color:#dfe9e4;padding:18px;white-space:pre-wrap;overflow:auto;font-size:11px;line-height:1.6;max-height:520px}
    .result-dock{min-width:0;background:var(--forest);color:var(--paper);display:flex;flex-direction:column;border-inline-start:1px solid var(--ink)}
    .dock-head{min-height:52px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--soft-line)}
    .dock-head span{font-size:9px;font-weight:700;letter-spacing:.1em}
    .dock-head button{border:1px solid var(--soft-line);background:transparent;color:inherit;padding:7px 10px;font-size:8px;cursor:pointer}
    .editor-wrap{padding:16px;border-bottom:1px solid var(--soft-line)}
    .editor-wrap label,.result-label{display:block;font-size:9px;font-weight:700;letter-spacing:.08em;margin-bottom:9px;color:var(--gold)}
    .json-editor{width:100%;height:190px;display:block;border:1px solid var(--soft-line);background:var(--ink);color:#dfe9e4;padding:14px;resize:vertical;font-size:11px;line-height:1.55;outline:none}
    .json-editor:focus{border-color:var(--gold)}
    .actions{display:grid;grid-template-columns:1fr auto;margin-top:10px}
    .action{height:42px;border:1px solid var(--soft-line);background:transparent;color:var(--paper);padding:0 15px;font-size:9px;font-weight:700;cursor:pointer}
    .action.primary{background:var(--red);border-color:var(--red);color:#fff}
    .action:disabled{opacity:.45;cursor:not-allowed}
    .result-wrap{min-height:0;flex:1;padding:16px;display:flex;flex-direction:column}
    .result{flex:1;min-height:220px;margin:0;background:var(--ink);color:#dfe9e4;padding:14px;white-space:pre-wrap;overflow:auto;font-size:11px;line-height:1.55}
    .config-drawer{position:fixed;inset:58px 0 0 auto;width:min(540px,100%);background:var(--forest);color:var(--paper);z-index:30;transform:translateX(102%);transition:transform .2s ease;border-inline-start:1px solid var(--ink);display:flex;flex-direction:column}
    [dir="rtl"] .config-drawer{inset:58px auto 0 0;transform:translateX(-102%)}
    .config-drawer.open{transform:translateX(0)}
    .drawer-head{height:70px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--soft-line)}
    .drawer-head h2{font-size:22px;margin:0}
    .drawer-head button{border:1px solid var(--soft-line);background:transparent;color:inherit;width:36px;height:36px;cursor:pointer}
    .config-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--soft-line)}
    .config-tab{height:46px;border:0;border-inline-end:1px solid var(--soft-line);border-bottom:1px solid var(--soft-line);background:transparent;color:inherit;font-size:9px;cursor:pointer}
    .config-tab.active{background:var(--gold);color:var(--ink)}
    .config-box{margin:20px;border:1px solid var(--soft-line)}
    .config-box pre{min-height:180px;padding:18px;margin:0;overflow:auto;white-space:pre-wrap;font-size:11px;line-height:1.6}
    .copy{width:100%;height:44px;border:0;border-top:1px solid var(--soft-line);background:var(--red);color:#fff;font-size:9px;font-weight:700;cursor:pointer}
    .drawer-scrim{position:fixed;inset:58px 0 0;background:rgba(16,39,31,.4);z-index:29;display:none}
    .drawer-scrim.open{display:block}
    :focus-visible{outline:3px solid var(--red);outline-offset:2px}
    @media(max-width:1100px){.console{grid-template-columns:260px minmax(390px,1fr) 330px}.intro-copy{align-items:flex-start;flex-direction:column;gap:12px}.intro{min-height:190px}.console{height:calc(100dvh - 248px)}}
    @media(max-width:860px){.intro{grid-template-columns:1fr 128px;min-height:148px}.intro-copy{padding:22px}.intro p{font-size:13px}.contract-stat{padding:18px}.contract-stat strong{font-size:48px}.console{height:auto;min-height:calc(100dvh - 206px);grid-template-columns:1fr}.tool-rail{display:none}.mobile-picker{display:block;position:sticky;top:58px;z-index:8}.tool-contract{overflow:visible}.result-dock{border-inline-start:0;border-top:1px solid var(--ink);min-height:520px}.meta{grid-template-columns:repeat(2,1fr)}.meta span:nth-child(2){border-inline-end:0}.meta span:nth-child(-n+2){border-bottom:1px solid var(--line)}}
    @media(max-width:560px){.top{padding:0 12px}.brand span:last-child{display:none}.top nav a{display:none}.top nav button{padding:0 10px}.intro{grid-template-columns:1fr}.intro-copy{min-height:150px}.intro p{display:none}.contract-stat{min-height:72px;display:grid;grid-template-columns:1fr auto;align-items:center}.contract-stat strong{font-size:38px}.contract-stat small{display:none}.detail-head{padding:20px 16px}.title-line{gap:12px}.detail-head h2{font-size:32px}.tab-panel{padding:18px 16px 26px}.argument-grid{grid-template-columns:1fr}.detail-tab{flex:1;padding:0 8px}.editor-wrap,.result-wrap{padding:14px}.config-tabs{grid-template-columns:repeat(2,1fr)}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body data-console-layout="true">
  <header class="top">
    <a class="brand" href="/"><span class="brand-mark">OE</span><span>OPEN EMIRATES / MCP CONSOLE</span></a>
    <nav><a href="/">HOME</a><a href="/openapi.json">OPENAPI</a><button id="open-config" type="button">CONNECT</button><button id="lang" type="button">العربية</button></nav>
  </header>
  <main>
    <section class="intro">
      <div class="intro-copy">
        <h1 data-en="Inspect and run every MCP tool." data-ar="افحص وجرّب كل أدوات MCP.">Inspect and run every MCP tool.</h1>
        <p data-en="A complete MCP Developer Console with live schemas, safe execution and client configuration." data-ar="وحدة مطور MCP كاملة بمخططات حية، وتشغيل آمن، وإعدادات جاهزة للعملاء.">A complete MCP Developer Console with live schemas, safe execution and client configuration.</p>
      </div>
      <div class="contract-stat"><span>LIVE CONTRACT</span><strong id="total">--</strong><small>runtime tools</small></div>
    </section>
    <div class="mobile-picker"><select id="mobile-tool-picker" aria-label="Select a tool"><option>Loading tools...</option></select></div>
    <section class="console" id="playground">
      <aside class="tool-rail">
        <div class="rail-controls">
          <div class="search-row"><input id="search" type="search" placeholder="Search tools" aria-label="Search tools"><span id="visible-count">--</span></div>
          <div class="filters"><button class="filter active" data-kind="all">ALL</button><button class="filter" data-kind="read">READ</button><button class="filter" data-kind="write">WRITE</button><button class="filter" data-kind="mixed">MIXED</button></div>
        </div>
        <div id="ledger" class="ledger" aria-live="polite"><div class="state">Loading runtime contract...</div></div>
      </aside>
      <article id="detail" class="tool-contract"><div class="detail-empty">Select a tool to inspect its runtime contract.</div></article>
      <aside id="result-dock" class="result-dock"><div class="state">Select a tool to prepare the playground.</div></aside>
    </section>
  </main>
  <div id="drawer-scrim" class="drawer-scrim"></div>
  <aside id="config-drawer" class="config-drawer" aria-hidden="true">
    <div class="drawer-head"><h2>Agent configuration</h2><button id="close-config" type="button" aria-label="Close configuration">X</button></div>
    <div id="config-tabs" class="config-tabs"></div>
    <div class="config-box"><pre id="config"></pre><button id="copy-config" class="copy" type="button">COPY CONFIGURATION</button></div>
  </aside>
  <script>
    const state={lang:'en',kind:'all',query:'',catalog:null,selected:null,client:'Claude Code',tab:'overview'};
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const pretty=v=>JSON.stringify(v,null,2);
    const configs={
      'Claude Code':'claude mcp add --transport http uae-intelligence https://uaemcp.zad.tools/mcp',
      'Claude Desktop':pretty({mcpServers:{'uae-intelligence':{command:'bunx',args:['--bun','uaemcp@latest']}}}),
      'Cursor':pretty({mcpServers:{'uae-intelligence':{url:'https://uaemcp.zad.tools/mcp'}}}),
      'Codex':'[mcp_servers.uae-intelligence]\\nurl = "https://uaemcp.zad.tools/mcp"',
      'n8n':'MCP Client Tool\\nTransport: Streamable HTTP\\nURL: https://uaemcp.zad.tools/mcp',
      'Windmill':'MCP resource\\nName: uae-intelligence\\nTransport: Streamable HTTP\\nURL: https://uaemcp.zad.tools/mcp'
    };
    function filtered(){return state.catalog.tools.filter(t=>(state.kind==='all'||t.kind===state.kind)&&(t.name+' '+t.description).toLowerCase().includes(state.query))}
    function renderList(){
      const tools=filtered(),target=document.querySelector('#ledger');
      document.querySelector('#visible-count').textContent=tools.length;
      target.innerHTML=tools.length?tools.map(t=>'<button class="tool '+(state.selected?.name===t.name?'active':'')+'" data-tool="'+esc(t.name)+'"><code>'+esc(t.name)+'</code><span class="tool-kind">'+esc(t.kind)+'</span></button>').join(''):'<div class="state">No matching tools.</div>';
      target.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool,true)));
    }
    function renderPicker(){
      const picker=document.querySelector('#mobile-tool-picker');
      picker.innerHTML=state.catalog.tools.map(t=>'<option value="'+esc(t.name)+'" '+(state.selected?.name===t.name?'selected':'')+'>'+esc(t.name)+'</option>').join('');
    }
    function fieldHelp(schema){
      const props=schema.properties||{},required=new Set(schema.required||[]);
      return Object.entries(props).map(([name,value])=>'<div class="argument"><strong>'+esc(name)+'</strong><small>'+esc(value.description||value.type||'Value')+'</small><b>'+(required.has(name)?'REQUIRED':'OPTIONAL')+(value.enum?' / '+value.enum.map(esc).join(' | '):'')+(value.minimum!==undefined?' / MIN '+esc(value.minimum):'')+(value.maximum!==undefined?' / MAX '+esc(value.maximum):'')+'</b></div>').join('')||'<div class="argument"><strong>No arguments</strong><small>This tool runs without input.</small><b>READY</b></div>';
    }
    function renderDetail(){
      const t=state.selected;if(!t)return;
      document.querySelector('#detail').innerHTML='<div class="detail-head"><div class="title-line"><div><span class="section-label">TOOL CONTRACT</span><h2>'+esc(t.title)+'</h2><code>'+esc(t.name)+'</code></div><span class="kind-flag">'+esc(t.kind)+'</span></div><p>'+esc(t.description)+'</p><div class="meta"><span>'+(t.requiresAuth?'AUTH REQUIRED':'PUBLIC READ')+'</span><span>'+esc(t.execution.timeoutMs/1000)+'S TIMEOUT</span><span>'+esc(Math.round(t.execution.maxResultBytes/1000))+'KB CAP</span><span>'+(t.browserPlayable?'PLAYABLE':'GUARDED')+'</span></div></div><div class="detail-tabs"><button class="detail-tab active" data-tab="overview">OVERVIEW</button><button class="detail-tab" data-tab="schema">INPUT SCHEMA</button><button class="detail-tab" data-tab="example">EXAMPLE</button></div><section class="tab-panel" data-panel="overview"><div class="argument-grid">'+fieldHelp(t.inputSchema)+'</div><div class="limitation">'+esc(t.limitations.join(' '))+'</div></section><section class="tab-panel" data-panel="schema" hidden><pre class="schema">'+esc(pretty(t.inputSchema))+'</pre></section><section class="tab-panel" data-panel="example" hidden><pre class="schema">'+esc(pretty(t.exampleArguments))+'</pre></section>';
      document.querySelectorAll('.detail-tab').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
      renderDock();
    }
    function renderDock(){
      const t=state.selected;
      document.querySelector('#result-dock').innerHTML='<div class="dock-head"><span>LIVE PLAYGROUND</span><button id="copy-example" type="button">COPY JSON</button></div><div class="editor-wrap"><label for="arguments">ARGUMENTS</label><textarea id="arguments" class="json-editor" spellcheck="false">'+esc(pretty(t.exampleArguments))+'</textarea><div class="actions"><button id="run" class="action primary" '+(t.browserPlayable?'':'disabled')+'>TRY TOOL</button><button id="reset-example" class="action">RESET</button></div></div><div class="result-wrap"><span class="result-label">RESULT</span><pre id="result" class="result">'+(t.browserPlayable?'Ready. Run the tool to inspect its cited response.':'This write-capable tool is disabled in the public browser playground.')+'</pre></div>';
      document.querySelector('#copy-example').addEventListener('click',()=>navigator.clipboard.writeText(document.querySelector('#arguments').value));
      document.querySelector('#reset-example').addEventListener('click',()=>{document.querySelector('#arguments').value=pretty(t.exampleArguments)});
      if(t.browserPlayable)document.querySelector('#run').addEventListener('click',runTool);
    }
    function setTab(tab){state.tab=tab;document.querySelectorAll('.detail-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab)}
    async function selectTool(name,push){const tool=state.catalog.tools.find(t=>t.name===name);if(!tool)return;state.selected=tool;renderList();renderPicker();renderDetail();if(push)history.pushState({},'', '/tools/'+encodeURIComponent(name))}
    async function runTool(){const button=document.querySelector('#run'),output=document.querySelector('#result');button.disabled=true;output.textContent='Running bounded MCP call...';try{const args=JSON.parse(document.querySelector('#arguments').value),response=await fetch('/api/v1/tools/'+encodeURIComponent(state.selected.name)+'/call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(args)}),body=await response.json();output.textContent=pretty(body);if(!response.ok)throw new Error(body.error?.message||'Tool failed')}catch(error){output.textContent='ERROR\\n'+error.message}finally{button.disabled=false}}
    function renderConfigs(){const tabs=document.querySelector('#config-tabs');tabs.innerHTML=Object.keys(configs).map(name=>'<button class="config-tab '+(name===state.client?'active':'')+'" data-client="'+esc(name)+'">'+esc(name)+'</button>').join('');document.querySelector('#config').textContent=configs[state.client];tabs.querySelectorAll('[data-client]').forEach(b=>b.addEventListener('click',()=>{state.client=b.dataset.client;renderConfigs()}))}
    function toggleConfig(open){document.querySelector('#config-drawer').classList.toggle('open',open);document.querySelector('#drawer-scrim').classList.toggle('open',open);document.querySelector('#config-drawer').setAttribute('aria-hidden',String(!open))}
    async function boot(){renderConfigs();try{const response=await fetch('/api/v1/tools'),body=await response.json();if(!response.ok||!body.ok)throw new Error('Catalogue unavailable');state.catalog=body.data;document.querySelector('#total').textContent=body.data.summary.total;const deep=decodeURIComponent(location.pathname.replace(/^\\/tools\\/?/,''));await selectTool(body.data.tools.some(t=>t.name===deep)?deep:body.data.tools[0].name,false)}catch(error){document.querySelector('#ledger').innerHTML='<div class="state" role="alert">'+esc(error.message)+'</div>'}}
    document.querySelector('#search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();renderList()});
    document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.kind;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));renderList()}));
    document.querySelector('#mobile-tool-picker').addEventListener('change',e=>selectTool(e.target.value,true));
    document.querySelector('#copy-config').addEventListener('click',()=>navigator.clipboard.writeText(configs[state.client]));
    document.querySelector('#open-config').addEventListener('click',()=>toggleConfig(true));
    document.querySelector('#close-config').addEventListener('click',()=>toggleConfig(false));
    document.querySelector('#drawer-scrim').addEventListener('click',()=>toggleConfig(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleConfig(false)});
    document.querySelector('#lang').addEventListener('click',()=>{state.lang=state.lang==='en'?'ar':'en';document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';document.querySelector('#lang').textContent=state.lang==='ar'?'English':'العربية';document.querySelectorAll('[data-'+state.lang+']').forEach(el=>el.innerHTML=el.dataset[state.lang])});
    addEventListener('popstate',()=>state.catalog&&selectTool(decodeURIComponent(location.pathname.replace(/^\\/tools\\/?/,'')),false));
    boot();
  </script>
</body>
</html>`;
}
