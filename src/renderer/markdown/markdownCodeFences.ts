export interface MarkdownCodeFence {
  marker: string;
  markerChar: '`' | '~';
  markerLength: number;
  info: string;
  code: string;
  raw: string;
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
}

interface MarkdownFenceFrame {
  marker: string;
  markerChar: '`' | '~';
  markerLength: number;
  info: string;
  start: number;
  contentStart: number;
}

export interface MarkdownFenceInfo {
  lang: string;
  args: string;
}

export function getMarkdownCodeFenceInfo(info: string): MarkdownFenceInfo {
  const [lang = '', ...args] = String(info || '')
    .trim()
    .split(/\s+/);
  return {
    lang: lang.toLowerCase(),
    args: args.join(' ').trim(),
  };
}

export function scanMarkdownCodeFences(source = ''): MarkdownCodeFence[] {
  const input = String(source || '');
  const fences: MarkdownCodeFence[] = [];
  let openFrame: MarkdownFenceFrame | null = null;
  let offset = 0;

  while (offset < input.length) {
    const line = readMarkdownLine(input, offset);
    if (openFrame) {
      if (isMarkdownFenceClosingLine(line.text, openFrame)) {
        fences.push({
          marker: openFrame.marker,
          markerChar: openFrame.markerChar,
          markerLength: openFrame.markerLength,
          info: openFrame.info,
          code: input.slice(openFrame.contentStart, line.start),
          raw: input.slice(openFrame.start, line.end),
          start: openFrame.start,
          end: line.end,
          contentStart: openFrame.contentStart,
          contentEnd: line.start,
        });
        openFrame = null;
      }
      offset = line.end;
      continue;
    }

    const opening = parseMarkdownFenceOpeningLine(line.text);
    if (opening) {
      openFrame = {
        ...opening,
        start: line.start,
        contentStart: line.end,
      };
    }
    offset = line.end;
  }

  return fences;
}

export function findOpenMarkdownCodeFence(source = ''): MarkdownCodeFence | null {
  const input = String(source || '');
  let openFrame: MarkdownFenceFrame | null = null;
  let offset = 0;

  while (offset < input.length) {
    const line = readMarkdownLine(input, offset);
    if (openFrame) {
      if (isMarkdownFenceClosingLine(line.text, openFrame)) {
        openFrame = null;
      }
      offset = line.end;
      continue;
    }

    const opening = parseMarkdownFenceOpeningLine(line.text);
    if (opening) {
      openFrame = {
        ...opening,
        start: line.start,
        contentStart: line.end,
      };
    }
    offset = line.end;
  }

  if (!openFrame) return null;
  return {
    marker: openFrame.marker,
    markerChar: openFrame.markerChar,
    markerLength: openFrame.markerLength,
    info: openFrame.info,
    code: input.slice(openFrame.contentStart),
    raw: input.slice(openFrame.start),
    start: openFrame.start,
    end: input.length,
    contentStart: openFrame.contentStart,
    contentEnd: input.length,
  };
}

export function renderMarkdownCodeFence(marker: string, info: string, code: string): string {
  const normalizedMarker = /^(`{3,}|~{3,})$/.test(marker) ? marker : '```';
  const normalizedInfo = String(info || '').trim();
  const suffix = code.endsWith('\n') ? '' : '\n';
  return `${normalizedMarker}${normalizedInfo}\n${code}${suffix}${normalizedMarker}`;
}

function parseMarkdownFenceOpeningLine(lineText: string): Omit<MarkdownFenceFrame, 'start' | 'contentStart'> | null {
  const match = /^[ \t]{0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(lineText);
  if (!match) return null;
  const marker = match[1];
  return {
    marker,
    markerChar: marker[0] as '`' | '~',
    markerLength: marker.length,
    info: String(match[2] || '').trim(),
  };
}

function isMarkdownFenceClosingLine(lineText: string, frame: MarkdownFenceFrame): boolean {
  const marker = frame.markerChar === '`' ? '`' : '~';
  const pattern = new RegExp(`^[ \\t]{0,3}${marker}{${frame.markerLength},}[ \\t]*$`);
  return pattern.test(lineText);
}

function readMarkdownLine(source: string, start: number): { text: string; start: number; end: number } {
  let index = start;
  while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
  const text = source.slice(start, index);
  if (index < source.length) {
    if (source[index] === '\r' && source[index + 1] === '\n') index += 2;
    else index += 1;
  }
  return { text, start, end: index };
}
