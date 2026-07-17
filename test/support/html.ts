export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<script>", cursor);
    if (start < 0) break;
    const contentStart = start + "<script>".length;
    const end = html.indexOf("</script>", contentStart);
    if (end < 0) throw new Error("Unclosed inline script element");
    scripts.push(html.slice(contentStart, end));
    cursor = end + "</script>".length;
  }
  return scripts;
}

export function singleInlineScript(html: string): string {
  const scripts = inlineScripts(html);
  if (scripts.length !== 1) throw new Error(`Expected one inline script, found ${scripts.length}`);
  return scripts[0];
}
