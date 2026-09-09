import { collectPageSnapshot } from './collector.js';
import { runAuditRules } from './rules.js';

const statusEl = document.querySelector('#status');
const findingsEl = document.querySelector('#findings');
const summaryEl = document.querySelector('#summary');
const snapshotEl = document.querySelector('#snapshot');
const runButton = document.querySelector('#runAudit');

function renderFinding(item) {
  const el = document.createElement('article');
  el.className = `finding severity-${item.severity}`;
  el.innerHTML = `<div class="finding-head"><strong>${item.title}</strong><span>${item.severity}</span></div><p>${item.fact}</p><p><b>Impact:</b> ${item.impact}</p><p><b>Fixability:</b> ${item.fixability}</p><p><b>Verify:</b> ${item.verification}</p>`;
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
  const findings = runAuditRules(snapshot);
  const counts = findings.reduce((acc, item) => ((acc[item.severity] = (acc[item.severity] || 0) + 1), acc), {});

  summaryEl.textContent = `${findings.length} findings · ${counts.critical || 0} critical · ${counts.high || 0} high · ${counts.medium || 0} medium`;
  snapshotEl.textContent = JSON.stringify(snapshot, null, 2);
  for (const item of findings) findingsEl.append(renderFinding(item));
  statusEl.textContent = `Audited ${new URL(snapshot.url).hostname}`;
}

runButton.addEventListener('click', () => auditCurrentTab().catch((error) => {
  statusEl.textContent = `Audit failed: ${error.message}`;
}));
