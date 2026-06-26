#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDefaultCaptureDir, getDefaultExportsDir } from '../src/main/xenisHome.mjs';

function errorResult(error) {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function readInput() {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text;
}

function slugify(value) {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return ascii || 'playwright-artifact';
}

function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function normalizeFormat(value) {
  return String(value || 'png').toLowerCase() === 'jpeg' ? 'jpeg' : 'png';
}

function normalizeArtifactFileName(value, fallbackName, extension) {
  const raw = String(value || '').trim();
  const base = raw ? path.basename(raw) : fallbackName;
  const safe =
    base
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || fallbackName;
  return safe.toLowerCase().endsWith(extension) ? safe : `${safe}${extension}`;
}

function normalizeScreenshotFileName(value, hostname, format, label = 'playwright-snapshot') {
  const extension = format === 'jpeg' ? '.jpg' : '.png';
  const fallbackName = `${timestampForFile()}-${slugify(hostname || label)}`;
  return normalizeArtifactFileName(value, fallbackName, extension);
}

function normalizeTraceFileName(value, hostname) {
  const fallbackName = `${timestampForFile()}-${slugify(hostname || 'playwright-trace')}-trace`;
  return normalizeArtifactFileName(value, fallbackName, '.zip');
}

function normalizeTimeout(value, fallback = 60000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(500, Math.min(parsed, 180000));
}

function normalizeWaitMs(value, fallback = 1000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(Math.floor(parsed), 30000));
}

function normalizeDimension(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(Math.floor(parsed), 10000)) : undefined;
}

function normalizeQuality(value, format) {
  if (format !== 'jpeg') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(1, Math.min(Math.floor(parsed), 100));
}

