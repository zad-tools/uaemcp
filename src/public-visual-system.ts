const VISUAL_SYSTEM = `<style data-oei-visual-system>
:root{
  --oei-paper:#f1eddf;
  --oei-paper-raised:#e8e2d2;
  --oei-ink:#10271f;
  --oei-forest:#173d2d;
  --oei-red:#c34032;
  --oei-gold:#c6a45f;
  --oei-muted:#596a62;
  --oei-line:rgba(16,39,31,.28);
  --oei-line-inverse:rgba(241,237,223,.28);
  --oei-type-caption:.75rem;
  --oei-type-label:.8125rem;
  --oei-type-body:1rem;
  --oei-type-body-lg:1.125rem;
  --oei-type-heading-sm:1.5rem;
  --oei-type-heading-md:2rem;
  --oei-type-heading-lg:clamp(2.5rem,4.2vw,4rem);
  --oei-space-01:.25rem;
  --oei-space-02:.5rem;
  --oei-space-03:.75rem;
  --oei-space-04:.875rem;
  --oei-space-05:1rem;
  --oei-space-06:1.5rem;
  --oei-space-07:2rem;
  --oei-space-08:3rem;
  --oei-space-09:4rem;
  --oei-control-sm:2rem;
  --oei-control-md:2.75rem;
  --oei-control-lg:3rem;
  --oei-content-max:100rem;
  --oei-page-pad:clamp(1rem,4vw,4rem);
}
html{color-scheme:only light;text-rendering:optimizeLegibility;-webkit-text-size-adjust:100%;scrollbar-color:var(--oei-ink) transparent;background:var(--oei-paper)}
html body,html[dir=rtl] body{font-family:"Dubai",Arial,sans-serif!important;-webkit-font-smoothing:antialiased;background:var(--oei-paper);color:var(--oei-ink);font-size:var(--oei-type-body);line-height:1.5}
html body *{font-family:"Dubai",Arial,sans-serif!important;box-sizing:border-box}
html body h1{font-size:var(--oei-type-heading-lg)!important;line-height:1!important;letter-spacing:-.035em!important;text-wrap:balance;overflow-wrap:anywhere;margin-block:var(--oei-space-06)!important;max-width:18ch}
html body h2{font-size:clamp(2rem,3.2vw,3rem)!important;line-height:1.08!important;letter-spacing:-.025em!important;text-wrap:balance}
html body h3{font-size:clamp(1.25rem,2vw,1.75rem)!important;line-height:1.15!important;letter-spacing:-.012em!important;text-wrap:balance}
html body p,html body li{font-size:var(--oei-type-body)!important;line-height:1.6!important;text-wrap:pretty}
html body small{font-size:var(--oei-type-caption)!important;line-height:1.45!important}
html body img,html body svg,html body canvas,html body video{max-width:100%}
html body button,html body a,html body input,html body select,html body textarea{touch-action:manipulation}
html body button,html body input,html body select,html body textarea{min-height:var(--oei-control-md);font-size:var(--oei-type-label)!important;line-height:1.25!important}
html body input,html body select,html body textarea{border-radius:0!important;padding-inline:var(--oei-space-04)!important}
html body button{border-radius:0!important;font-weight:700!important;letter-spacing:.015em!important}
html body pre,html body code{overflow-wrap:anywhere;font-size:var(--oei-type-caption)!important;line-height:1.55!important}
html body :is(.eye,.eyebrow,.micro,.label,.kicker,.kind,.status,.meta,.step-no,.phase,.delivery,.badge,.tool-kind,.section-label,.atlas-key,.visual-label,.bar span,.ledger small,.snapshot small,.hashes small,.argument b,.meta span,.dock-head button,.filter,.kind-flag){font-size:var(--oei-type-caption)!important;line-height:1.35!important;letter-spacing:.055em!important}
html body :is(.lede,.scope p,.boundary p){font-size:var(--oei-type-body-lg)!important;line-height:1.55!important;max-width:65ch}
html body :is(.top,header.top){height:4rem!important;min-height:4rem!important;padding-inline:var(--oei-page-pad)!important;border-bottom:1px solid var(--oei-line)!important;background:var(--oei-paper)!important}
html body :is(.top,.nav,header nav,.top nav){align-items:center!important;gap:var(--oei-space-06)!important}
html body :is(.top a,.top button,.nav a,.nav button,header nav a,header nav button){font-size:var(--oei-type-label)!important;white-space:nowrap}
html body :is(.hero,.intro){min-height:0!important;border-bottom:1px solid var(--oei-line)!important}
html body :is(.hero-copy,.copy){padding:var(--oei-space-09) var(--oei-page-pad)!important}
html body :is(.hero-copy,.copy)>p{margin-block:var(--oei-space-05)!important}
html body :is(.section,.workspace,.results,.journey){padding:var(--oei-space-09) var(--oei-page-pad)!important}
html body :is(.section,.workspace,.results,.journey)>h2{margin-top:0!important;margin-bottom:var(--oei-space-07)!important;max-width:22ch}
html body :is(.section-head,.head,.workspace-head,.journey-head){margin-bottom:var(--oei-space-07)!important;gap:var(--oei-space-06)!important}
html body :is(.section-head,.head,.workspace-head,.journey-head) h2{margin-block:0!important}
html body :is(.metrics,.summary){border-color:var(--oei-line)!important}
html body :is(.metric,.summary>div){min-height:7.5rem!important;padding:var(--oei-space-06)!important;display:flex;flex-direction:column;justify-content:space-between}
html body :is(.metric,.summary>div) strong{font-size:clamp(1.75rem,3vw,2.75rem)!important;line-height:1!important;font-weight:700!important}
html body :is(.metric,.summary>div) span{font-size:var(--oei-type-label)!important;line-height:1.35!important;color:var(--oei-muted)}
html body :is(.field,.control){font-size:var(--oei-type-body)!important}
html body :is(.field,.control) label{display:block;font-size:var(--oei-type-label)!important;line-height:1.35!important;margin-bottom:var(--oei-space-02)!important}
html body :is(.field input,.field select,.field textarea,.control input,.control select,.control textarea){min-height:var(--oei-control-lg)!important;font-size:var(--oei-type-body)!important}
html body :is(.button,.go,.build,.action,.filters button,.tools button){min-height:var(--oei-control-lg)!important;padding:0 var(--oei-space-05)!important;font-size:var(--oei-type-label)!important}
html body :is(.row,.item,.park,.route,.task){font-size:var(--oei-type-body)!important}
html body :is(.row,.item,.park,.route,.task) strong{font-size:var(--oei-type-body-lg)!important;line-height:1.3!important}
html body :is(.footer,footer){min-height:4rem!important;padding:var(--oei-space-05) var(--oei-page-pad)!important;font-size:var(--oei-type-label)!important;line-height:1.45!important;align-items:center}
html body :focus-visible{outline:3px solid var(--oei-red)!important;outline-offset:3px!important}
html body ::selection{background:var(--oei-red);color:var(--oei-paper)}
html body header nav{flex-wrap:nowrap}
html body main{max-width:var(--oei-content-max);margin-inline:auto}
@media(min-width:100rem){html body main{border-inline:1px solid var(--oei-line)}}
@media(max-width:900px){
  html body :is(.hero-copy,.copy,.section,.workspace,.results,.journey){padding:var(--oei-space-08) var(--oei-page-pad)!important}
  html body :is(.section-head,.head,.workspace-head,.journey-head){display:block!important}
  html body :is(.section-head,.head,.workspace-head,.journey-head)>*+*{margin-top:var(--oei-space-05)!important}
}
@media(max-width:650px){
  :root{--oei-type-heading-lg:clamp(2.25rem,10vw,3rem);--oei-page-pad:1rem}
  html body h1{line-height:1.02!important;letter-spacing:-.025em!important;margin-block:var(--oei-space-05)!important}
  html body h2{font-size:clamp(1.75rem,8vw,2.25rem)!important}
  html body p,html body li{font-size:.9375rem!important}
  html body :is(.hero-copy,.copy,.section,.workspace,.results,.journey){padding-block:var(--oei-space-07)!important}
  html body :is(.metric,.summary>div){min-height:6.5rem!important;padding:var(--oei-space-05)!important}
  html body :is(.top,header.top){max-width:100vw;gap:var(--oei-space-03)!important}
  html body main,html body section{min-width:0}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}html body *,html body *:before,html body *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
</style>`;

export function applyPublicVisualSystem(html: string): string {
  if (html.includes("data-oei-visual-system")) return html;
  if (!html.includes("</head>") || !/<body(?:\s|>)/.test(html)) {
    throw new Error("Public visual system requires a complete HTML document");
  }
  return html
    .replace("</head>", `${VISUAL_SYSTEM}</head>`)
    .replace("<body", '<body data-oei-visual-system="2026" data-design-system="oei-product-v1"')
    .replaceAll("—", "-")
    .replaceAll("–", "-");
}
