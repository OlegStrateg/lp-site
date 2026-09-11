import fs from 'node:fs';

const path = 'dist/pinterest-downloader/index.html';
const marker = 'data-audio-tool-link';
const promisePattern = /<div\s+class=["']promise["'][^>]*>[\s\S]*?<\/div>/i;
const style = '<style data-audio-tool-handoff-style>.audio-tool-handoff{margin:12px 0 0;font-size:12px;font-weight:750}.audio-tool-handoff a{color:#5f50c8;text-decoration:underline;text-underline-offset:3px}.audio-tool-handoff a:hover{color:#111}</style>';
const handoff = '<p class="audio-tool-handoff"><a data-audio-tool-link href="/tools/extract-audio-from-video/?source=pinterest_downloader">Already downloaded a video? Extract its audio →</a></p>';

let html = fs.readFileSync(path, 'utf8');
if (!html.includes(marker)) {
  const match = html.match(promisePattern);
  if (!match) throw new Error('Pinterest .promise handoff target not found');
  html = html.replace(match[0], `${match[0]}\n      ${handoff}`);
  if (!html.includes('</head>')) throw new Error('Pinterest </head> not found');
  html = html.replace('</head>', `${style}\n</head>`);
  fs.writeFileSync(path, html);
}

console.log('Pinterest → Extract Audio handoff: PASS');
