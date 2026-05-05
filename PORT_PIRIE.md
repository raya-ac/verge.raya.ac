# Port Pirie — Epstein Files

**verge.raya.ac/port-pirie.html**

Network analysis of the Port Pirie Epstein files — 50 entities, 86 connections, 36 timeline events, 14 verbatim evidence snippets. Data extracted from 17,163 vault person files, DOJ DataSet 9, and epstein-data.com OCR.

## Files

```
/Users/ari/verge.raya.ac/
```

| File | Role |
|------|------|
| `port-pirie.html` | Main page — entity cards, receipt inspector, D3 force graph, address sketch, image audit, timeline |
| `port-pirie-data.js` | `const VERGE_DATA = {...}` — nodes, edges, timeline, evidence, public layer, images, image metadata, color map. Loaded by `port-pirie.html` via `<script src>` |
| `port-pirie-network.json` | Source JSON — canonical data. Use to regenerate `port-pirie-data.js` |
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

- **Cards:** vanilla JS renders entity cards from `VERGE_DATA.nodes`. Sticky category workbench, sourced-image counts, source-status chips, connection counts, and card image rendering driven by `VERGE_DATA.image_meta`. `mc` nodes use full label "Motorcycle Club" — category field is `motorcycle`, color `#d44`.
- **Receipt inspector:** shared entity panel for card clicks, graph-node clicks, map pins, and connected-entity buttons. Shows source status, confidence label, evidence refs, snippet, image provenance, related timeline events, and direct connections.
- **Graph:** D3 v7 force simulation. Collapsed by default behind "network graph" toggle. Click selects the shared receipt inspector. Drag/zoom/pan. Node radius 26px with glow rings. Edge colors by strength. Graph images use the same `image_meta` surface rules as cards.
- **Map:** schematic Port Pirie address/context sketch with pins for RDB, Portside, CBA, SAPOL, SA Health, HCSCC, ICAC, Glenside, council, and lead-smelter context.
- **Audit:** collapsible image/source audit table for all 50 nodes.
- **Timeline:** 36 events split into two-column layout. Data from `VERGE_DATA.timeline`.
- **Images:** 32 verified public/official image mappings in `VERGE_DATA.images`, all served from local `assets/` files. `VERGE_DATA.image_meta` records portrait/logo/badge/place rendering and dark/light surface choice. Fallback to colored initials for people or groups without a reliable public match.
- **Publish metadata:** canonical URL plus OpenGraph/Twitter metadata points to `assets/port-pirie-og.png`.
- **Disclaimer:** at top.
- **No search** — removed per request.

## Regenerate data

```bash
cd /Users/ari/verge.raya.ac
python3 -c "
import json
with open('port-pirie-network.json') as f:
    data = json.load(f)
with open('port-pirie-data.js', 'w') as f:
    f.write('const VERGE_DATA = ' + json.dumps({
        'nodes': data['nodes'],
        'edges': [{'s': e['source'], 't': e['target'], 'w': e['strength']} for e in data['edges']],
        'timeline': data['timeline'],
        'evidence': data.get('evidence', {}),
        'public_layer': data.get('public_layer', {}),
        'images': data.get('images', {}),
        'color': data.get('color', {}),
        'image_meta': data.get('image_meta', {}),
    }, indent=2) + ';')
"
```

## Deploy

```bash
cd /Users/ari/verge.raya.ac
git add . && git commit -m "..." && git push
```

GitHub Pages serves from `main` branch root. DNS: `verge.raya.ac` → GitHub Pages IPs.

## Known issues

- `port-pirie-network.json` is the canonical data source. `port-pirie-data.js` is a generated file — always regenerate after editing the JSON.
- Graph builds only when toggle is clicked (lazy), not on page load.
- Click vs drag: `_dragMoved` flag prevents click firing during drag.
- The map is a schematic address/context sketch, not a precise GIS layer.
- All mapped images are local asset copies so GitHub Pages does not depend on remote image hotlinking.
