#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { TOOL_HANDLERS } from './tools.js';

const server = new McpServer({ name: 'layerporter-image-optimizer', version: '0.1.0' });

const CLOSED_TRANSFORM_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

function textResult(value) {
  const safe = JSON.stringify(value, (key, v) => Buffer.isBuffer(v) ? { type: 'Buffer', byteLength: v.length } : v);
  return { content: [{ type: 'text', text: safe }] };
}

server.registerTool(
  'analyze_page_images',
  {
    description: 'Analyze normalized page image facts and return deterministic image findings.',
    inputSchema: z.object({ snapshot: z.record(z.string(), z.unknown()) }),
    annotations: CLOSED_TRANSFORM_ANNOTATIONS,
  },
  async ({ snapshot }) => textResult(await TOOL_HANDLERS.analyze_page_images(snapshot)),
);

server.registerTool(
  'optimize_image',
  {
    description: 'Optimize one image with bounded format, resize and no-regression guards.',
    inputSchema: z.object({
      imageBase64: z.string().min(1),
      target: z.object({ width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }).optional(),
      policy: z.record(z.string(), z.unknown()).optional(),
    }),
    annotations: CLOSED_TRANSFORM_ANNOTATIONS,
  },
  async ({ imageBase64, target, policy }) => textResult(await TOOL_HANDLERS.optimize_image({ buffer: Buffer.from(imageBase64, 'base64'), target, policy })),
);

server.registerTool(
  'generate_responsive_variants',
  {
    description: 'Generate a bounded set of responsive image variants without upscaling.',
    inputSchema: z.object({
      imageBase64: z.string().min(1),
      widths: z.array(z.number().int().positive()).min(1).max(6),
      maxVariants: z.number().int().min(1).max(6).optional(),
      policy: z.record(z.string(), z.unknown()).optional(),
    }),
    annotations: CLOSED_TRANSFORM_ANNOTATIONS,
  },
  async ({ imageBase64, widths, maxVariants, policy }) => textResult(await TOOL_HANDLERS.generate_responsive_variants({ buffer: Buffer.from(imageBase64, 'base64'), widths, maxVariants, policy })),
);

server.registerTool(
  'compare_image_versions',
  {
    description: 'Compare original and candidate image versions for byte and guard regressions.',
    inputSchema: z.object({
      originalBase64: z.string().min(1),
      candidateBase64: z.string().min(1),
      policy: z.record(z.string(), z.unknown()).optional(),
    }),
    annotations: CLOSED_TRANSFORM_ANNOTATIONS,
  },
  async ({ originalBase64, candidateBase64, policy }) => textResult(await TOOL_HANDLERS.compare_image_versions({ original: Buffer.from(originalBase64, 'base64'), candidate: Buffer.from(candidateBase64, 'base64'), policy })),
);

server.registerTool(
  'optimize_page_images',
  {
    description: 'Optimize a bounded batch of already-selected SAFE image items. Never writes to production.',
    inputSchema: z.object({
      items: z.array(z.object({
        id: z.string().optional(),
        imageBase64: z.string().min(1),
        target: z.object({ width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      })).max(20),
      maxItems: z.number().int().min(1).max(20).optional(),
      policy: z.record(z.string(), z.unknown()).optional(),
    }),
    annotations: CLOSED_TRANSFORM_ANNOTATIONS,
  },
  async ({ items, maxItems, policy }) => textResult(await TOOL_HANDLERS.optimize_page_images({ items: items.map((item) => ({ ...item, buffer: Buffer.from(item.imageBase64, 'base64') })), maxItems, policy })),
);

await serveStdio(server);
