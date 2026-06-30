export function scopeXconViewerCssForShadow(css: string): string {
  return css
    .replace(/:root\s*,\s*\[data-xcon-theme="light"\]/g, ':host,:host([data-xcon-theme="light"])')
    .replace(
      /html\[data-theme="dark"\]\s*,\s*\[data-xcon-theme="dark"\]/g,
      ':host([data-xcon-theme="dark"])',
    );
}
