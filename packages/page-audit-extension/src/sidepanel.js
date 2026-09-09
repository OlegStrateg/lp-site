import { collectPageSnapshot } from './collector.js';
import { runAuditRules } from './rules.js';
import { normalizeFindings } from './findings.js';
import { suggestionReadiness } from './suggestions.js';

const statusEl = document.querySelector('#status');
const findingsEl = document.querySelector('#findings');
const summaryEl = document.querySelector('#summary');
const snapshotEl = document.querySelector('#snapshot');
const runButton = document.querySelector('#runAudit');

function appendTextLine(parent, label, value, { bold = false } = {}) {
  const p = document.createElement('p');
  if (label) {
    const strong = document.createElement('b');
    strong.textContent = label;
    p.append(strong, document.createTextNode(' '));
  }
  const text = document.createTextNode(String(value ?? ''));
  if (bold) {
    const strong = document.createElement('b');
    strong.append(text);
    p.append(strong);
  } else {
    p.append(text);
  }
  parent.append(p);
}

function renderFinding(item) {
  const el = document.createElement('article');
  el.className = `finding severity-${item.severity}`;

  const head = document.createElement('div');
  head.className = 'finding-head';
  const title = document.createElement('strong');
  title.textContent = String(item.title ?? 'Finding');
  const severity = document.createElement('span');
  severity.textContent = String(item.severity ?? '');
  head.append(title, severity);
  el.append(head);

  appendTextLine(el, '', item.fact);
  appendTextLine(el, 'Priority:', `${item.priorityScore} · Confidence: ${item.confidence} · Area: ${item.category}`);
  appendTextLine(el, 'Impact:', item.impact);
  appendTextLine(el, 'Fixability:', item.fixability);
  appendTextLine(el, 'Verify:', item.verification);

  const suggestion = suggestionReadiness(item);
  const suggestionLabel = suggestion.ready
    ? (suggestion.mode === 'review_required' ? 'AI suggestion: review required' : 'AI suggestion: ready')
    : `AI suggestion: blocked (${suggestion.reason})`;
  appendTextLine(el, '', suggestionLabel, { bold: true });

  if (item.evidence?.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `Evidence (${item.affectedCount})`;
    details.append(summary);
    for (const entry of item.evidence) appendTextLine(details, '', entry.fact);
    el.append(details);
  }

  return el;
}

async function auditCurrentTab() {
  statusEl.textContent = 'Collecting current page…';
  findingsEl.replaceChildren();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/i.test(tab.url || '')) {
    statusEl.textContent = 'This page cannot be audited with activeTab.';
    return;
  }

  const [{ result: snapshot }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectPageSnapshot,
  });
  const rawFindings = runAuditRules(snapshot);
  const findings = normalizeFindings(rawFindings);
  const counts = findings.reduce((acc, item) => ((acc[item.severity] = (acc[item.severity] || 0) + 1), acc), {});
  const affected = findings.reduce((sum, item) => sum + item.affectedCount, 0);

  summaryEl.textContent = `${findings.length} work items · ${affected} affected instances · ${counts.critical || 0} critical · ${counts.high || 0} high · ${counts.medium || 0} medium`;
  snapshotEl.textContent = JSON.stringify(snapshot, null, 2);
  for (const item of findings) findingsEl.append(renderFinding(item));
  statusEl.textContent = `Audited ${new URL(snapshot.url).hostname}`;
}

runButton.addEventListener('click', () => auditCurrentTab().catch((error) => {
  statusEl.textContent = `Audit failed: ${error.message}`;
}));
