---
name: Open Emirates Intelligence
description: A civic editorial system for verifiable UAE public data.
colors:
  civic-forest: "#173d2d"
  archive-ivory: "#f1eddf"
  ledger-paper: "#e8e1ce"
  evidence-ink: "#13251d"
  signal-red: "#c34032"
  registry-green: "#087443"
  seal-gold: "#bf9a55"
  muted-ink: "#66736b"
typography:
  display:
    fontFamily: "Manrope, Noto Kufi Arabic, sans-serif"
    fontSize: "clamp(3.75rem, 8vw, 8.25rem)"
    fontWeight: 600
    lineHeight: 0.86
  body:
    fontFamily: "Manrope, Noto Kufi Arabic, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  compact: "10px"
  control: "16px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.evidence-ink}"
    textColor: "{colors.archive-ivory}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  input-ledger:
    backgroundColor: "{colors.archive-ivory}"
    textColor: "{colors.evidence-ink}"
    rounded: "{rounded.none}"
    padding: "14px"
---

# Design System: Open Emirates Intelligence

## Overview

**Creative North Star: "The National Data Ledger"**

The interface behaves like a public evidence ledger translated into a contemporary editorial system. Strong rules, asymmetric scale and dense source rows create authority; restrained motion and explicit states keep the product usable. It rejects generic SaaS landing pages, glossy government portals and decorative AI dashboards.

**Key Characteristics:**

- Civic editorial hierarchy
- Flat, ruled data surfaces
- Native Arabic and English composition
- Visible evidence and limitations
- Sharp, functional controls

## Colors

Forest and archival paper establish institutional permanence. Red marks evidence-critical actions and warnings; green marks live or verified access; gold is reserved for seals and provenance details.

**The Evidence Color Rule.** Signal colors communicate meaning, never decoration.

## Typography

**Display Font:** Manrope with Noto Kufi Arabic
**Body Font:** Manrope with Noto Kufi Arabic
**Label/Mono Font:** IBM Plex Mono

**Character:** Large editorial headlines create a public-institution voice. Compact monospaced labels identify sources, methods and machine contracts. Body copy stays below 72 characters per line.

**The Two-Language Rule.** Arabic is composed for RTL and readable rhythm, never inserted into an English layout as an afterthought.

## Elevation

The system is flat. Depth comes from color fields, borders, density and hierarchy, not shadows. Sticky navigation may use a restrained backdrop blur solely to preserve readability over scrolling content.

**The Flat Ledger Rule.** If a surface needs a shadow to explain its hierarchy, fix the structure.

## Components

### Buttons

- **Shape:** Sharp rectangular controls (0px radius).
- **Primary:** Evidence ink on archive ivory with compact mono labels.
- **Hover / Focus:** Signal red state, small vertical translation and a visible focus outline.
- **Secondary:** Transparent with a one-pixel evidence-ink rule.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Archive ivory, ledger paper or civic forest according to information role.
- **Shadow Strategy:** None.
- **Border:** One-pixel ledger rules.
- **Internal Padding:** Varies by density; never repeat identical card padding across a whole page.

### Inputs / Fields

- **Style:** Transparent or archival background, one-pixel border, square corners.
- **Focus:** Strong evidence-ink outline with no glow.
- **Error / Disabled:** Error copy is explicit; disabled states remain readable.

### Navigation

Sticky, compact and ledger-like. Brand identity stays visible; secondary links collapse on narrow screens while language switching remains available.

### Evidence Ledger

Rows combine a stable index, human title, machine identifier, source scope and direct action. Hover may invert the row, but never obscures the methodology or route.

## Do's and Don'ts

### Do:

- **Do** place citations, scope and limitations adjacent to the result.
- **Do** preserve source-native values when normalization is not documented.
- **Do** use square ruled surfaces and varied spatial rhythm.
- **Do** give Arabic runtime, loading, empty and error states full parity.

### Don't:

- **Don't** create generic SaaS landing pages or glossy government portals.
- **Don't** use glassmorphism, neon AI dashboards or rounded card grids.
- **Don't** use decorative charts, gradient text or hero-metric templates.
- **Don't** use colored side-stripe borders or nested cards.
- **Don't** hide methodology behind marketing language or make unqualified national claims.
