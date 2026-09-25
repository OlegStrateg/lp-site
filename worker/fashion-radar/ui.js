const CSS = [
  ':root{--bg:#0c0e15;--panel:#141824;--panel2:#191e2c;--text:#f4f4f7;--muted:#969dad;--line:#2a3040;--violet:#8276e8;--gold:#e7c886;--green:#79d6a3;--red:#ff8e92}',
  '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif}',
  'a{color:#b8afff}.wrap{max-width:1500px;margin:auto;padding:26px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.brand h1{margin:0;font-size:32px;letter-spacing:-.045em}.brand p{margin:6px 0;color:var(--muted)}',
  '.controls{display:flex;gap:8px;align-items:center}.market{background:#0f121b;border:1px solid var(--line);color:var(--text);padding:11px;border-radius:10px}.btn{border:0;background:var(--violet);color:#fff;font-weight:750;border-radius:10px;padding:12px 17px;cursor:pointer}',
  '.notice,.panel,.stat,.card{border:1px solid var(--line);background:var(--panel);border-radius:14px}.notice{margin:18px 0;padding:12px 14px;color:var(--gold);border-color:#5a4d2f;background:#17150f}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}',
  '.stat{padding:15px}.stat .k{font-size:11px;color:var(--muted);text-transform:uppercase}.stat .v{font-size:26px;font-weight:800;margin-top:4px}.panel{padding:17px;margin-top:14px}.panel h2{margin:0 0 12px;font-size:15px}',
  '.table{width:100%;border-collapse:collapse}.table th,.table td{padding:9px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.table th{font-size:11px;color:var(--muted);text-transform:uppercase}',
  '.status{display:inline-block;padding:3px 7px;border:1px solid var(--line);border-radius:999px;font-size:11px}.ok{color:var(--green);border-color:#335d4b}.warn{color:var(--gold);border-color:#5a4d2f}.bad{color:var(--red);border-color:#66383b}',
  '.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{padding:17px}.card h3{font-size:18px;margin:0}.muted{color:var(--muted)}.chips{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.chip{padding:3px 7px;border-radius:999px;background:var(--panel2);border:1px solid var(--line);font-size:11px}',
  '.evidence{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.ev{padding:6px 0}.run-note{margin-top:14px;color:var(--muted)}',
  '@media(max-width:900px){.top{display:block}.controls{margin-top:14px}.grid{grid-template-columns:repeat(2,1fr)}.cards{grid-template-columns:1fr}}'
].join('');

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function badge(value) {
  const x = String(value || '—');
  const cls = ['ok','complete','CONFIRMING'].includes(x) ? 'ok' : (x === 'failed' ? 'bad' : 'warn');
  return '<span class="status ' + cls + '">' + esc(x) + '</span>';
}

function sourceRows(data) {
  if (!data) {
    return '<tr><td colspan="5" class="muted">Нажмите «Запустить live-сбор»</td></tr>';
  }
  return data.collectors.map(function (row) {
    return '<tr><td>' + esc(row.display_name) + '</td><td>' + esc(row.market) + '</td><td>' + badge(row.status) +
      '</td><td>' + esc(row.records) + '</td><td class="muted">' + esc(row.elapsed_ms) + ' ms' +
      (row.error ? ' · ' + esc(row.error) : '') + '</td></tr>';
  }).join('');
}

function candidateCards(data) {
  if (!data) return '<div class="muted">Пока нет запуска.</div>';
  if (!data.candidates.length) return '<div class="muted">По текущему live-срезу watchlist не дал кандидатов. Это допустимый результат.</div>';

  return data.candidates.map(function (candidate) {
    const evidence = candidate.evidence.slice(0, 10).map(function (row) {
      const link = row.url ? ' · <a href="' + esc(row.url) + '" target="_blank" rel="noopener">источник</a>' : '';
      return '<div class="ev">' + esc(row.display_name) + ' · ' + esc(row.market) +
        (row.published_at ? ' · ' + esc(row.published_at) : '') + link + '</div>';
    }).join('');

    return '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><h3>' +
      esc(candidate.label) + '</h3>' + badge(candidate.state) + '</div>' +
      '<div class="chips">' + candidate.sources.map(function (x) {
        return '<span class="chip">' + esc(x) + '</span>';
      }).join('') + '</div>' +
      '<div><b>Глобально:</b> ' + candidate.sources.length + ' источников · ' +
      esc(candidate.independent_lines) + ' независимых линий · ' + esc(candidate.markets.join(', ')) + '</div>' +
      '<div style="margin-top:7px"><b>Целевой рынок ' + esc(candidate.target_geo) + ':</b> ' +
      (candidate.target_observed ? '<span class="status ok">наблюдается</span>' : '<span class="status warn">не наблюдается</span>') +
      '</div><div class="evidence"><b>Evidence</b>' + evidence + '</div></div>';
  }).join('');
}

export function renderDashboard(data, targetGeo) {
  const geo = String(targetGeo || (data && data.target_geo) || 'RU').toUpperCase();
  const options = ['RU','US','GB','DE','FR','AE','TR','BR'].map(function (item) {
    return '<option value="' + item + '"' + (item === geo ? ' selected' : '') + '>' + item + '</option>';
  }).join('');

  const status = data ? badge(data.status) : '—';
  const okSources = data ? esc(data.summary.ok_sources) : '—';
  const rawRecords = data ? esc(data.summary.raw_records) : '—';
  const candidates = data ? esc(data.candidates.length) : '—';
  const runNote = data ? '<div class="run-note">Последний запуск: <b>' + esc(data.generated_at) +
    '</b> · целевой рынок <b>' + esc(data.target_geo) + '</b></div>' : '';

  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow,noarchive"><title>Fashion Radar</title><style>' + CSS + '</style></head><body>' +
    '<div class="wrap"><div class="top"><div class="brand"><h1>Fashion Radar</h1>' +
    '<p>Живой тестовый контур · глобальные сигналы отдельно от целевого рынка</p></div>' +
    '<form class="controls" method="get" action="/run"><select name="target_geo" class="market">' + options +
    '</select><button type="submit" class="btn">Запустить live-сбор</button></form></div>' +
    '<div class="notice">Наблюдательный режим: без выдуманного Trend Score, вероятности, фиксированного лага и команды «закупать».</div>' +
    runNote +
    '<div class="grid"><div class="stat"><div class="k">Статус</div><div class="v">' + status + '</div></div>' +
    '<div class="stat"><div class="k">Источников OK</div><div class="v">' + okSources + '</div></div>' +
    '<div class="stat"><div class="k">Записей</div><div class="v">' + rawRecords + '</div></div>' +
    '<div class="stat"><div class="k">Кандидатов</div><div class="v">' + candidates + '</div></div></div>' +
    '<div class="panel"><h2>Источники последнего запуска</h2><div style="overflow:auto"><table class="table"><thead><tr>' +
    '<th>Источник</th><th>Рынок</th><th>Статус</th><th>Записей</th><th>Время</th></tr></thead><tbody>' +
    sourceRows(data) + '</tbody></table></div></div>' +
    '<div class="panel"><h2>Тренды / кандидаты</h2><div class="cards">' + candidateCards(data) +
    '</div></div></div></body></html>';
}
