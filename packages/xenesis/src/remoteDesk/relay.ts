export interface RemoteDeskStreamFilterState {
  toolOutputContinuationBudget: number;
  editBlockContinuationBudget: number;
}

const remoteDeskToolOutputContinuationBudget = 12;
const remoteDeskEditBlockContinuationBudget = 160;

export function relayStreamText(
  event: Record<string, unknown>,
  state?: RemoteDeskStreamFilterState,
) {
  const canonical = canonicalRelayStreamText(event);
  if (canonical !== undefined) return canonical;
  return legacyStreamText(event, state);
}

export function compactStreamOutput(lines: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line || seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }
  return result.slice(-8);
}

function canonicalRelayStreamText(event: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(event, "relay")) return undefined;
  if (stringValue(event.relay).trim().toLowerCase() !== "allow") return "";
  const text = stringValue(event.relayText)
    || stringValue(event.streamText)
    || stringValue(event.text)
    || stringValue(event.content)
    || stringValue(event.data);
  return safeCanonicalRelayText(text);
}

function safeCanonicalRelayText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isCanonicalRelayControlLine(line))
    .join("\n")
    .trim();
}

function isCanonicalRelayControlLine(line: string) {
  const normalized = normalizeRemoteDeskLineForClassification(line);
  if (!normalized) return true;
  if (/[\b\u001b\r]/.test(line)) return true;
  if (/^(?:Output|Manual input sent|Automatic input sent|수동\s*전송|자동\s*전송)$/i.test(normalized)) return true;
  if (/^(?:PS|pwsh|powershell|cmd)(?:\s+[A-Z]:\\|\s+~|\s*>|\s*$)/i.test(normalized)) return true;
  if (/^PS\s+[^>]+>\s*[\s\S]*$/i.test(normalized)) return true;
  if (/^(?:echo|Write-Output|printf|Write-Host)\b/i.test(normalized)) return true;
  if (/\b(?:echo|Write-Output)\b[\s\S]*\b(?:echo|Write-Output)\b/i.test(normalized)) return true;
  if (isNoisyStreamText(line)) {
    const visible = normalizeRemoteDeskVisibleLine(line);
    if (visible === line || isNoisyStreamText(visible)) return true;
  }
  return false;
}

