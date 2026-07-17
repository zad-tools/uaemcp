const VISUAL_SYSTEM = `<style data-oei-visual-system>
html{color-scheme:only light;text-rendering:optimizeLegibility;-webkit-text-size-adjust:100%;scrollbar-color:currentColor transparent}
html body,html[dir=rtl] body{font-family:"Dubai",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}
html body *{font-family:"Dubai",Arial,sans-serif!important}
html body h1{font-size:clamp(3.25rem,6.2vw,6.25rem)!important;line-height:.92!important;letter-spacing:-.055em!important;text-wrap:balance;overflow-wrap:anywhere}
html body h2,html body h3{text-wrap:balance}
html body p,html body li{text-wrap:pretty}
html body img,html body svg,html body canvas,html body video{max-width:100%}
html body button,html body a,html body input,html body select,html body textarea{touch-action:manipulation}
html body button,html body input,html body select,html body textarea{min-height:44px}
html body :focus-visible{outline:3px solid #c34032!important;outline-offset:4px!important}
html body ::selection{background:#c34032;color:#f1eddf}
html body header nav{flex-wrap:nowrap}
html body pre,html body code{overflow-wrap:anywhere}
@media(max-width:650px){html body h1{font-size:clamp(2.75rem,13vw,3.65rem)!important;line-height:.96!important;letter-spacing:-.04em!important}html body header{max-width:100vw}html body main,html body section{min-width:0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}html body *,html body *:before,html body *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
</style>`;

export function applyPublicVisualSystem(html: string): string {
  if (html.includes("data-oei-visual-system")) return html;
  if (!html.includes("</head>") || !/<body(?:\s|>)/.test(html)) {
    throw new Error("Public visual system requires a complete HTML document");
  }
  return html
    .replace("</head>", `${VISUAL_SYSTEM}</head>`)
    .replace("<body", '<body data-oei-visual-system="2026"')
    .replaceAll("—", "-")
    .replaceAll("–", "-");
}
