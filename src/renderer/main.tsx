import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';
import '@xterm/xterm/css/xterm.css';

const rendererLegacyScripts = ['./lib/span-grid.js', './lib/xcon/XCON.js', './lib/xcon/xamong-sketch.js'];

function loadClassicScript(src: string): Promise<void> {
  const existing = Array.from(document.scripts).find((script) => script.dataset.xvLegacyScript === src);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.xvLegacyScript = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load renderer legacy script: ${src}`));
    document.body.appendChild(script);
  });
}

async function loadRendererLegacyScripts(): Promise<void> {
  for (const src of rendererLegacyScripts) {
    try {
      await loadClassicScript(src);
    } catch (error) {
      console.error(error);
    }
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found.');
}

await loadRendererLegacyScripts();

createRoot(root).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