function legacyStreamText(
  event: Record<string, unknown>,
  state: RemoteDeskStreamFilterState = { toolOutputContinuationBudget: 0, editBlockContinuationBudget: 0 },
) {
  const lines: string[] = [];
  for (const line of stringValue(event.streamText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)) {
    if (startsRemoteDeskEditBlockContext(line)) {
      state.editBlockContinuationBudget = remoteDeskEditBlockContinuationBudget;
      continue;
    }
    if (state.editBlockContinuationBudget > 0) {
      if (!isRemoteDeskNarrativeBoundary(line)) {
        state.editBlockContinuationBudget -= 1;
        continue;
      }
      state.editBlockContinuationBudget = 0;
    }
    if (startsRemoteDeskToolOutputContext(line)) {
      state.toolOutputContinuationBudget = remoteDeskToolOutputContinuationBudget;
      continue;
    }
    if (isRemoteDeskInternalCommandLine(line)) continue;
    if (state.toolOutputContinuationBudget > 0) {
      if (!isRemoteDeskNarrativeBoundary(line)) {
        state.toolOutputContinuationBudget -= 1;
        continue;
      }
      state.toolOutputContinuationBudget = 0;
    }
    if (isRemoteDeskClippedNumericArtifactLine(normalizeRemoteDeskLineForClassification(line))) continue;
    if (isNoisyStreamText(line)) continue;
    const visible = normalizeRemoteDeskVisibleLine(line);
    if (visible) lines.push(visible);
  }
  return lines.join("\n");
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function isNoisyStreamText(text: string) {
  if (!text) return true;
  const trimmed = text.trim();
  const normalized = normalizeRemoteDeskLineForClassification(trimmed);
  if (!normalized) return true;
  if (isRemoteDeskInternalCommandLine(trimmed)) return true;
  if (/^›\s*/.test(trimmed)) return true;
  if (/^[─\-\s]+$/.test(normalized)) return true;
  if (/^[│└]\s*/.test(trimmed)) return true;
  if (/^[✔□]\s+/.test(trimmed)) return true;
  if (/^…\s+\+\d+\s+lines\b/i.test(normalized)) return true;
  if (isRemoteDeskEditedBlockLine(trimmed)) return true;
  if (isRemoteDeskToolOutputLine(trimmed)) return true;
  if (/^(?:Running|Ran|You ran|Edited|Exploring|Explored|Read|List|Search|Run|Interacted with|Waited for|Proposed Command|Updated Plan)(?:\s|:|$)/i.test(normalized)) return true;
  if (/^(?:Using\s+superpowers:|Instructions\s+say\b|execution error:|Write tests for @filename$|Searching the web$|Searched the web\b|Worked for\b|Output$|Implement\s+\{feature\}$)/i.test(normalized)) return true;
  if (/^(?:ing|ning|nning)\s+(?:Get-|Set-|Select-|Where-|ForEach-|rg\b|node\b|python\b|npm\b|npx\b|tsx\b|git\b)/i.test(normalized)) return true;
  if (/^(?:ent|tent|ontent)\s+-Raw\b/i.test(normalized)) return true;
  if (/^Working(?:\s*\(\d+s[\s\S]*\))?$/i.test(normalized)) return true;
  if (/^(?:\d+m\s*)?\d+s\s*•\s*esc\s*to\s*interr?upt\)?$/i.test(normalized)) return true;
  if (/^(?:W|Wo|Wor|Work|Worki|Workin|orking|rking|king|ing|ng|g|\d+)$/i.test(normalized)) return true;
  if (/^(?:B|Bo|Boo|Boot|Booti|Bootin|Booting(?:\s+MCP\b.*)?|ing MCP\b.*)$/i.test(normalized)) return true;
  if (/^gpt-[\w.-]+\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  if (/·\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  return false;
}

function isRemoteDeskInternalCommandLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  const attached = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (attached && looksLikeRemoteDeskCommandText(attached[2])) return true;
  if (/^(?:Running|Ran)(?:\s|:)/i.test(normalized) && looksLikeRemoteDeskCommandText(normalized.replace(/^(?:Running|Ran)(?:\s|:)+/i, ""))) return true;
  return false;
}

function startsRemoteDeskToolOutputContext(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  const attached = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (attached && looksLikeRemoteDeskCommandText(attached[2])) return true;
  const ran = /^Ran(?:\s|:)+([\s\S]+)$/i.exec(normalized);
  if (ran && looksLikeRemoteDeskCommandText(ran[1])) return true;
  return /^Runningif\b/i.test(normalized);
}

function startsRemoteDeskEditBlockContext(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  return /^Edited(?:\s|:|$)/i.test(normalized) || isRemoteDeskEditedBlockLine(text);
}

function looksLikeRemoteDeskCommandText(text: string) {
  return /^(?:if\b|\$|\(|\[|'|"|\.?\\|\/|[A-Z]:\\|Get-|Set-|Select-|Where-|ForEach-|Measure-|New-|Remove-|Copy-|Move-|rg\b|node\b|python\b|py\b|npm\b|npx\b|tsx\b|git\b|cat\b|ls\b|dir\b|type\b|curl\b|pwsh\b|powershell\b|cmd\b)/i.test(text.trim());
}

function isRemoteDeskToolOutputLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  if (!normalized) return true;
  if (/^(?:[A-Za-z0-9_.\\/-]+\.(?:html|js|ts|tsx|css|md|json|xconj):\d+:|\d{1,6}:)(?:\s|$|<|\{|\}|\(|\)|["'])/.test(normalized)) return true;
  if (/^(?:\.\\|\.\/|[A-Za-z]:\\|[A-Za-z0-9_.-]+\\)[^\s]+/.test(normalized)) return true;
  if (/^(?:design|guitar|assets|xcon|src|packages|providers|docs|examples)[\\/][^\s]+/i.test(normalized)) return true;
  if (/^(?:-a---|d----|Count\s+Name\b|FullName\b|Lines\s+Words\s+Characters\b|Line\s*\||Name\s+Source\b|Path\s+Exists\b)/i.test(normalized)) return true;
  if (/^\|[~\s]/.test(normalized)) return true;
  if (/^"[\w.-]+":\s*/.test(normalized)) return true;
  if (/^name:\s*[\w.-]+/i.test(normalized)) return true;
  if (/^(?:ERROR|WARNING)\s+[\w./\\-]+/i.test(normalized)) return true;
  if (/^\S+\s+@\S+/.test(normalized)) return true;
  return false;
}

function isRemoteDeskEditedBlockLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  if (!normalized) return true;
  if (isRemoteDeskClippedNumericArtifactLine(normalized)) return true;
  if (/^⋮+$/.test(normalized)) return true;
  if (/^@@\s/.test(normalized)) return true;
  if (/^\d+\s+[+-]\s?/.test(normalized)) return true;
  if (/^[+-]\s+(?:import|export|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*)/i.test(normalized)) return true;
  return /^\d+\s{2,}(?:import|export|from\b|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|new\s+|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*|[\w.]+\(|[\w$]+:\s*)/i.test(normalized);
}

function isRemoteDeskClippedNumericArtifactLine(normalized: string) {
  if (/^\d{1,6}[+-](?!\d)(?:\s|$|[A-Za-z_$()[\]{}"'`])/.test(normalized)) return true;
  if (!/^\d{1,4}[a-z][A-Za-z0-9_.-]*/.test(normalized) || /[가-힣]/.test(normalized)) return false;
  return /(?:connection-refused|signature|elapsedms|tool:|server|app_|guards|worki|readiness|failed|error|timeout|result|content|context|workspace)/i.test(normalized);
}

function isRemoteDeskNarrativeBoundary(text: string) {
  const normalized = normalizeRemoteDeskVisibleLine(text);
  if (!normalized || normalized.length < 10) return false;
  if (/^[-*•□✔\d]+(?:\s|[.:])/.test(normalized)) return false;
  if (isNoisyStreamText(normalized)) return false;
  if (/[가-힣]/.test(normalized)) {
    return /(?:습니다|겠습니다|입니다|합니다|됩니다|보겠습니다|확인|정리|결과|현재|오늘|내일|서울|대전|제주|좋겠습니다|필요합니다|가능성이|중심으로)/.test(normalized);
  }
  return /^[A-Z][A-Za-z0-9 ,'"()[\].:;/-]{12,}[.!?]$/.test(normalized);
}

function normalizeRemoteDeskLineForClassification(line: string) {
  return line
    .replace(/^[›>\s]+/, "")
    .replace(/^[─\-\s]+/, "")
    .replace(/^•\s*/, "")
    .trim();
}

function normalizeRemoteDeskVisibleLine(line: string) {
  return stripAttachedRemoteDeskNarrativePrefix(line)
    .replace(/^\s+/, "")
    .replace(/^•\s*/, "")
    .trim();
}

function stripAttachedRemoteDeskNarrativePrefix(line: string) {
  const normalized = line.trim();
  const match = /^(Running|Ran)([A-Z가-힣][\s\S]*)$/.exec(normalized);
  if (!match) return line;
  if (looksLikeRemoteDeskCommandText(match[2])) return line;
  return match[2];
}
