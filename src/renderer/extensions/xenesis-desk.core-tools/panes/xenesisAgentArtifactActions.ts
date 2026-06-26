const RENDERABLE_XCON_FENCE_RE =
  /```(?:xcon-sketch|sketch|xcon)(?:\s+[^\n`]*)?\n[\s\S]*?^\s*screen\s+["'][^"']+["']\s+\d+x\d+/im;

export function hasRenderableXconArtifact(content: string): boolean {
  return RENDERABLE_XCON_FENCE_RE.test(String(content || ''));
}

export function shouldAutoOpenXenesisArtifactInGowoori(input: string): boolean {
  let normalized = String(input || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  normalized = normalized.replace(/^\/(?:artifact|render)\b\s*/i, '');

  const hasOpenVerb = /(열어|띄워|표시|보여|크게|전체\s*화면|바로|open|show|display|preview|view)/i.test(normalized);
  if (!hasOpenVerb) return false;

  const normalizedTargetText = normalized.replace(
    /gowoori\s*chat|gowoorichat|고우리\s*챗|고우리챗|거울이\s*챗|거울이챗/gi,
    ' ',
  );
  const explicitGowooriTarget = /(gowoori|고우리|거울이)/i.test(normalizedTargetText);
  const explicitArtifactTarget = /(아티팩트\s*(창|패널|pane|view|화면)?|artifact\s*(pane|view)?)/i.test(normalized);
  const explicitOverlayTarget = /(오버레이|overlay)/i.test(normalized);

  return explicitGowooriTarget || explicitArtifactTarget || explicitOverlayTarget;
}
