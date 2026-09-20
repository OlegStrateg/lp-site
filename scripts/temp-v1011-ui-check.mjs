import fs from 'node:fs';
const html=fs.readFileSync('_internal/v1.0.11/editor.html','utf8');
const js=fs.readFileSync('_internal/v1.0.11/editor.js','utf8');
const manifest=JSON.parse(fs.readFileSync('_internal/v1.0.11/manifest.json','utf8'));
const must=[
  ['compact width', /body\.has-img #replaceBtn[\s\S]*?min-width:\s*0;[\s\S]*?height:\s*30px;[\s\S]*?padding:\s*0 6px;[\s\S]*?gap:\s*3px;/],
  ['right constant', /const REPLACE_BTN_RIGHT = 0;/],
  ['right position', /replaceBtn\.style\.right = \x60\$\{REPLACE_BTN_RIGHT\}px\x60;/],
];
for(const [name,re] of must){ if(!re.test(name==='compact width'?html:js)) throw new Error('FAIL '+name); }
if(/min-width:\s*112px;/.test(html)) throw new Error('FAIL stale 112px');
if(!manifest.permissions.includes('downloads')) throw new Error('FAIL downloads permission changed');
console.log('V1.0.11 UI ASSERTIONS PASS');
