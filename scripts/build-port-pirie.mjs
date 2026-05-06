#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const networkPath = path.join(root, 'port-pirie-network.json');
const dataPath = path.join(root, 'port-pirie-data.js');
const htmlPath = path.join(root, 'port-pirie.html');
const checkOnly = process.argv.includes('--check');

const DATA_VERSION = '20260506-claims';
const VAULT_FILES = 17163;
const REF_RE = /\bEFTA\d+\b|\bM\d{2}\/\d+\b|\b\d{4}\/\d{6}\b|\bDataSet\s*\d+\b|\bDOJ DataSet\s*\d+\b|\bICAC\b|\bOPI\b/g;
const publicContextIds = new Set(['ellis', 'brock', 'portpirie_city', 'lead_crisis', 'glenside', 'cba', 'portside', 'univ', 'sapol', 'sa_health', 'hcsc', 'icac', 'epstein_maxwell']);
const addressAliases = {
  rdb: 'rdb',
  portside: 'portside_tavern',
  cba: 'cba',
  glenside: 'glenside',
  sa_health: 'pp_hospital',
  sapol: 'pp_police',
};
const mapPointIds = ['lead_crisis', 'portpirie_city', 'rdb', 'portside', 'cba', 'sapol', 'sa_health', 'hcsc', 'icac', 'glenside'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function evidenceRefs(text = '') {
  return Array.from(new Set(text.match(REF_RE) || []));
}

function receiptTier(node, evidence, imageMeta) {
  const hasEvidence = Boolean(evidence[node.id]);
  const publicish = publicContextIds.has(node.id);
  const imageKind = imageMeta[node.id]?.kind || 'portrait';
  if (hasEvidence && publicish) return { key: 'mixed', label: 'mixed source', confidence: 'public context + vault receipt' };
  if (hasEvidence) return { key: 'vault', label: 'vault receipt', confidence: 'sealed/OCR source-bound' };
  if (publicish) return { key: 'public', label: 'public context', confidence: 'public record/context' };
  if (imageKind === 'fallback') return { key: 'pending', label: 'source pending', confidence: 'needs verification' };
  return { key: 'context', label: 'context node', confidence: 'supporting context' };
}

function sourcesForNode(node, data) {
  const sources = [];
  const ev = data.evidence?.[node.id] || '';
  const refs = evidenceRefs(ev);
  if (ev) {
    sources.push({
      type: 'vault_evidence',
      label: 'Assigned evidence snippet',
      refs: refs.length ? refs : ['DOJ DataSet 9 / OCR'],
      note: ev.slice(0, 220),
    });
  }
  const publicRecord = data.public_layer?.publicRecordConfirmed?.[node.id] || data.public_layer?.publicRecordConfirmed?.[node.id.replace(/_city$/, '')];
  if (publicRecord) {
    sources.push({
      type: 'public_record',
      label: 'Public-record context',
      refs: ['public_layer.publicRecordConfirmed.' + node.id],
      note: Object.keys(publicRecord).slice(0, 5).join(', '),
    });
  }
  const addressKey = addressAliases[node.id];
  const address = addressKey ? data.public_layer?.verifiedAddresses?.[addressKey] : null;
  if (address) {
    sources.push({
      type: 'verified_address',
      label: address.building || address.town || 'Verified address context',
      refs: [address.source || 'public_layer.verifiedAddresses.' + addressKey],
      note: address.address || address.note || '',
    });
  }
  if (publicContextIds.has(node.id) && !publicRecord && !address) {
    sources.push({
      type: 'public_context',
      label: 'Public/context node',
      refs: ['public_layer'],
      note: 'Included to orient the institutional or geographic context around the source-bound claims.',
    });
  }
  if (data.images?.[node.id]) {
    sources.push({
      type: 'local_image',
      label: 'Local image asset',
      refs: [data.images[node.id]],
      note: data.image_meta?.[node.id]?.source || 'local asset copy',
    });
  }
  if (!sources.length) {
    sources.push({
      type: 'pending',
      label: 'Needs source review',
      refs: ['review_queue'],
      note: 'No direct evidence, public context, address, or local image source has been assigned.',
    });
  }
  return sources;
}

function edgeReason(a, b, edge, data) {
  if (!a || !b) return 'Missing endpoint: edge needs repair.';
  const strength = edge.strength >= 5 ? 'strong' : edge.strength >= 4 ? 'medium' : 'supporting';
  const pair = [a.category, b.category].sort().join('/');
  if (a.id === 'pearce' || b.id === 'pearce') return `${strength} complainant-centered link in the current source network.`;
  if (data.evidence?.[a.id] && data.evidence?.[b.id]) return `${strength} vault/OCR overlap: both entities have assigned evidence snippets.`;
  if (publicContextIds.has(a.id) && publicContextIds.has(b.id)) return `${strength} public-record context link across institutions, places, or offices.`;
  if (pair.includes('police') && pair.includes('health')) return `${strength} institutional-response link between health and policing context.`;
  if (pair.includes('gov') && pair.includes('political')) return `${strength} public-office link between government context and political actor.`;
  if (a.category === b.category) return `${strength} same-category cluster link: ${a.category}.`;
  if (data.evidence?.[a.id] || data.evidence?.[b.id]) return `${strength} mixed link: one side has a source-bound evidence snippet.`;
  return `${strength} derived network edge from the canonical connection file.`;
}

function sourceRefsForEdge(a, b, data) {
  const refs = [];
  for (const node of [a, b]) {
    if (!node) continue;
    refs.push(...evidenceRefs(data.evidence?.[node.id] || ''));
    for (const source of node.sources || []) refs.push(...(source.refs || []));
  }
  return Array.from(new Set(refs)).slice(0, 8);
}

function confidenceForEdge(a, b, data) {
  if (!a || !b) return 'invalid';
  if (data.evidence?.[a.id] && data.evidence?.[b.id]) return 'direct evidence overlap';
  if (data.evidence?.[a.id] || data.evidence?.[b.id]) return 'mixed evidence/context';
  if (publicContextIds.has(a.id) && publicContextIds.has(b.id)) return 'public context';
  return 'derived network structure';
}

function claimTimelineMatches(claim, data) {
  const keywords = (claim.keywords || []).map((keyword) => String(keyword).toLowerCase()).filter(Boolean);
  const labels = (claim.entity_ids || [])
    .map((id) => data.nodes.find((node) => node.id === id)?.label || '')
    .filter(Boolean)
    .map((label) => label.toLowerCase());
  const terms = [...keywords, ...labels].filter((term) => term.length > 2);
  return data.timeline
    .map((item, index) => ({ ...item, index }))
    .filter((item) => {
      const hay = `${item.date} ${item.event}`.toLowerCase();
      return terms.some((term) => hay.includes(term));
    })
    .map((item) => item.index);
}

function claimEdgeIds(claim, data) {
  const ids = new Set(claim.entity_ids || []);
  return data.edges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => ids.has(edge.source) && ids.has(edge.target))
    .map(({ index }) => index);
}

