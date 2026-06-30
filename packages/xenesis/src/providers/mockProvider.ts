import type { AgentMessage, ToolCall } from '../core/messages.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from './types.js';

function lastMessage(messages: AgentMessage[]) {
  return messages[messages.length - 1];
}

function parseMockToolPrompt(content: string) {
  const line = content.split(/\r?\n/).find((candidate) => candidate.startsWith('mock:tool:')) ?? content;
  const match = line.match(/^mock:tool:([^:]+):([\s\S]+)$/);
  if (!match) return undefined;
  return {
    name: match[1],
    input: JSON.parse(match[2]),
  };
}

function validateMockToolCall(toolCall: { name: string; input: unknown }, request: ProviderRequest) {
  const tool = request.tools.find((candidate) => candidate.name === toolCall.name);
  if (!tool) {
    throw new Error(`Mock tool "${toolCall.name}" is not available`);
  }

  const result = tool.inputSchema.safeParse(toolCall.input);
  if (!result.success) {
    throw new Error(`Mock tool "${toolCall.name}" received invalid input: ${result.error.message}`);
  }

  return {
    name: toolCall.name,
    input: result.data,
  };
}

function systemContent(messages: AgentMessage[]) {
  return messages
    .filter((message): message is Extract<AgentMessage, { role: 'system' }> => message.role === 'system')
    .map((message) => message.content)
    .join('\n');
}

function messageContent(messages: AgentMessage[]) {
  return messages
    .map((message) => `${message.role}: ${'content' in message ? mockVisibleContent(message.content) : ''}`)
    .join('\n');
}

function xmlUnescape(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function mockVisibleContent(content: string) {
  const match = content.match(/<external_content\b[\s\S]*?<content>\n([\s\S]*?)\n<\/content>\n<\/external_content>/);
  return match?.[1] ? xmlUnescape(match[1]) : content;
}

function assistantToolCalls(messages: AgentMessage[]) {
  return messages
    .filter((message): message is Extract<AgentMessage, { role: 'assistant' }> => message.role === 'assistant')
    .flatMap((message) => message.toolCalls ?? []);
}

function lastToolCall(messages: AgentMessage[], name: string) {
  return assistantToolCalls(messages)
    .reverse()
    .find((toolCall) => toolCall.name === name);
}

function toolResultForCall(messages: AgentMessage[], toolCall: ToolCall) {
  return [...messages]
    .reverse()
    .find(
      (message): message is Extract<AgentMessage, { role: 'tool' }> =>
        message.role === 'tool' && message.toolCallId === toolCall.id,
    );
}

function lastDeniedWriteCall(messages: AgentMessage[]) {
  return assistantToolCalls(messages)
    .reverse()
    .find((toolCall) => {
      if (toolCall.name !== 'write') return false;
      const result = toolResultForCall(messages, toolCall);
      return result
        ? mockVisibleContent(result.content).includes('requires prior evidence tool before file mutation')
        : false;
    });
}

function repairEvidenceReadPath(messages: AgentMessage[]) {
  const content = messageContent(messages);
  const failedNodeScript = content.match(/\$\s+node\s+([^\s)]+\.js)\s+\(exit\s+\d+\)/);
  return failedNodeScript?.[1] ?? 'verify.js';
}

const selfRunAppReadinessPrefix = 'mock:self-run:app-readiness-sequence';
const selfRunServerName = 'mock-self-run-app';
const selfRunAppUrl = 'http://127.0.0.1:49371/';

function hasSelfRunAppReadinessScenario(messages: AgentMessage[]) {
  return (
    messages.some((message) => message.role === 'user' && message.content.startsWith(selfRunAppReadinessPrefix)) ||
    assistantToolCalls(messages).some((toolCall) => toolCall.id.startsWith('mock-self-run-'))
  );
}

function latestSystemMessage(messages: AgentMessage[]) {
  return [...messages]
    .reverse()
    .find((message): message is Extract<AgentMessage, { role: 'system' }> => message.role === 'system');
}

function toolResponse(request: ProviderRequest, id: string, name: string, input: unknown): ProviderResponse {
  const validated = validateMockToolCall({ name, input }, request);
  return {
    message: {
      role: 'assistant',
      content: '',
      toolCalls: [{ id, name: validated.name, input: validated.input }],
    },
  };
}

function fixedSelfRunClientHtml() {
  return [
    '<!doctype html>',
    '<title>Xenesis Self Run</title>',
    '<main>',
    '  <h1>Xenesis Self Run OK</h1>',
    '  <p>The repaired app renders concrete text without broken values.</p>',
    '</main>',
    '<script>',
    "const status = 'ready';",
    'document.body.dataset.status = status;',
    '</script>',
    '',
  ].join('\n');
}

