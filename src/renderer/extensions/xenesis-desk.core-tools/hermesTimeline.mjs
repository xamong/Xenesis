function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function itemMillis(item) {
  const millis = Date.parse(item.at || '');
  return Number.isFinite(millis) ? millis : 0;
}

function fileNameFromPath(filePath) {
  const text = cleanText(filePath, 1000);
  if (!text) return '';
  return text.replace(/\\/g, '/').split('/').filter(Boolean).pop() || text;
}

function artifactTitle(artifact, index) {
  return (
    cleanText(artifact?.title, 240) ||
    fileNameFromPath(artifact?.filePath) ||
    cleanText(artifact?.kind, 120) ||
    `Artifact ${index + 1}`
  );
}

function messageText(content) {
  return cleanText(content, 220).replace(/\s+/g, ' ');
}

function timelineId(parts) {
  return parts
    .map((part) => cleanText(part, 200).replace(/\s+/g, '-'))
    .filter(Boolean)
    .join(':');
}

function itemSearchText(item) {
  return [
    item?.title,
    item?.summary,
    item?.sessionId,
    item?.messageId,
    item?.status,
    item?.kind,
    item?.filePath,
    item?.openCommand,
    item?.focusCommand,
    item?.command,
    item?.result,
    item?.error,
  ]
    .map((value) => cleanText(value, 4000).toLowerCase())
    .filter(Boolean)
    .join('\n');
}

export function filterHermesTimelineItems(items = [], filters = {}) {
  const type = cleanText(filters.type, 40).toLowerCase();
  const sessionId = cleanText(filters.sessionId, 200);
  const queryTokens = cleanText(filters.query, 500).toLowerCase().split(/\s+/).filter(Boolean);
  return asArray(items).filter((item) => {
    if (type && type !== 'all' && item?.type !== type) return false;
    if (sessionId && sessionId !== 'all' && item?.sessionId !== sessionId) return false;
    if (queryTokens.length) {
      const searchText = itemSearchText(item);
      if (queryTokens.some((token) => !searchText.includes(token))) return false;
    }
    return true;
  });
}

function quoteXdCommandArg(value) {
  return `"${String(value || '').replace(/"/g, '\\"')}"`;
}

export function timelineArtifactOpenCommand(item = {}) {
  const command = cleanText(item.openCommand, 1000);
  if (command) return command;
  const filePath = cleanText(item.filePath, 1000);
  return filePath ? `/xd open ${quoteXdCommandArg(filePath)}` : '';
}

export function timelineArtifactFocusCommand(item = {}) {
  const command = cleanText(item.focusCommand, 1000);
  if (command) return command;
  return timelineArtifactOpenCommand(item);
}

function markdownLine(label, value) {
  const text = cleanText(value, 4000);
  return text ? `- ${label}: ${text}` : '';
}

function markdownCodeLine(label, value) {
  const text = cleanText(value, 4000);
  return text ? `- ${label}: \`${text.replace(/`/g, '\\`')}\`` : '';
}

function fencedBlock(value) {
  const text = cleanText(value, 4000);
  return text ? `\`\`\`text\n${text}\n\`\`\`` : '';
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => cleanText(value, 4000)).filter(Boolean))];
}

function workPacketContent(value) {
  return typeof value === 'string' ? value.trim().slice(0, 60000) : '';
}

function workPacketItemCount(content) {
  const match = content.match(/^Selected items:\s*(\d+)/m);
  if (!match) return 0;
  const count = Number.parseInt(match[1], 10);
  return Number.isFinite(count) ? count : 0;
}

function workPacketTitle(count) {
  if (!count) return 'Work Packet';
  return `Work Packet - ${count} ${count === 1 ? 'item' : 'items'}`;
}

function workPacketSummary(content, session) {
  const generatedLine = content.match(/^Generated:\s*(.+)$/m)?.[0] || '';
  const selectedLine = content.match(/^Selected items:\s*(.+)$/m)?.[0] || '';
  return [generatedLine, selectedLine, cleanText(session?.title, 200)].filter(Boolean).join(' / ');
}