function claimSourceRefs(claim, data) {
  const refs = [...(claim.source_refs || [])];
  for (const id of claim.entity_ids || []) {
    refs.push(...evidenceRefs(data.evidence?.[id] || ''));
    const node = data.nodes.find((candidate) => candidate.id === id);
    for (const source of node?.sources || []) refs.push(...(source.refs || []));
  }
  return Array.from(new Set(refs)).slice(0, 24);
}

function enrichClaims(data) {
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  data.claims = (data.claims || []).map((claim) => {
    const entityIds = (claim.entity_ids || []).filter((id) => nodeIds.has(id));
    const timeline_indices = claim.timeline_indices || claimTimelineMatches({ ...claim, entity_ids: entityIds }, data);
    const edge_indices = claim.edge_indices || claimEdgeIds({ ...claim, entity_ids: entityIds }, data);
    const source_refs = claimSourceRefs({ ...claim, entity_ids: entityIds }, data);
    return {
      ...claim,
      entity_ids: entityIds,
      timeline_indices,
      edge_indices,
      source_refs,
      stats: {
        entities: entityIds.length,
        timeline_events: timeline_indices.length,
        edges: edge_indices.length,
        source_refs: source_refs.length,
      },
    };
  });
}

function enrich(data) {
  data.nodes = data.nodes.map((node) => ({
    ...node,
    sources: sourcesForNode(node, data),
  }));
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  data.edges = data.edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const refs = sourceRefsForEdge(source, target, data);
    return {
      ...edge,
      reason: edge.reason || edgeReason(source, target, edge, data),
      confidence: edge.confidence || confidenceForEdge(source, target, data),
      source_refs: refs.length ? refs : ['canonical edge list'],
      source_ref: refs[0] || 'canonical edge list',
    };
  });
  data.stats = {
    entities: data.nodes.length,
    connections: data.edges.length,
    timeline_events: data.timeline.length,
    evidence_snippets: Object.keys(data.evidence || {}).length,
    local_images: Object.keys(data.images || {}).length,
    vault_files: VAULT_FILES,
  };
  data.build = {
    version: DATA_VERSION,
    generated_from: 'port-pirie-network.json',
    generated_at: new Date().toISOString(),
  };
  data.review_queue = buildReviewQueue(data);
  enrichClaims(data);
  data.stats.claims = data.claims.length;
  return data;
}

