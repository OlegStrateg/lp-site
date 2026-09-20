import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [
  resizeHtml,
  cropHtml,
  sitemap,
  resizeSource,
  cropSource,
  coreSource,
  storeSource,
  bridgeSource,
  bootstrapSource,
  resizePage,
  cropPage,
] = await Promise.all([
  fs.readFile('dist/tools/resize-image/index.html', 'utf8'),
  fs.readFile('dist/tools/crop-image/index.html', 'utf8'),
  fs.readFile('dist/sitemap.xml', 'utf8'),
  fs.readFile('src/scripts/resizeImageTool.ts', 'utf8'),
  fs.readFile('src/scripts/cropImageTool.ts', 'utf8'),
  fs.readFile('src/scripts/imageToolCore.ts', 'utf8'),
  fs.readFile('src/scripts/imageWorkspaceStore.ts', 'utf8'),
  fs.readFile('src/scripts/extensionImageBridge.ts', 'utf8'),
  fs.readFile('src/scripts/imageWorkspaceBootstrap.ts', 'utf8'),
  fs.readFile('src/pages/tools/resize-image.astro', 'utf8'),
  fs.readFile('src/pages/tools/crop-image.astro', 'utf8'),
]);

assert(resizeHtml.includes('https://layerporter.com/tools/resize-image/'), 'Resize canonical missing');
assert(resizeHtml.includes('Resize image to exact pixels'), 'Resize H1/copy missing');
assert(resizeHtml.includes('id="resize-width"') && resizeHtml.includes('id="resize-height"'), 'Resize pixel controls missing');
assert(resizeHtml.includes('/tools/crop-image/'), 'Resize → Crop workspace link missing');

assert(cropHtml.includes('https://layerporter.com/tools/crop-image/'), 'Crop canonical missing');
assert(cropHtml.includes('Crop image to exact pixels'), 'Crop H1/copy missing');
for (const id of ['crop-width', 'crop-height', 'crop-x', 'crop-y', 'crop-preset', 'crop-preview']) {
  assert(cropHtml.includes(`id="${id}"`), `Crop control missing: ${id}`);
}
assert(cropHtml.includes('/tools/resize-image/'), 'Crop → Resize workspace link missing');

assert(sitemap.includes('<loc>https://layerporter.com/tools/resize-image/</loc>'), 'Resize sitemap URL missing');
assert(sitemap.includes('<loc>https://layerporter.com/tools/crop-image/</loc>'), 'Crop sitemap URL missing');

const localProcessingSource = `${resizeSource}\n${cropSource}\n${coreSource}\n${storeSource}\n${bridgeSource}\n${bootstrapSource}`;
assert(!/https?:\/\//i.test(localProcessingSource), 'Image workspace runtime must not depend on remote URLs');
assert(!/\bXMLHttpRequest\b|\bFormData\b/i.test(localProcessingSource), 'Image files must not be sent through XHR/FormData');
assert(coreSource.includes('createImageBitmap'), 'Shared image core must decode through createImageBitmap');
assert(coreSource.includes('OffscreenCanvas') && coreSource.includes('drawImage'), 'Shared image core must render through browser canvas');
assert(storeSource.includes('__lpImageWorkspaceV1'), 'Cross-page image workspace store missing');
assert(storeSource.includes('toolState'), 'Per-tool workspace state missing');
assert(bridgeSource.includes('LP_IMAGE_EDITOR_PULL'), 'Extension → workspace bridge missing');
assert(bootstrapSource.includes("astro:page-load"), 'Client navigation workspace bootstrap missing');
assert(resizePage.includes('clientRouter={true}') && cropPage.includes('clientRouter={true}'), 'ClientRouter must be enabled on both image SEO routes');
assert(resizePage.includes('<ImageWorkspaceNav active="resize"') && cropPage.includes('<ImageWorkspaceNav active="crop"'), 'Shared workspace navigation missing');
assert(resizeSource.includes("tool: 'resize_image'"), 'Resize analytics missing');
assert(cropSource.includes("tool: 'crop_image'"), 'Crop analytics missing');

const [memeHtml, memeSource, memePage] = await Promise.all([
  fs.readFile('dist/tools/meme-generator/index.html', 'utf8'),
  fs.readFile('src/scripts/memeImageTool.ts', 'utf8'),
  fs.readFile('src/pages/tools/meme-generator.astro', 'utf8'),
]);

assert(memeHtml.includes('https://layerporter.com/tools/meme-generator/'), 'Meme canonical missing');
assert(memeHtml.includes('Meme generator with draggable text'), 'Meme H1/copy missing');
for (const id of [
  'meme-preview', 'meme-layer-list', 'meme-add-layer', 'meme-text', 'meme-font', 'meme-size',
  'meme-fill', 'meme-stroke', 'meme-stroke-width', 'meme-shadow', 'meme-background-enabled',
  'meme-background-color', 'meme-align', 'meme-rotation', 'meme-action', 'meme-download',
]) {
  assert(memeHtml.includes(`id="${id}"`), `Meme control missing: ${id}`);
}
assert(memeHtml.includes('/tools/crop-image/') && memeHtml.includes('/tools/resize-image/'), 'Meme workspace navigation missing');
assert(resizeHtml.includes('/tools/meme-generator/') && cropHtml.includes('/tools/meme-generator/'), 'Existing image tools must link to Meme');
assert(sitemap.includes('<loc>https://layerporter.com/tools/meme-generator/</loc>'), 'Meme sitemap URL missing');
assert(!/https?:\/\//i.test(memeSource), 'Meme runtime must not depend on remote URLs');
assert(!/\bXMLHttpRequest\b|\bFormData\b/i.test(memeSource), 'Meme image payload must stay in browser runtime');
assert(memeSource.includes("getWorkspaceToolState<MemeState>('meme')"), 'Meme per-tool workspace state missing');
assert(memeSource.includes('setWorkspaceFile(outputFile, workspaceBefore.source)'), 'Meme output must return to shared Workspace');
assert(memeSource.includes("tool: 'meme_generator'"), 'Meme analytics missing');
assert(memePage.includes('clientRouter={true}') && memePage.includes('<ImageWorkspaceNav active="meme"'), 'Meme must use shared client Workspace');
assert(bootstrapSource.includes("path.endsWith('/tools/meme-generator/')"), 'Meme bootstrap route missing');

// Meme Generator static verification: full local browser runtime integrated with shared Image Workspace.
console.log('IMAGE TOOLS STATIC VERIFY PASS — separate SEO URLs + shared client workspace + extension bridge + local runtime');
