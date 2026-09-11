import fs from 'node:fs';

const path = 'dist/pinterest-downloader/index.html';
const marker = 'data-audio-tool-link';
const target = '<div class="promise"><span>Less detour:</span> see the Pin → click Download → keep the file.</div>';
const handoff = `${target}\n      <p class="audio-tool-handoff"><a ${marker} href="/tools/extract-audio-from-video/?source=pinterest_downloader">Already downloaded a video? Extract its audio →</a></p>`;
const style = '<style data-audio-tool-handoff-style>.audio-tool-handoff{margin:12px 0 0;font-size:12px;font-weight:750}.audio-tool-handoff a{color:#5f50c8;text-decoration:underline;text-underline-offset:3px}.audio-tool-handoff a:hover{color:#111}</style>';

let html = fs.readFileSync(path, 'utf8');
if (!html.includes(marker)) {
  if (!html.includes(target)) throw new Error('Pinterest audio-tool handoff target not found');
  html = html.replace(target, handoff);
  if (!html.includes('</head>')) throw new Error('Pinterest </head> not found');
  html = html.replace('</head>', `${style}\n</head>`);
  fs.writeFileSync(path, html);
}

console.log('Pinterest → Extract Audio handoff: PASS');
