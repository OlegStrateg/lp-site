import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIResponsesResearchProvider } from '../src/openai-responses-provider.js';

function outputResponse(value) {
  return new Response(JSON.stringify({
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify(value) }],
    }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('triage uses Luna, structured output and store=false without web search', async () => {
  let requestBody;
  const provider = new OpenAIResponsesResearchProvider({
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return outputResponse({
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
      });
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
    return outputResponse({
      competency: 'website-image-optimization',
      shouldResearch: false,
      reason: 'no research needed',
      features: {
        relevance: 0.1,
        novelty: 0.1,
        evidence: 0.1,
        participantQuality: 0.1,
        continuation: 0.1,
        externalArtifact: 0,
        noise: 0,
        risk: 0,
        cost: 0.1,
      },
    });
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
      return outputResponse({
        action: 'reply',
        evidenceScore: 0.9,
        reason: 'verified contribution',
        body: 'Claim. Evidence. Method. Limits.',
        evidence: [{ url: 'https://example.com', claim: 'x', support: 'supports' }],
        claims: [{ text: 'x', status: 'verified', presentedAsFact: true }],
      });
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