function selfRunAppReadinessResponse(request: ProviderRequest): ProviderResponse | undefined {
  if (!hasSelfRunAppReadinessScenario(request.messages)) return undefined;

  const last = lastMessage(request.messages);
  const latestSystem = latestSystemMessage(request.messages)?.content ?? '';
  const lastToolContent = last?.role === 'tool' ? mockVisibleContent(last.content) : '';

  if (last?.role === 'user' && last.content.startsWith(selfRunAppReadinessPrefix)) {
    return toolResponse(request, 'mock-self-run-readiness-1', 'app_readiness', {});
  }

  if (last?.role === 'system' && latestSystem.includes('Xenesis verification recovery required')) {
    return toolResponse(request, 'mock-self-run-read-client', 'read', { path: 'client.html' });
  }

  if (last?.role === 'tool' && last.name === 'read') {
    return toolResponse(request, 'mock-self-run-write-client', 'write', {
      path: 'client.html',
      content: fixedSelfRunClientHtml(),
    });
  }

  if (last?.role === 'tool' && last.name === 'write') {
    return {
      message: { role: 'assistant', content: 'Patched the readiness issue.' },
    };
  }

  if (last?.role === 'system' && latestSystem.includes('Run the next app verification step: app_readiness')) {
    return toolResponse(request, 'mock-self-run-readiness-2', 'app_readiness', {});
  }

  if (last?.role === 'tool' && last.name === 'app_readiness') {
    if (/status:\s*pass/i.test(lastToolContent)) {
      return {
        message: { role: 'assistant', content: 'Readiness now passes.' },
      };
    }
    return {
      message: {
        role: 'assistant',
        content: 'Readiness failed; I need to inspect and repair the concrete client defect.',
      },
    };
  }

  if (last?.role === 'system' && latestSystem.includes('Run the next app verification step: diagnostics')) {
    return toolResponse(request, 'mock-self-run-diagnostics', 'diagnostics', {
      script: 'test',
      timeoutMs: 15_000,
      maxOutputChars: 12_000,
    });
  }

  if (last?.role === 'tool' && last.name === 'diagnostics') {
    return {
      message: { role: 'assistant', content: 'Diagnostics now passes.' },
    };
  }

  if (last?.role === 'system' && latestSystem.includes('Run the next app verification step: app_e2e_check')) {
    return toolResponse(request, 'mock-self-run-server-start', 'server', {
      action: 'start',
      name: selfRunServerName,
      command: 'node server.js',
      cwd: '.',
      readinessUrl: selfRunAppUrl,
      readinessTimeoutMs: 10_000,
    });
  }

  if (last?.role === 'tool' && last.name === 'server' && /server started|readiness:\s*pass/i.test(lastToolContent)) {
    return toolResponse(request, 'mock-self-run-e2e', 'app_e2e_check', {
      url: selfRunAppUrl,
      expectedText: ['Xenesis Self Run OK'],
      forbiddenText: ['undefined', 'NaN', '[object Object]'],
      minTextLength: 20,
      minInteractiveElements: 0,
    });
  }

  if (last?.role === 'tool' && last.name === 'app_e2e_check') {
    return toolResponse(request, 'mock-self-run-server-stop', 'server', {
      action: 'stop',
      name: selfRunServerName,
    });
  }

  if (last?.role === 'tool' && last.name === 'server' && /server stopped/i.test(lastToolContent)) {
    return {
      message: { role: 'assistant', content: 'mock self-run complete: app verification sequence passed' },
    };
  }

  return undefined;
}

export class MockProvider implements AgentProvider {
  name = 'mock';

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const last = lastMessage(request.messages);

    const selfRunResponse = selfRunAppReadinessResponse(request);
    if (selfRunResponse) return selfRunResponse;

    if (last?.role === 'tool') {
      const lastToolContent = mockVisibleContent(last.content);
      const deniedWrite =
        last.name === 'write' && lastToolContent.includes('requires prior evidence tool before file mutation')
          ? lastToolCall(request.messages, 'write')
          : undefined;
      if (deniedWrite) {
        const readCall = validateMockToolCall(
          {
            name: 'read',
            input: { path: repairEvidenceReadPath(request.messages) },
          },
          request,
        );
        return {
          message: {
            role: 'assistant',
            content: '',
            toolCalls: [{ id: 'mock-call-read-evidence', name: readCall.name, input: readCall.input }],
          },
        };
      }

      if (last.name === 'read') {
        const writeCall = lastDeniedWriteCall(request.messages);
        if (writeCall) {
          const validated = validateMockToolCall(
            {
              name: writeCall.name,
              input: writeCall.input,
            },
            request,
          );
          return {
            message: {
              role: 'assistant',
              content: '',
              toolCalls: [{ id: 'mock-call-retry-write', name: validated.name, input: validated.input }],
            },
          };
        }
      }

      return {
        message: { role: 'assistant', content: `mock final: ${lastToolContent}` },
      };
    }

    if (last?.role === 'user') {
      if (last.content.startsWith('mock:system')) {
        return {
          message: { role: 'assistant', content: systemContent(request.messages) || 'mock system: none' },
        };
      }

      if (last.content === 'mock:messages') {
        return {
          message: { role: 'assistant', content: messageContent(request.messages) },
        };
      }

      const tool = parseMockToolPrompt(last.content);
      if (tool) {
        const validated = validateMockToolCall(tool, request);
        return {
          message: {
            role: 'assistant',
            content: '',
            toolCalls: [{ id: 'mock-call-1', name: validated.name, input: validated.input }],
          },
        };
      }

      return {
        message: { role: 'assistant', content: `mock response: ${last.content}` },
      };
    }

    return {
      message: { role: 'assistant', content: 'mock response' },
    };
  }
}
