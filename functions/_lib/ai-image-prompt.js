export const MAX_COMMAND_CHARS = 800;
export const MAX_CONTEXT_TURNS = 6;
export const MAX_REFERENCE_IMAGES = 3;
export const REFERENCE_ROLES = Object.freeze({
  clothing: 'CLOTHING: use the clothing item, colors, cut, patterns and fabric as requested; do not copy the reference person.',
  face: 'FACE/IDENTITY: use only the requested facial appearance; do not change other people or unrelated features.',
  background: 'BACKGROUND: use the background or scene as requested; keep the main subject unless explicitly told otherwise.',
  object: 'OBJECT: use the requested object from the reference image; integrate it naturally.',
  style: 'STYLE: use the lighting/color/visual treatment as requested; do not copy subjects unless asked.'
});
export const MAX_POINT_PRECISION = 4;

export function validatePoint(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['x','y'].includes(k)))
    throw new Error('invalid_point');
  const { x, y } = value;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)
    throw new Error('invalid_point');
  return { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
}

export function validateContext(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_CONTEXT_TURNS) throw new Error('invalid_history');
  return value.map(p => {
    if (typeof p !== 'string' || !p.trim() || p.length > MAX_COMMAND_CHARS) throw new Error('invalid_history');
    return p.trim();
  });
}

export function validateReferenceRoles(value, imageCount) {
  if (!Number.isInteger(imageCount) || imageCount < 0 || imageCount > MAX_REFERENCE_IMAGES ||
      !Array.isArray(value) || value.length !== imageCount)
    throw new Error('invalid_references');
  for (const role of value)
    if (typeof role !== 'string' || !Object.hasOwn(REFERENCE_ROLES, role))
      throw new Error('invalid_references');
  return value;
}

export function buildEditPrompt({ command, context = [], point = null, preserve = true, originalReference = false, referenceRoles = [] }) {
  if (typeof command !== 'string' || !command.trim() || command.length > MAX_COMMAND_CHARS)
    throw new Error('invalid_prompt');
  const history = validateContext(context);
  const position = validatePoint(point);
  validateReferenceRoles(referenceRoles, referenceRoles.length);
  if (typeof preserve !== 'boolean') throw new Error('invalid_preserve');
  const lines = [
    'You are a precision image-editing assistant.',
    'Edit the FIRST attached image. It is the CURRENT working version, containing all previously accepted changes.',
    'The user wants a modification of that image, NOT a wholly new unrelated image.',
  ];
  if (originalReference) lines.push(
    'The SECOND attached image is the ORIGINAL for consistency reference only. Do not undo accepted edits in the first image. Use the second image to preserve the identity, face and scene details when useful.'
  );
  if (referenceRoles.length) {
    const offset = originalReference ? 3 : 2;
    lines.push('USER-ATTACHED REFERENCE IMAGES — optional guidance for THIS instruction, not new base images:');
    for (let i=0;i<referenceRoles.length;i++) {
      lines.push(`Image ${i+offset}: ${REFERENCE_ROLES[referenceRoles[i]]}`);
    }
    lines.push('Image numbering follows the order of attached image files. Do NOT merge all reference images automatically. Apply only what the LATEST USER INSTRUCTION requests.');
  }
  if (preserve) lines.push(
    'Preserve the unchanged parts of the current image: identity, facial geometry, pose, framing, scene, lighting and other details unless the current instruction explicitly changes them. Avoid unintended alterations.'
  );
  if (history.length) lines.push(
    'PREVIOUS ACCEPTED INSTRUCTIONS (context only; already reflected in the FIRST image, do not repeat them):',
    ...history.map((text,i)=>`${i+1}. ${text}`)
  );
  if (position) {
    const x = Math.round(position.x * 100), y = Math.round(position.y * 100);
    const horizontal = x < 34 ? 'left' : x > 66 ? 'right' : 'center';
    const vertical = y < 34 ? 'top' : y > 66 ? 'bottom' : 'middle';
    lines.push(
      `USER POINT OF INTEREST: approximately ${x}% from the left and ${y}% from the top (${vertical}-${horizontal} area) of the FIRST image. These coordinates identify an approximate region, not an exact segmentation mask. Apply the requested change to the intended object near this location; do not draw a marker or text overlay.`
    );
  }
  lines.push('LATEST USER INSTRUCTION (this is the only new change to perform):', command.trim());
  lines.push('Return exactly one edited image without annotations or visible markers.');
  return lines.join('\n');
}
