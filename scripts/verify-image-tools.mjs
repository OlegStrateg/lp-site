import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [resizeHtml, cropHtml, sitemap, resizeSource, cropSource, coreSource] = await Promise.all([
  fs.readFile('dist/tools/resize-image/index.html', 'utf8'),
  fs.readFile('dist/tools/crop-image/index.html', 'utf8'),
  fs.readFile('dist/sitemap.xml', 'utf8'),
  fs.readFile('src/scripts/resizeImageTool.ts', 'utf8'),
  fs.readFile('src/scripts/cropImageTool.ts', 'utf8'),
  fs.readFile('src/scripts/imageToolCore.ts', 'utf8'),
]);

assert(resizeHtml.includes('https://layerporter.com/tools/resize-image/'), 'Resize canonical missing');
assert(resizeHtml.includes('Resize image to exact pixels'), 'Resize H1/copy missing');
assert(resizeHtml.includes('id="resize-width"') && resizeHtml.includes('id="resize-height"'), 'Resize pixel controls missing');
assert(resizeHtml.includes('/tools/crop-image/'), 'Resize → Crop internal link missing');

assert(cropHtml.includes('https://layerporter.com/tools/crop-image/'), 'Crop canonical missing');
assert(cropHtml.includes('Crop image to exact pixels'), 'Crop H1/copy missing');
for (const id of ['crop-width', 'crop-height', 'crop-x', 'crop-y', 'crop-preset', 'crop-preview']) {
  assert(cropHtml.includes(`id="${id}"`), `Crop control missing: ${id}`);
}
assert(cropHtml.includes('/tools/resize-image/'), 'Crop → Resize internal link missing');

assert(sitemap.includes('<loc>https://layerporter.com/tools/resize-image/</loc>'), 'Resize sitemap URL missing');
assert(sitemap.includes('<loc>https://layerporter.com/tools/crop-image/</loc>'), 'Crop sitemap URL missing');

const localProcessingSource = `${resizeSource}\n${cropSource}\n${coreSource}`;
assert(!/https?:\/\//i.test(localProcessingSource), 'Image tool runtime must not depend on remote URLs');
assert(!/\bXMLHttpRequest\b|\bFormData\b/i.test(localProcessingSource), 'Image files must not be sent through XHR/FormData');
assert(coreSource.includes('createImageBitmap'), 'Shared image core must decode through createImageBitmap');
assert(coreSource.includes('OffscreenCanvas') && coreSource.includes('drawImage'), 'Shared image core must render through browser canvas');
assert(resizeSource.includes("tool: 'resize_image'"), 'Resize analytics missing');
assert(cropSource.includes("tool: 'crop_image'"), 'Crop analytics missing');

console.log('IMAGE TOOLS STATIC VERIFY PASS — resize + crop canonicals, controls, sitemap, local runtime, cross-links');