function normalizeWslMountPathForWindows(value) {
  const raw = String(value || '').trim();
  if (process.platform !== 'win32') return raw;
  const match = raw.match(/^\/mnt\/([a-zA-Z])(?:\/(.*))?$/);
  if (!match) return raw;
  const drive = match[1].toUpperCase();
  const rest = String(match[2] || '').replace(/\//g, '\\');
  return rest ? `${drive}:\\${rest}` : `${drive}:\\`;
}

function resolvePlaywrightOutDir(args = {}) {
  const rawOutDir = String(args.outDir || '').trim();
  if (!rawOutDir) return path.resolve(getDefaultCaptureDir({ env: process.env }));

  const normalized = normalizeWslMountPathForWindows(rawOutDir);
  if (path.isAbsolute(normalized)) return path.resolve(normalized);

  const baseDir = getDefaultExportsDir({ env: process.env });
  return path.resolve(baseDir, normalized);
}

function normalizeHosts(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) =>
      String(item || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function isHostAllowed(hostname, allowedHosts) {
  if (!allowedHosts.length) return true;
  const target = String(hostname || '').toLowerCase();
  return allowedHosts.some((rule) => {
    if (!rule) return false;
    if (!rule.startsWith('*.')) return target === rule;
    const baseRule = rule.slice(2);
    return target === baseRule || target.endsWith(`.${baseRule}`);
  });
}

function resolveTargetUrl(args = {}) {
  const inputUrl = String(args.url || '').trim();
  if (!inputUrl) throw new Error('url is required.');

  let targetUrl;
  try {
    targetUrl = new URL(inputUrl);
  } catch {
    throw new Error('url must be an absolute http/https URL.');
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('url must be an http or https URL.');
  }

  const allowedHosts = normalizeHosts(args.allowedHosts);
  if (!isHostAllowed(targetUrl.hostname, allowedHosts)) {
    throw new Error(`Target host is not allowed: ${targetUrl.hostname}`);
  }
  return targetUrl;
}

async function loadPlaywright() {
  const playwright = await import('playwright').catch(() => null);
  if (!playwright) {
    throw new Error('Playwright module is not available. Run npm install in xenesis-desk first.');
  }
  return playwright;
}

async function openPage(args = {}) {
  const targetUrl = resolveTargetUrl(args);
  const playwright = await loadPlaywright();
  const timeoutMs = normalizeTimeout(args.timeoutMs);
  const viewportWidth = normalizeDimension(args.width);
  const viewportHeight = normalizeDimension(args.height);
  const browser = await playwright.chromium.launch({
    headless: args.headless !== false,
  });
  const context = await browser.newContext({
    viewport: viewportWidth && viewportHeight ? { width: viewportWidth, height: viewportHeight } : undefined,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto(targetUrl.toString(), {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });
  return {
    targetUrl,
    browser,
    context,
    page,
    timeoutMs,
    dimensions: {
      width: viewportWidth || null,
      height: viewportHeight || null,
    },
  };
}

function screenshotOptions(args = {}, filePath, format) {
  const quality = normalizeQuality(args.quality, format);
  return {
    type: format,
    path: filePath,
    ...(quality === undefined ? {} : { quality }),
  };
}

async function saveScreenshot(page, args = {}, targetUrl, outDir, label = 'playwright-snapshot') {
  const format = normalizeFormat(args.format);
  const selector = String(args.selector || args.screenshotSelector || '').trim();
  const fileName = normalizeScreenshotFileName(
    args.fileName || args.screenshotFileName,
    targetUrl.hostname,
    format,
    label,
  );
  const filePath = path.join(outDir, fileName);
  const options = screenshotOptions(args, filePath, format);

  if (selector) {
    const target = page.locator(selector);
    await target.first().waitFor({ timeout: normalizeTimeout(args.timeoutMs) });
    const count = await target.count();
    if (count === 0) throw new Error(`selector not found: ${selector}`);
    await target.first().screenshot(options);
  } else {
    await page.screenshot({
      ...options,
      fullPage: args.fullPage !== false,
    });
  }

  const fileSize = await fs
    .stat(filePath)
    .then((stat) => stat.size)
    .catch(() => 0);
  return {
    type: 'screenshot',
    filePath,
    format,
    fileSize,
    selector,
  };
}

async function captureSnapshot(args = {}) {
  const outDir = resolvePlaywrightOutDir(args);
  await fs.mkdir(outDir, { recursive: true });

  let browser;
  let context;
  let page;
  try {
    const opened = await openPage(args);
    browser = opened.browser;
    context = opened.context;
    page = opened.page;
    const artifact = await saveScreenshot(page, args, opened.targetUrl, outDir);
    return {
      ok: true,
      filePath: artifact.filePath,
      url: opened.targetUrl.href,
      format: artifact.format,
      fileSize: artifact.fileSize,
      fullPage: args.fullPage !== false,
      timeoutMs: opened.timeoutMs,
      outDir,
      selector: artifact.selector,
      dimensions: opened.dimensions,
      artifacts: [artifact],
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

function normalizeActionState(value) {
  return ['attached', 'detached', 'visible', 'hidden'].includes(value) ? value : 'visible';
}

function normalizeActions(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .slice(0, 50);
}

async function performAction(page, action = {}, index, defaultTimeoutMs) {
  const type = String(action.type || action.action || '').trim();
  const timeout = normalizeTimeout(action.timeoutMs, defaultTimeoutMs);
  const selector = String(action.selector || '').trim();

  if (type === 'click') {
    if (!selector) throw new Error(`actions[${index}].selector is required for click.`);
    await page.locator(selector).first().click({ timeout });
    return { index, type, selector };
  }

  if (type === 'fill') {
    if (!selector) throw new Error(`actions[${index}].selector is required for fill.`);
    await page
      .locator(selector)
      .first()
      .fill(String(action.value ?? action.text ?? ''), { timeout });
    return { index, type, selector };
  }

  if (type === 'press') {
    const key = String(action.key || action.value || '').trim();
    if (!key) throw new Error(`actions[${index}].key is required for press.`);
    if (selector) await page.locator(selector).first().press(key, { timeout });
    else await page.keyboard.press(key);
    return { index, type, selector, key };
  }

  if (type === 'waitForSelector') {
    if (!selector) throw new Error(`actions[${index}].selector is required for waitForSelector.`);
    await page
      .locator(selector)
      .first()
      .waitFor({ timeout, state: normalizeActionState(action.state) });
    return { index, type, selector, state: normalizeActionState(action.state) };
  }

  if (type === 'waitForTimeout') {
    const ms = normalizeWaitMs(action.ms ?? action.value, 1000);
    await page.waitForTimeout(ms);
    return { index, type, ms };
  }

  throw new Error(`Unsupported Playwright action type at actions[${index}]: ${type || '(empty)'}.`);
}

async function runActions(args = {}) {
  const actions = normalizeActions(args.actions);
  if (!actions.length) throw new Error('actions must contain at least one action.');

  const outDir = resolvePlaywrightOutDir(args);
  await fs.mkdir(outDir, { recursive: true });

  const artifacts = [];
  const actionResults = [];
  let browser;
  let context;
  let page;
  let targetUrl;
  let tracePath = '';
  let traceStarted = false;

  try {
    const opened = await openPage(args);
    browser = opened.browser;
    context = opened.context;
    page = opened.page;
    targetUrl = opened.targetUrl;

    if (args.trace === true) {
      tracePath = path.join(outDir, normalizeTraceFileName(args.traceFileName, targetUrl.hostname));
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      traceStarted = true;
    }

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      if (String(action.type || action.action || '').trim() === 'screenshot') {
        const artifact = await saveScreenshot(
          page,
          {
            ...args,
            ...action,
            fileName: action.fileName || `${timestampForFile()}-action-${index + 1}`,
          },
          targetUrl,
          outDir,
          `action-${index + 1}`,
        );
        artifacts.push(artifact);
        actionResults.push({ index, type: 'screenshot', filePath: artifact.filePath, selector: artifact.selector });
        continue;
      }
      actionResults.push(await performAction(page, action, index, opened.timeoutMs));
    }

    if (args.screenshot === true) {
      artifacts.push(
        await saveScreenshot(
          page,
          {
            ...args,
            selector: args.screenshotSelector || '',
            fileName: args.screenshotFileName || args.fileName,
          },
          targetUrl,
          outDir,
          'playwright-final',
        ),
      );
    }

    if (traceStarted) {
      await context.tracing.stop({ path: tracePath });
      traceStarted = false;
      const fileSize = await fs
        .stat(tracePath)
        .then((stat) => stat.size)
        .catch(() => 0);
      artifacts.push({ type: 'trace', filePath: tracePath, format: 'zip', fileSize });
    }

    const screenshotArtifact = artifacts.find((artifact) => artifact.type === 'screenshot');
    const traceArtifact = artifacts.find((artifact) => artifact.type === 'trace');
    return {
      ok: true,
      url: targetUrl.href,
      outDir,
      actions: actionResults,
      artifacts,
      filePath: screenshotArtifact?.filePath || traceArtifact?.filePath || '',
      traceFilePath: traceArtifact?.filePath || '',
      screenshotFilePath: screenshotArtifact?.filePath || '',
      timeoutMs: opened.timeoutMs,
      dimensions: opened.dimensions,
    };
  } finally {
    if (traceStarted && tracePath) await context.tracing.stop({ path: tracePath }).catch(() => {});
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

try {
  const input = await readInput();
  const args = input.trim() ? JSON.parse(input) : {};
  const operation = String(args.operation || 'snapshot');
  const result = operation === 'run' ? await runActions(args) : await captureSnapshot(args);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify(errorResult(error))}\n`);
  process.exitCode = 1;
}
