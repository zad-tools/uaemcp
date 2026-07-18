# README visual provenance

Generated on 2026-07-18 for the Open Emirates package release.

## Deterministic visuals

`bun scripts/generate-readme-visuals.ts` generates the README hero, identity
system, package architecture and every product motion SVG. Exact product names,
counts and evidence boundaries come from the repository contracts and README;
no generative image model is used for factual text or data.

## Live product captures

The files in `screenshots/` were captured from `https://uaemcp.zad.tools` using
headless Chromium after network idle and Dubai Font readiness. Desktop, mobile,
Arabic RTL, product-registry and evidence-product states are represented.

`oei-motion.gif` is assembled from six live Chromium frames covering the public
gateway, product catalogue, MCP tool explorer and Trade Flow Radar. The final
GIF is a deterministic 960 × 540 export with a bounded 128-colour palette.

## Brand contract

- Dubai Font for public product typography.
- Forest, union red, sand, paper and ink palette.
- Sharp grid composition; no gradients, glass effects or invented claims.
- Independent open-source initiative disclaimer retained in the hero.