function receiptCommandLine(line, commandPattern) {
  const match = cleanText(line, 4000).match(/^(\d+)\.\s+(.+?)\s+->\s+(\/xd packet (?:open|replay) #\d+)\s*$/);
  if (!match || !commandPattern.test(match[3])) return null;
  const index = Number.parseInt(match[1], 10);
  if (!Number.isFinite(index)) return null;
  return {
    index,
    label: cleanText(match[2], 4000),
    command: cleanText(match[3], 4000),
  };
}

function workPacketReceiptSections(content) {
  const sections = { artifacts: [], replay: [] };
  let section = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = cleanText(rawLine, 4000);
    const normalized = line.toLowerCase();
    if (normalized === 'artifact paths:') {
      section = 'artifacts';
      continue;
    }
    if (normalized === 'replay commands:') {
      section = 'replay';
      continue;
    }
    if (normalized === 'next:') {
      section = '';
      continue;
    }
    if (!line || !section) continue;
    sections[section].push(line);
  }
  return sections;
}

function workPacketReceiptArtifactPaths(content) {
  const { artifacts } = workPacketReceiptSections(content);
  return artifacts
    .map((line) => receiptCommandLine(line, /^\/xd packet open #\d+$/))
    .filter(Boolean)
    .map((item) => ({
      index: item.index,
      path: item.label,
      command: item.command,
    }));
}

function workPacketReceiptReplayCommands(content) {
  const { replay } = workPacketReceiptSections(content);
  return replay.map((line) => receiptCommandLine(line, /^\/xd packet replay #\d+$/)).filter(Boolean);
}

function workPacketReceiptTitle(count) {
  if (!count) return 'Packet received';
  return `Packet received - ${count} ${count === 1 ? 'item' : 'items'}`;
}

function workPacketReceiptSummary(content) {
  const generatedLine = content.match(/^Generated:\s*(.+)$/m)?.[0] || '';
  const selectedLine = content.match(/^Selected items:\s*(.+)$/m)?.[0] || '';
  const artifactCount = workPacketReceiptArtifactPaths(content).length;
  const replayCount = workPacketReceiptReplayCommands(content).length;
  const commandLine = `${artifactCount} artifact ${artifactCount === 1 ? 'path' : 'paths'}, ${replayCount} replay ${replayCount === 1 ? 'command' : 'commands'}`;
  return [generatedLine, selectedLine, commandLine].filter(Boolean).join(' / ');
}

function messageXenisMetadata(message) {
  return message?.xenesis_desk && typeof message.xenesis_desk === 'object' && !Array.isArray(message.xenesis_desk)
    ? message.xenesis_desk
    : {};
}

function workPacketReceiptActionStatus(message) {
  if (message?.streaming) return 'running';
  if (message?.role === 'system') return 'failed';
  if (message?.role === 'assistant') return 'completed';
  return 'sent';
}

function workPacketReceiptActions(session, receiptMessage) {
  const sessionId = cleanText(session?.id, 200) || 'xenesis-bot';
  const receiptMessageId = cleanText(receiptMessage?.id, 200);
  const latestByCommand = new Map();
  for (const message of asArray(session?.messages)) {
    if (!message || message.id === receiptMessageId) continue;
    const xenesisDesk = messageXenisMetadata(message);
    if (cleanText(xenesisDesk.mode, 200) !== 'work-packet-receipt') continue;
    if (cleanText(xenesisDesk.sourceMessageId, 200) !== receiptMessageId) continue;
    const command = cleanText(xenesisDesk.packetCommand || (message.role === 'user' ? message.content : ''), 1000);
    if (!command) continue;
    const at = cleanText(message.updatedAt || message.createdAt || session?.updatedAt, 80) || new Date(0).toISOString();
    const action = {
      id: timelineId(['work-packet-receipt-action', sessionId, receiptMessageId, command]),
      command,
      status: workPacketReceiptActionStatus(message),
      at,
      messageId: cleanText(message.id, 200),
      role: cleanText(message.role, 40),
      summary: messageText(message.content),
    };
    const current = latestByCommand.get(command);
    if (!current || itemMillis(action) >= itemMillis(current)) {
      latestByCommand.set(command, action);
    }
  }
  return [...latestByCommand.values()]
    .sort((left, right) => itemMillis(right) - itemMillis(left) || String(right.id).localeCompare(String(left.id)))
    .slice(0, 20);
}

export function buildHermesArtifactControlItems(artifactEvents = []) {
  return asArray(artifactEvents)
    .map((event) => {
      const id = cleanText(event?.id, 200);
      if (!id) return null;
      const action = cleanText(event?.action, 80) || 'artifact-action';
      const label = cleanText(event?.label, 240) || action;
      const detail = cleanText(event?.detail, 1000);
      const artifactId = cleanText(event?.artifactId, 200);
      return {
        id: timelineId(['artifact-control', id]),
        type: 'artifact-control',
        at: cleanText(event?.at, 80) || new Date(0).toISOString(),
        title: label,
        summary: detail,
        sessionId: 'artifact-library',
        messageId: artifactId || id,
        status: action,
        kind: action,
        result: detail,
      };
    })
    .filter(Boolean)
    .sort((left, right) => itemMillis(right) - itemMillis(left) || String(right.id).localeCompare(String(left.id)))
    .slice(0, 200);
}

export function buildHermesWorkPacketHistoryItems(sessions = []) {
  return asArray(sessions)
    .flatMap((session) =>
      asArray(session?.messages)
        .map((message) => {
          const content = workPacketContent(message?.content);
          if (message?.role !== 'user' || !content.startsWith('# Hermes Work Packet')) return null;
          const sessionId = cleanText(session?.id, 200) || 'xenesis-bot';
          const messageId = cleanText(message?.id, 200);
          if (!messageId) return null;
          const itemCount = workPacketItemCount(content);
          return {
            id: timelineId(['work-packet', sessionId, messageId]),
            sessionId,
            messageId,
            at:
              cleanText(message?.updatedAt || message?.createdAt || session?.updatedAt, 80) ||
              new Date(0).toISOString(),
            title: workPacketTitle(itemCount),
            summary: workPacketSummary(content, session),
            content,
            itemCount,
          };
        })
        .filter(Boolean),
    )
    .sort((left, right) => itemMillis(right) - itemMillis(left) || String(right.id).localeCompare(String(left.id)))
    .slice(0, 20);
}

export function buildHermesWorkPacketReceiptItems(sessions = []) {
  return asArray(sessions)
    .flatMap((session) =>
      asArray(session?.messages)
        .map((message) => {
          const content = workPacketContent(message?.content);
          if (message?.role !== 'assistant' || !content.startsWith('Xenesis Desk Work Packet:')) return null;
          const sessionId = cleanText(session?.id, 200) || 'xenesis-bot';
          const messageId = cleanText(message?.id, 200);
          if (!messageId) return null;
          const itemCount = workPacketItemCount(content);
          return {
            id: timelineId(['work-packet-receipt', sessionId, messageId]),
            sessionId,
            messageId,
            at:
              cleanText(message?.updatedAt || message?.createdAt || session?.updatedAt, 80) ||
              new Date(0).toISOString(),
            title: workPacketReceiptTitle(itemCount),
            summary: workPacketReceiptSummary(content),
            content,
            itemCount,
            artifactPaths: workPacketReceiptArtifactPaths(content),
            replayCommands: workPacketReceiptReplayCommands(content),
            actions: workPacketReceiptActions(session, message),
          };
        })
        .filter(Boolean),
    )
    .sort((left, right) => itemMillis(right) - itemMillis(left) || String(right.id).localeCompare(String(left.id)))
    .slice(0, 20);
}

function actionItem(action) {
  const id = cleanText(action?.id, 200);
  if (!id) return null;
  const title = cleanText(action?.title, 240) || cleanText(action?.command, 240) || 'Hermes Action';
  const at = cleanText(action?.updatedAt || action?.createdAt, 80) || new Date(0).toISOString();
  return {
    id: timelineId(['approval', id]),
    type: 'approval',
    at,
    title,
    summary: cleanText(action?.description || action?.command, 500),
    sessionId: cleanText(action?.sessionId, 200) || 'xenesis-bot',
    messageId: id,
    status: cleanText(action?.status, 80) || 'pending',
    command: cleanText(action?.command, 4000),
    result: cleanText(action?.result, 1000),
    error: cleanText(action?.error, 1000),
  };
}

function artifactItemsForMessage(session, message) {
  return asArray(message?.artifacts).map((artifact, index) => {
    const title = artifactTitle(artifact, index);
    const filePath = cleanText(artifact?.filePath, 1000);
    const kind = cleanText(artifact?.kind, 120);
    const messageSummary = messageText(message?.content);
    return {
      id: timelineId(['artifact', session.id, message.id, String(index)]),
      type: 'artifact',
      at: cleanText(message?.updatedAt || message?.createdAt || session.updatedAt, 80) || new Date(0).toISOString(),
      title,
      summary: filePath || messageSummary || kind,
      sessionId: cleanText(session.id, 200) || 'xenesis-bot',
      messageId: cleanText(message?.id, 200),
      status: cleanText(session.status, 80),
      kind,
      filePath,
      openCommand: cleanText(artifact?.openCommand, 1000),
      focusCommand: cleanText(artifact?.focusCommand, 1000),
    };
  });
}

export function buildHermesTimelineItems(input = {}) {
  const actions = asArray(input.actionInbox).map(actionItem).filter(Boolean);
  const artifacts = asArray(input.sessions).flatMap((session) =>
    asArray(session?.messages).flatMap((message) => artifactItemsForMessage(session || {}, message || {})),
  );
  const artifactControls = buildHermesArtifactControlItems(input.artifactEvents);
  return [...actions, ...artifacts, ...artifactControls]
    .sort((left, right) => itemMillis(right) - itemMillis(left) || String(right.id).localeCompare(String(left.id)))
    .slice(0, 200);
}

export function buildHermesTimelineMarkdownFromItems(items = [], options = {}) {
  const timelineItems = asArray(items);
  const artifactCount = timelineItems.filter((item) => item.type === 'artifact').length;
  const approvalCount = timelineItems.filter((item) => item.type === 'approval').length;
  const artifactControlCount = timelineItems.filter((item) => item.type === 'artifact-control').length;
  const countLabel = artifactControlCount
    ? `${artifactCount} artifacts, ${approvalCount} approvals, ${artifactControlCount} artifact actions`
    : `${artifactCount} artifacts, ${approvalCount} approvals`;
  const generatedAt = cleanText(options.generatedAt, 80) || new Date().toISOString();
  const lines = [
    '# Hermes Timeline Export',
    '',
    `Generated: ${generatedAt}`,
    `Items: ${timelineItems.length} (${countLabel})`,
    '',
  ];

  if (!timelineItems.length) {
    lines.push('No Hermes activity recorded.');
    return `${lines.join('\n')}\n`;
  }

  for (const item of timelineItems) {
    lines.push(`## ${item.at || 'unknown time'} - ${item.title || 'Hermes Timeline Item'}`);
    lines.push(
      ...[
        markdownLine('Type', item.type),
        markdownLine('Session', item.sessionId),
        markdownLine('Status', item.status),
        markdownLine('Kind', item.kind),
        markdownCodeLine('File', item.filePath),
        markdownCodeLine('Open', item.openCommand),
        markdownCodeLine('Focus', item.focusCommand),
      ].filter(Boolean),
    );

    if (item.summary) {
      lines.push('', item.summary);
    }
    if (item.command) {
      lines.push('', 'Command:', '', fencedBlock(item.command));
    }
    if (item.result || item.error) {
      lines.push('', item.error ? 'Error:' : 'Result:', '', fencedBlock(item.error || item.result));
    }
    lines.push('');
  }

  return `${lines
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trimEnd()}\n`;
}

export function buildHermesTimelineMarkdown(input = {}, options = {}) {
  return buildHermesTimelineMarkdownFromItems(buildHermesTimelineItems(input), options);
}

export function buildHermesTimelineWorkPacketMarkdown(items = [], options = {}) {
  const timelineItems = asArray(items);
  const artifactCount = timelineItems.filter((item) => item.type === 'artifact').length;
  const approvalCount = timelineItems.filter((item) => item.type === 'approval').length;
  const artifactControlCount = timelineItems.filter((item) => item.type === 'artifact-control').length;
  const countLabel = artifactControlCount
    ? `${artifactCount} artifacts, ${approvalCount} approvals, ${artifactControlCount} artifact actions`
    : `${artifactCount} artifacts, ${approvalCount} approvals`;
  const generatedAt = cleanText(options.generatedAt, 80) || new Date().toISOString();
  const artifactPaths = uniqueStrings(timelineItems.map((item) => item.filePath));
  const replayCommands = uniqueStrings(
    timelineItems.flatMap((item) => [
      timelineArtifactOpenCommand(item),
      timelineArtifactFocusCommand(item),
      item.type === 'approval' ? item.command : '',
    ]),
  );
  const lines = [
    '# Hermes Work Packet',
    '',
    `Generated: ${generatedAt}`,
    `Selected items: ${timelineItems.length} (${countLabel})`,
    '',
    '## Continuation Prompt',
    '',
    'Continue the Xenesis Desk Hermes workflow using this work packet. Use the artifact paths and replay commands below before changing files, and preserve the session context listed in the timeline details.',
    '',
    '## Artifact Paths',
    '',
  ];

  if (artifactPaths.length) {
    lines.push(...artifactPaths.map((filePath) => `- \`${filePath.replace(/`/g, '\\`')}\``));
  } else {
    lines.push('- No artifact paths selected.');
  }

  lines.push('', '## Replay Commands', '');
  if (replayCommands.length) {
    lines.push(...replayCommands.map((command) => `- \`${command.replace(/`/g, '\\`')}\``));
  } else {
    lines.push('- No replay commands available.');
  }

  lines.push('', '## Timeline Details', '');
  if (!timelineItems.length) {
    lines.push('No Hermes activity selected.');
    return `${lines.join('\n')}\n`;
  }

  for (const item of timelineItems) {
    lines.push(`### ${item.at || 'unknown time'} - ${item.title || 'Hermes Timeline Item'}`);
    lines.push(
      ...[
        markdownLine('Type', item.type),
        markdownLine('Session', item.sessionId),
        markdownLine('Message', item.messageId),
        markdownLine('Status', item.status),
        markdownLine('Kind', item.kind),
        markdownCodeLine('File', item.filePath),
      ].filter(Boolean),
    );
    if (item.summary) {
      lines.push('', item.summary);
    }
    if (item.command) {
      lines.push('', 'Command:', '', fencedBlock(item.command));
    }
    if (item.result || item.error) {
      lines.push('', item.error ? 'Error:' : 'Result:', '', fencedBlock(item.error || item.result));
    }
    lines.push('');
  }

  return `${lines
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trimEnd()}\n`;
}
