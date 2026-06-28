import { listDeskBridgeCapabilities } from './deskBridgeCapabilities';
import { XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS } from './xenesisDeskControlPromptHintCatalog';
import {
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  XENESIS_DESK_ACTION_PROTOCOL_PATTERNS,
  XENESIS_DESK_ACTION_PROTOCOL_TEXT,
} from './xenesisNaturalLanguageCatalog';

export function isXenesisDeskCapabilityPathUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}${XENESIS_DESK_ACTION_PROTOCOL_FORMAT.capabilityPathSeparator}`);
}

export function buildXenesisDeskRegistryCapabilityPathSummary(prefixes: readonly string[]): string {
  return listDeskBridgeCapabilities()
    .filter((node) => node.callable)
    .map((node) => node.path)
    .filter((path) => prefixes.some((prefix) => isXenesisDeskCapabilityPathUnderPrefix(path, prefix)))
    .sort()
    .join(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.listSeparator);
}

export function buildXenesisDeskDirectCrPathSummary(lines: readonly string[]): string {
  const callablePaths = new Set(
    listDeskBridgeCapabilities()
      .filter((node) => node.callable)
      .map((node) => node.path),
  );
  const referencedPaths = new Set<string>();
  for (const line of lines) {
    for (const match of line.matchAll(XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.crPath)) {
      const path = match[0].replace(
        XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.trailingCrPathPunctuation,
        XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
      );
      if (callablePaths.has(path)) {
        referencedPaths.add(path);
      }
    }
  }
  return [...referencedPaths].join(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.listSeparator);
}

export function buildXenesisDeskControlPromptHint(): string {
  const lines = XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS.flatMap((section) => {
    if (section.kind === 'static') return [...section.lines];
    return [
      `${section.linePrefix}${buildXenesisDeskRegistryCapabilityPathSummary(section.prefixes)}${XENESIS_DESK_ACTION_PROTOCOL_FORMAT.sentenceTerminator}`,
    ];
  });
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    ...lines,
    XENESIS_DESK_ACTION_PROTOCOL_TEXT.usefulDirectCrPaths(buildXenesisDeskDirectCrPathSummary(lines)),
  ]);
}
