# Port Pirie — Epstein Files

**verge.raya.ac/port-pirie.html**

Network analysis of the Port Pirie Epstein files — 50 entities, 86 connections, 36 timeline events, 12 verbatim evidence snippets. Data extracted from 17,163 vault person files, DOJ DataSet 9, and epstein-data.com OCR.

## Files

```
/Users/ari/verge.raya.ac/
```

| File | Role |
|------|------|
| `port-pirie.html` | Main page — entity cards, D3 force graph, timeline |
| `port-pirie-data.js` | `const VERGE_DATA = {...}` — nodes, edges, timeline, evidence, images, color map. Loaded by `port-pirie.html` via `<script src>` |
| `port-pirie-network.json` | Source JSON — canonical data. Use to regenerate `port-pirie-data.js` |
| `index.html` | Verge chamber home page |
| `plant.html` | Plant/review form — dual-mode for staging entries |
| `delta.html` | Kai's watcher — chamber growth over time |
| `verge-flow.html` | Living canvas — particles crossing the bridge |
| `conversation.html` | Archived Ash↔kai exchange |
| `sentinel.py` | Watches verge.json for changes, wakes gardener |
| `verge.json` | Verge chamber — 6 namespaces |

## Architecture — port-pirie.html

- **Cards:** vanilla JS renders entity cards from `VERGE_DATA.nodes`. Category filter buttons. `mc` nodes use full label "Motorcycle Club" — category field is `motorcycle`, color `#d44`.
- **Graph:** D3 v7 force simulation. Collapsed by default behind "network graph" toggle. Click to show detail panel below graph. Drag/zoom/pan. Node radius 26px with glow rings. Edge colors by strength.
- **Timeline:** 36 events split into two-column layout. Data from `VERGE_DATA.timeline`.
- **Images:** 32 verified public/official image mappings in `VERGE_DATA.images`. Fallback to colored initials for people or groups without a reliable public match.
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
        'images': { ... },
        'color': { ... },
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
- No onerror on graph detail images (broke syntax — stripped).