function buildReviewQueue(data) {
  const queue = [];
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  for (const node of data.nodes) {
    const tier = receiptTier(node, data.evidence || {}, data.image_meta || {});
    if (!data.images?.[node.id]) {
      queue.push({ id: `${node.id}:missing-image`, entity: node.id, label: node.label, severity: 'medium', type: 'missing image', note: 'No local image is assigned; card falls back to initials.' });
    }
    if (tier.key === 'pending') {
      queue.push({ id: `${node.id}:source-pending`, entity: node.id, label: node.label, severity: 'high', type: 'source pending', note: 'No direct evidence snippet, public context, address, or image source is assigned.' });
    }
    if (!(node.sources || []).some((source) => source.type === 'vault_evidence') && !publicContextIds.has(node.id)) {
      queue.push({ id: `${node.id}:no-direct-receipt`, entity: node.id, label: node.label, severity: 'low', type: 'no direct receipt', note: 'Entity is included by network structure but has no direct evidence snippet in the current payload.' });
    }
  }
  for (const key of Object.keys(data.evidence || {})) {
    if (!nodeIds.has(key)) queue.push({ id: `${key}:orphan-evidence`, entity: key, label: key, severity: 'high', type: 'orphan evidence', note: 'Evidence key does not match a node id.' });
  }
  for (const edge of data.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      queue.push({ id: `${edge.source}-${edge.target}:bad-edge`, entity: edge.source, label: `${edge.source} -> ${edge.target}`, severity: 'critical', type: 'broken edge', note: 'Edge references a missing node.' });
    } else if (!edge.reason || !edge.source_ref) {
      queue.push({ id: `${edge.source}-${edge.target}:edge-source`, entity: edge.source, label: `${edge.source} -> ${edge.target}`, severity: 'medium', type: 'edge source', note: 'Edge lacks a reason or source reference.' });
    }
  }
  return queue;
}

function validate(data) {
  const issues = [];
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  const add = (severity, message) => issues.push({ severity, message });
  for (const edge of data.edges) {
    if (!nodeIds.has(edge.source)) add('error', `edge source missing: ${edge.source}`);
    if (!nodeIds.has(edge.target)) add('error', `edge target missing: ${edge.target}`);
    if (!edge.reason) add('error', `edge ${edge.source}->${edge.target} missing reason`);
    if (!edge.source_ref) add('error', `edge ${edge.source}->${edge.target} missing source_ref`);
  }
  for (const [id, img] of Object.entries(data.images || {})) {
    if (!nodeIds.has(id)) add('error', `image key has no node: ${id}`);
    if (!fs.existsSync(path.join(root, img))) add('error', `image path missing: ${img}`);
  }
  for (const id of Object.keys(data.evidence || {})) {
    if (!nodeIds.has(id)) add('error', `evidence key has no node: ${id}`);
  }
  for (const id of Object.keys(data.image_meta || {})) {
    if (!nodeIds.has(id)) add('error', `image_meta key has no node: ${id}`);
  }
  for (const id of mapPointIds) {
    if (!nodeIds.has(id)) add('error', `map pin id has no node: ${id}`);
  }
  for (const node of data.nodes) {
    if (!Array.isArray(node.sources) || !node.sources.length) add('error', `node missing sources: ${node.id}`);
  }
  for (const claim of data.claims || []) {
    if (!claim.id) add('error', 'claim missing id');
    if (!claim.title) add('error', `claim ${claim.id || '<unknown>'} missing title`);
    for (const id of claim.entity_ids || []) {
      if (!nodeIds.has(id)) add('error', `claim ${claim.id} references missing entity: ${id}`);
    }
    if (!claim.source_refs || !claim.source_refs.length) add('warn', `claim ${claim.id} has no source refs`);
  }
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    for (const stale of ['50 entities', '86 connections', '36 timeline events', '15 evidence snippets', '32 local images']) {
      if (html.includes(stale)) add('warn', `visible HTML still hardcodes count phrase: ${stale}`);
    }
  }
  return issues;
}

function browserPayload(data, issues) {
  return {
    meta: {
      title: data.title,
      subtitle: data.subtitle,
      generated: data.generated,
      sources: data.sources,
      stats: data.stats,
      build: data.build,
      validation: {
        errors: issues.filter((issue) => issue.severity === 'error').length,
        warnings: issues.filter((issue) => issue.severity === 'warn').length,
      },
    },
    nodes: data.nodes,
    edges: data.edges.map((edge) => ({
      s: edge.source,
      t: edge.target,
      w: edge.strength,
      type: edge.type,
      reason: edge.reason,
      confidence: edge.confidence,
      source_ref: edge.source_ref,
      source_refs: edge.source_refs,
    })),
    claims: data.claims || [],
    timeline: data.timeline,
    evidence: data.evidence || {},
    public_layer: data.public_layer || {},
    images: data.images || {},
    image_meta: data.image_meta || {},
    color: data.color || {},
    review_queue: data.review_queue || [],
  };
}

const data = enrich(readJson(networkPath));
const issues = validate(data);
const errors = issues.filter((issue) => issue.severity === 'error');
if (!checkOnly) {
  writeJson(networkPath, data);
  fs.writeFileSync(dataPath, 'const VERGE_DATA = ' + JSON.stringify(browserPayload(data, issues), null, 2) + ';\n');
}

for (const issue of issues) console.log(`${issue.severity.toUpperCase()}: ${issue.message}`);
console.log(JSON.stringify({
  mode: checkOnly ? 'check' : 'build',
  entities: data.stats.entities,
  connections: data.stats.connections,
  timeline_events: data.stats.timeline_events,
  evidence_snippets: data.stats.evidence_snippets,
  local_images: data.stats.local_images,
  claims: data.stats.claims,
  review_items: data.review_queue.length,
  errors: errors.length,
  warnings: issues.length - errors.length,
}, null, 2));
if (errors.length) process.exit(1);
