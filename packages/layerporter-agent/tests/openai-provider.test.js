import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIResponsesResearchProvider } from '../src/openai-responses-provider.js';

function outputResponse(value, usage = null) {
  return new Response(JSON.stringify({
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify(value) }],
    }],
    usage,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function triageValue(overrides = {}) {
  return {
    competency: 'website-image-optimization',
    shouldResearch: true,
    reason: 'relevant',
    features: {
      relevance: 1,
      novelty: 0.8,
      evidence: 0.9,
      participantQuality: 0.8,
      continuation: 0.6,
      externalArtifact: 0.5,
      noise: 0,
      risk: 0,
      cost: 0.1,
    },
    ...overrides,
  };
}

function researchValue() {
  return {
    action: 'reply',
    evidenceScore: 0.9,
    reason: 'verified contribution',
    body: 'Claim. Evidence. Method. Limits.',
    evidence: [{ url: 'https://example.com', claim: 'x', support: 'supports' }],
    claims: [{ text: 'x', status: 'verified', presentedAsFact: true }],
  };
}

test('triage uses Luna, structured output and store=false without web search', async () => {
  let requestBody;
  const provider = new OpenAIResponsesResearchProvider({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return outputResponse(triageValue());
    },
  });

  await provider.triage({ message: { body: 'untrusted forum text' } });
  assert.equal(requestBody.model, 'gpt-5.6-luna');
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.reasoning.effort, 'low');
  assert.equal(requestBody.tools, undefined);
  assert.equal(requestBody.text.format.type, 'json_schema');
  assert.equal(requestBody.text.format.strict, true);
});

test('OpenAI provider invokes injected fetch without rebinding this to the provider', async () => {
  async function receiverSensitiveFetch(_url, init) {
    assert.equal(this, undefined);
    const requestBody = JSON.parse(init.body);
    assert.equal(requestBody.model, 'gpt-5.6-luna');
    return outputResponse(triageValue({ shouldResearch: false, reason: 'no research needed' }));
  }

  const provider = new OpenAIResponsesResearchProvider({
    apiKey: 'test-key',
    fetchImpl: receiverSensitiveFetch,
  });

  const result = await provider.triage({ message: { body: 'untrusted forum text' } });
  assert.equal(result.shouldResearch, false);
});

test('research uses Terra with bounded web search and structured output', async () => {
  let requestBody;
  const provider = new OpenAIResponsesResearchProvider({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return outputResponse(researchValue());
    },
  });

  await provider.research({ source: { body: 'untrusted forum text' } });
  assert.equal(requestBody.model, 'gpt-5.6-terra');
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.reasoning.effort, 'medium');
  assert.equal(requestBody.max_tool_calls, 6);
  assert.equal(requestBody.tools[0].type, 'web_search');
  assert.equal(requestBody.tools[0].search_context_size, 'medium');
  assert.equal(requestBody.text.format.type, 'json_schema');
  assert.equal(requestBody.text.format.strict, true);
});

test('provider aggregates exact Responses API usage across triage and research', async () => {
  let call = 0;
  const provider = new OpenAIResponsesResearchProvider({
    apiKey: 'test-key',
    fetchImpl: async () => {
      call += 1;
      if (call === 1) {
        return outputResponse(triageValue(), { input_tokens: 101, output_tokens: 17, total_tokens: 118 });
      }
      return outputResponse(researchValue(), { input_tokens: 303, output_tokens: 79, total_tokens: 382 });
    },
  });

  await provider.triage({ message: { body: 'x' } });
  await provider.research({ source: { body: 'x' } });
  assert.deepEqual(provider.getUsage(), {
    requests: 2,
    inputTokens: 404,
    outputTokens: 96,
    totalTokens: 500,
  });
});
