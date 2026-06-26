export type XtermImageAddonPolicyReason =
  | 'no-csp'
  | 'no-script-policy'
  | 'unsafe-eval'
  | 'wasm-unsafe-eval'
  | 'wildcard'
  | 'csp-requires-wasm-eval';

export interface XtermImageAddonPolicy {
  canLoad: boolean;
  reason: XtermImageAddonPolicyReason;
  detail: string;
  effectiveScriptPolicy: string;
}

function readDirectiveTokens(csp: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const segment of csp.split(';')) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const [name, ...values] = tokens;
    directives.set(name.toLowerCase(), values);
  }
  return directives;
}

export function resolveXtermImageAddonPolicy(csp: string | null | undefined): XtermImageAddonPolicy {
  const normalized = csp?.trim() ?? '';
  if (!normalized) {
    return {
      canLoad: true,
      reason: 'no-csp',
      detail: 'No renderer CSP meta tag is present.',
      effectiveScriptPolicy: '',
    };
  }

  const directives = readDirectiveTokens(normalized);
  const scriptTokens = directives.get('script-src') ?? directives.get('default-src') ?? [];
  const effectiveScriptPolicy = scriptTokens.join(' ');
  if (scriptTokens.length === 0) {
    return {
      canLoad: true,
      reason: 'no-script-policy',
      detail: 'CSP does not define script-src or default-src.',
      effectiveScriptPolicy,
    };
  }

  if (scriptTokens.includes('*')) {
    return {
      canLoad: true,
      reason: 'wildcard',
      detail: 'CSP script policy allows wildcard script execution.',
      effectiveScriptPolicy,
    };
  }

  if (scriptTokens.includes("'unsafe-eval'")) {
    return {
      canLoad: true,
      reason: 'unsafe-eval',
      detail: 'CSP script policy explicitly allows unsafe-eval.',
      effectiveScriptPolicy,
    };
  }

  if (scriptTokens.includes("'wasm-unsafe-eval'")) {
    return {
      canLoad: true,
      reason: 'wasm-unsafe-eval',
      detail: 'CSP script policy allows WebAssembly evaluation for IIP image decoding.',
      effectiveScriptPolicy,
    };
  }

  return {
    canLoad: false,
    reason: 'csp-requires-wasm-eval',
    detail: '@xterm/addon-image IIP decoding needs script-src to permit wasm-unsafe-eval or unsafe-eval.',
    effectiveScriptPolicy,
  };
}
