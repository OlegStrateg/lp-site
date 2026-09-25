#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { ArtifactStore } from './artifact-store.js';
import { artifactToolResult } from './artifact-result.js';
import { TOOL_HANDLERS } from './tools.js';
import { textResult } from './text-result.js';

const CLOSED_TRANSFORM_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const OPEN_WORLD_READ_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

export function createServer({ artifactStore = new ArtifactStore() } = {}) {
  const server = new McpServer({
    name: 'layerporter-image-optimizer',
    version: '0.1.1',
    title: 'LayerPorter Website Image Optimizer',
    websiteUrl: 'https://layerporter.com/mcp/website-image-optimizer/',
  });

  server.registerResource(
    'optimized-image-artifact',
    new ResourceTemplate('layerporter-artifact://artifact/{id}', { list: undefined }),
    {
      title: 'Optimized image artifact',
      description: 'Ephemeral verified binary output created by LayerPorter image optimization.',
      mimeType: 'application/octet-stream',
    },
    async (uri, { id }) => {
      const artifactId = Array.isArray(id) ? id[0] : String(id);
      const artifact = await artifactStore.read(artifactId);
      return {
        contents: [{
          uri: uri.href,
          blob: artifact.buffer.toString('base64'),
          mimeType: artifact.mimeType,
          _meta: {
            sha256: artifact.sha256,
            size: artifact.size,
            expiresAt: artifact.expiresAt,
          },
        }],
      };
    },
  );

  server.registerTool(
    'analyze_page_images',
    {
      description: 'Analyze normalized browser/page image facts and return deterministic image findings.',
      inputSchema: z.object({ snapshot: z.record(z.string(), z.unknown()) }),
      annotations: CLOSED_TRANSFORM_ANNOTATIONS,
    },
    async ({ snapshot }) => textResult(await TOOL_HANDLERS.analyze_page_images(snapshot)),
  );

  server.registerTool(
    'optimize_image',
    {
      description: 'Optimize one caller-provided image with bounded format, resize and no-regression guards. Accepted output is returned as a temporary MCP resource link, not embedded in model text.',
      inputSchema: z.object({
        imageBase64: z.string().min(1),
        target: z.object({ width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      }),
      annotations: CLOSED_TRANSFORM_ANNOTATIONS,
    },
    async ({ imageBase64, target, policy }) => artifactToolResult(
      await TOOL_HANDLERS.optimize_image({ buffer: Buffer.from(imageBase64, 'base64'), target, policy }),
      artifactStore,
    ),
  );

  server.registerTool(
    'generate_responsive_variants',
    {
      description: 'Generate a bounded set of responsive image variants without upscaling. Accepted variants are exposed as temporary MCP resource links.',
      inputSchema: z.object({
        imageBase64: z.string().min(1),
        widths: z.array(z.number().int().positive()).min(1).max(6),
        maxVariants: z.number().int().min(1).max(6).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      }),
      annotations: CLOSED_TRANSFORM_ANNOTATIONS,
    },
    async ({ imageBase64, widths, maxVariants, policy }) => artifactToolResult(
      await TOOL_HANDLERS.generate_responsive_variants({ buffer: Buffer.from(imageBase64, 'base64'), widths, maxVariants, policy }),
      artifactStore,
    ),
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
      description: 'Optimize a bounded batch of already-selected SAFE image items. Accepted outputs are temporary MCP resource links. Never writes to production.',
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
    async ({ items, maxItems, policy }) => artifactToolResult(
      await TOOL_HANDLERS.optimize_page_images({ items: items.map((item) => ({ ...item, buffer: Buffer.from(item.imageBase64, 'base64') })), maxItems, policy }),
      artifactStore,
    ),
  );

  server.registerTool(
    'analyze_url_images',
    {
      description: 'Safely fetch a public HTTP(S) page and inspect a bounded set of image sources. HTTP fast mode does not claim browser rendered size, currentSrc or LCP.',
      inputSchema: z.object({
        url: z.string().min(1).max(2048),
        maxImages: z.number().int().min(1).max(10).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      }),
      annotations: OPEN_WORLD_READ_ANNOTATIONS,
    },
    async ({ url, maxImages, policy }) => textResult(await TOOL_HANDLERS.analyze_url_images({ url, maxImages, policy })),
  );

  server.registerTool(
    'optimize_url_images',
    {
      description: 'Safely fetch a public HTTP(S) page, recompress a bounded set of image sources at their original dimensions, verify byte savings, and return accepted outputs as temporary MCP resource links. Never writes to the website.',
      inputSchema: z.object({
        url: z.string().min(1).max(2048),
        maxImages: z.number().int().min(1).max(10).optional(),
        policy: z.record(z.string(), z.unknown()).optional(),
      }),
      annotations: OPEN_WORLD_READ_ANNOTATIONS,
    },
    async ({ url, maxImages, policy }) => artifactToolResult(
      await TOOL_HANDLERS.optimize_url_images({ url, maxImages, policy }),
      artifactStore,
    ),
  );

  return server;
}

const artifactStore = new ArtifactStore();
try {
  await serveStdio(() => createServer({ artifactStore }));
} finally {
  await artifactStore.dispose();
}
