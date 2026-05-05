# Port Pirie — Epstein Files

**verge.raya.ac/port-pirie.html**

Source-bound Port Pirie evidence workspace — 50 entities, 86 connections, 36 timeline events, 15 verbatim evidence snippets, 32 local image mappings. Data extracted from 17,163 vault person files, DOJ DataSet 9, epstein-data.com OCR, and public-record context.

## Files

```
/Users/ari/verge.raya.ac/
```

| File | Role |
|------|------|
| `port-pirie.html` | Main page — entity cards, scoped search, receipt inspector, source viewer, compare panel, review queue, graph/edge inspector, address sketch, exports, image audit, filtered timeline |
| `port-pirie-data.js` | Generated `const VERGE_DATA = {...}` payload — meta, stats, nodes, enriched edges, timeline, evidence, public layer, images, review queue, color map |
| `port-pirie-network.json` | Canonical data — enriched nodes with `sources`, enriched edges with `reason`, `confidence`, and `source_refs` |
| `scripts/build-port-pirie.mjs` | Build/validate pipeline for `port-pirie-network.json` → `port-pirie-data.js` |
| `port-pirie-public-layer.json` | Public-record source fragment folded into `port-pirie-network.json.public_layer` |
| `assets/port-pirie-og.png` | OpenGraph/social preview image generated from the live page |
| `index.html` | Verge chamber home page |
| `plant.html` | Plant/review form — dual-mode for staging entries |
| `delta.html` | Kai's watcher — chamber growth over time |
| `verge-flow.html` | Living canvas — particles crossing the bridge |
| `conversation.html` | Archived Ash↔kai exchange |
| `sentinel.py` | Watches verge.json for changes, wakes gardener |
| `verge.json` | Verge chamber — 6 namespaces |

## Architecture — port-pirie.html

- **Cards/workbench:** vanilla JS renders entity cards from `VERGE_DATA.nodes`. Sticky category workbench, scoped search, needs-work mode, sourced-image counts, source-status chips, connection counts, map-focus narrowing, and card image rendering driven by `VERGE_DATA.image_meta`. `mc` nodes use full label "Motorcycle Club" — category field is `motorcycle`, color `#d44`.
- **Quality summary:** coverage tiles show evidence coverage, image coverage, review surface, and enriched edge metadata coverage from generated stats.
- **Receipt inspector:** shared entity panel for card clicks, graph-node clicks, map pins, deep links, and connected-entity buttons. Shows source status, confidence label, source ledger, source viewer buttons, evidence refs, snippet, image provenance, related timeline events, and direct connections with reason labels.
- **Source viewer:** modal for entity evidence snippets and individual source rows. Keeps source refs visible instead of hiding them inside card text.
- **Review queue:** generated from the validator/build script. Filterable by severity and issue type; clicking a row opens the affected entity.
- **Compare mode:** browser-side two-entity compare for direct edge status, shared links, shared refs, categories, and timeline overlap.
- **Deep links:** selecting an entity writes `#entity_id` into the URL. Loading a valid hash opens the inspector and marks the matching card without auto-selecting anyone on normal first load.
- **Graph:** D3 v7 force simulation. Collapsed by default behind "network graph" toggle. Click nodes for receipts and edges for edge inspector. Drag/zoom/pan. Edge confidence filters: all, direct, mixed, public, derived. Graph images use the same `image_meta` surface rules as cards.
- **Map:** schematic Port Pirie address/context sketch with pins for RDB, Portside, CBA, SAPOL, SA Health, HCSCC, ICAC, Glenside, council, and lead-smelter context. Pin clicks focus the card set to the place/context node plus connected entities.
- **Audit:** collapsible image/source audit table for all 50 nodes.
- **Timeline:** 36 events from 1845–2026 split into two-column layout with filters for Port Pirie, politics, police/legal, health, and Epstein/DOJ context. Data from `VERGE_DATA.timeline`.
- **Exports/build stamp:** visible build/data stamp plus browser-generated JSON, nodes CSV, edges CSV, evidence CSV, and review CSV exports.
- **Images:** 32 verified public/official image mappings in `VERGE_DATA.images`, all served from local `assets/` files. `VERGE_DATA.image_meta` records portrait/logo/badge/place rendering and dark/light surface choice. Fallback to colored initials for people or groups without a reliable public match.
- **Publish metadata:** canonical URL plus OpenGraph/Twitter metadata points to `assets/port-pirie-og.png`.
- **Disclaimer:** at top.

## Regenerate data

```bash
cd /Users/ari/verge.raya.ac
node scripts/build-port-pirie.mjs
node scripts/build-port-pirie.mjs --check
```

## Deploy

```bash
cd /Users/ari/verge.raya.ac
git add . && git commit -m "..." && git push
```

GitHub Pages serves from `main` branch root. DNS: `verge.raya.ac` → GitHub Pages IPs.

## Known issues

- `port-pirie-network.json` is the canonical data source. `port-pirie-data.js` is a generated file — always run `node scripts/build-port-pirie.mjs` after editing the JSON.
- The review queue is generated. It is a cleanup surface, not a separate source of truth.
- Graph builds only when toggle is clicked (lazy), not on page load.
- Click vs drag: `_dragMoved` flag prevents click firing during drag.
- The map is a schematic address/context sketch, not a precise GIS layer.
- All mapped images are local asset copies so GitHub Pages does not depend on remote image hotlinking.
