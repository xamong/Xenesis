import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const deskRoot = join(scriptDir, '..');
const viewerRoot = join(deskRoot, '..', '..');
const browserDemoLabPath = join(viewerRoot, 'tools', 'xcon-workflow-runner', 'playground', 'demo-lab.js');
const targetDir = join(deskRoot, 'examples', 'demo-lab');

const sources = [
  ['createChatWeatherDocument', 'chat-stream-weather.xcon.md'],
  ['createBindingDashboardDocument', 'binding-dashboard.xcon.md'],
  ['createCinematicDocument', 'cinematic-launch-room.xcon.md'],
  ['createGridEditorCanvasDocument', 'grid-editor-canvas-mode.xcon.md'],
];

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}()`);
  if (start < 0) throw new Error(`Cannot find ${functionName} in ${browserDemoLabPath}`);

  const nextFunctionStart = source.indexOf('\nfunction ', start + 1);
  if (nextFunctionStart < 0) return source.slice(start);
  return source.slice(start, nextFunctionStart);
}

const browserSource = readFileSync(browserDemoLabPath, 'utf8');
const functionSources = sources
  .map(([functionName]) => extractFunctionSource(browserSource, functionName))
  .join('\n\n');

const createDocuments = new Function(`
const FENCE = '\`\`\`';
${functionSources}
return {
  createChatWeatherDocument,
  createBindingDashboardDocument,
  createCinematicDocument,
  createGridEditorCanvasDocument,
};
`);

const factories = createDocuments();
mkdirSync(targetDir, { recursive: true });

for (const [functionName, fileName] of sources) {
  const document = `${factories[functionName]().trim()}\n`;
  writeFileSync(join(targetDir, fileName), document, 'utf8');
  console.log(`synced ${fileName}`);
}
