import { describe, expect, it } from 'vitest';

import { OpenAIProvider } from '../../src/providers/openaiProvider.js';
import { exitPlanModeTool } from '../../src/tools/planModeTools.js';

describe('OpenAI Responses tool schema normalization', () => {
  it('streams planning_finish with additionalProperties false for strict function schemas', async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const provider = new OpenAIProvider({
      model: 'gpt-5.4-mini',
      client: {
        responses: {
          create: async (request) => {
            capturedRequest = request as Record<string, unknown>;
            return (async function* () {
              yield { type: 'response.completed', response: { status: 'completed', output: [] } };
            })();
          },
        },
      },
    });

    for await (const _event of provider.stream({
      model: 'gpt-5.4-mini',
      messages: [{ role: 'user', content: '안녕' }],
      tools: [exitPlanModeTool],
    })) {
      // Drain the stream so the provider validates the fake completed response.
    }

    const tools = capturedRequest?.tools;
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'planning_finish',
          parameters: expect.objectContaining({
            additionalProperties: false,
          }),
        }),
      ]),
    );
  });
});
