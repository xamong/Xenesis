import mermaid from 'mermaid';
import type { ThemeName } from '../../shared/types';

let initializedTheme: ThemeName | null = null;

/** mermaid를 앱 테마에 맞춰 (재)초기화한다. 같은 테마면 no-op. */
export function initMermaid(appTheme: ThemeName) {
  const mmdTheme = appTheme === 'dark' ? 'dark' : 'default';
  if (initializedTheme === appTheme) return;
  initializedTheme = appTheme;
  mermaid.initialize({
    startOnLoad: false,
    theme: mmdTheme,
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
}
