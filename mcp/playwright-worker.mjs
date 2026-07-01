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

function normalizeNormalizedCoordinate(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    throw new Error(`${field} must be an integer from 0 to 999.`);
  }
  return parsed;
}

function normalizeActionInteger(value, field, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

function normalizeActionNumber(value, field, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} must be a number from ${min} to ${max}.`);
  }
  return parsed;
}

function normalizeMouseButton(value) {
  const button = String(value || 'left')
    .trim()
    .toLowerCase();
  if (!['left', 'middle', 'right'].includes(button)) {
    throw new Error('button must be left, middle, or right.');
  }
  return button;
}

function normalizedPoint(action, dimensions) {
  const x = normalizeNormalizedCoordinate(action.x, 'x');
  const y = normalizeNormalizedCoordinate(action.y, 'y');
  const width = Math.max(1, Math.floor(Number(dimensions?.width) || 1280));
  const height = Math.max(1, Math.floor(Number(dimensions?.height) || 720));
  return {
    x: Math.max(0, Math.min(width - 1, Math.round((x / 999) * (width - 1)))),
    y: Math.max(0, Math.min(height - 1, Math.round((y / 999) * (height - 1)))),
  };
}

function normalizedDragPoints(action, dimensions) {
  const start = {
    x: action.startX ?? action.start_x,
    y: action.startY ?? action.start_y,
  };
  const end = {
    x: action.endX ?? action.end_x,
    y: action.endY ?? action.end_y,
  };
  return {
    normalized: {
      start: {
        x: normalizeNormalizedCoordinate(start.x, 'startX'),
        y: normalizeNormalizedCoordinate(start.y, 'startY'),
      },
      end: {
        x: normalizeNormalizedCoordinate(end.x, 'endX'),
        y: normalizeNormalizedCoordinate(end.y, 'endY'),
      },
    },
    pixel: {
      start: normalizedPoint(start, dimensions),
      end: normalizedPoint(end, dimensions),
    },
  };
}

function normalizeKeys(value) {
  const keys = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : String(value || '')
        .split('+')
        .map((item) => item.trim())
        .filter(Boolean);
  if (!keys.length) throw new Error('keys must contain at least one key.');
  return keys;
}

function scrollDelta(action) {
  const magnitudeInPixels = normalizeActionInteger(
    action.magnitudeInPixels ?? action.magnitude_in_pixels,
    'magnitudeInPixels',
    300,
    0,
    30000,
  );
  const direction = String(action.direction || 'down')
    .trim()
    .toLowerCase();
  if (direction === 'up') return { direction, magnitudeInPixels, dx: 0, dy: -magnitudeInPixels };
  if (direction === 'down') return { direction, magnitudeInPixels, dx: 0, dy: magnitudeInPixels };
  if (direction === 'left') return { direction, magnitudeInPixels, dx: -magnitudeInPixels, dy: 0 };
  if (direction === 'right') return { direction, magnitudeInPixels, dx: magnitudeInPixels, dy: 0 };
  throw new Error('direction must be up, down, left, or right.');
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
    throw new Error('url must be an absolute http/https URL, data URL, or about:blank.');
  }

  if (targetUrl.protocol === 'about:' && targetUrl.href !== 'about:blank') {
    throw new Error('about URLs are limited to about:blank.');
  }
  if (!['http:', 'https:', 'data:', 'about:'].includes(targetUrl.protocol)) {
    throw new Error('url must be an http/https URL, data URL, or about:blank.');
  }

  const allowedHosts = normalizeHosts(args.allowedHosts);
  if (allowedHosts.length && targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    throw new Error('allowedHosts can only be used with http/https URLs.');
  }
  if (targetUrl.hostname && !isHostAllowed(targetUrl.hostname, allowedHosts)) {
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

async function performAction(page, action = {}, index, defaultTimeoutMs, allowedHosts = []) {
  const type = String(action.type || action.action || '').trim();
  const timeout = normalizeTimeout(action.timeoutMs, defaultTimeoutMs);
  const selector = String(action.selector || '').trim();
  const viewport = page.viewportSize();

  if (type === 'click') {
    if (selector) {
      await page.locator(selector).first().click({ timeout });
      return { index, type, selector };
    }
    const point = normalizedPoint(action, viewport);
    const button = normalizeMouseButton(action.button);
    const clickCount = normalizeActionInteger(action.clickCount ?? action.click_count, 'clickCount', 1, 1, 10);
    await page.mouse.click(point.x, point.y, { button, clickCount });
    return {
      index,
      type,
      normalized: { x: Number(action.x), y: Number(action.y) },
      pixel: point,
      ...(button === 'left' ? {} : { button }),
      ...(clickCount === 1 ? {} : { clickCount }),
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
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

  if (type === 'mouseDown' || type === 'mouse_down') {
    const point = normalizedPoint(action, viewport);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down({ button: normalizeMouseButton(action.button) });
    return {
      index,
      type: 'mouseDown',
      normalized: { x: Number(action.x), y: Number(action.y) },
      pixel: point,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'mouseUp' || type === 'mouse_up') {
    const point = normalizedPoint(action, viewport);
    await page.mouse.move(point.x, point.y);
    await page.mouse.up({ button: normalizeMouseButton(action.button) });
    return {
      index,
      type: 'mouseUp',
      normalized: { x: Number(action.x), y: Number(action.y) },
      pixel: point,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'move') {
    const point = normalizedPoint(action, viewport);
    await page.mouse.move(point.x, point.y);
    return {
      index,
      type,
      normalized: { x: Number(action.x), y: Number(action.y) },
      pixel: point,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'dragAndDrop' || type === 'drag_and_drop') {
    const points = normalizedDragPoints(action, viewport);
    const steps = normalizeActionInteger(action.steps, 'steps', 12, 1, 100);
    await page.mouse.move(points.pixel.start.x, points.pixel.start.y);
    await page.mouse.down({ button: normalizeMouseButton(action.button) });
    await page.mouse.move(points.pixel.end.x, points.pixel.end.y, { steps });
    await page.mouse.up({ button: normalizeMouseButton(action.button) });
    return {
      index,
      type: 'dragAndDrop',
      normalized: points.normalized,
      pixel: points.pixel,
      ...(steps === 12 ? {} : { steps }),
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'type') {
    if (typeof action.text !== 'string') throw new Error(`actions[${index}].text is required for type.`);
    const delay = normalizeActionNumber(action.delayMs ?? action.delay_ms, 'delayMs', 0, 0, 1000);
    await page.keyboard.type(action.text, { delay });
    if (action.pressEnter === true || action.press_enter === true) await page.keyboard.press('Enter');
    return {
      index,
      type,
      textLength: action.text.length,
      ...(delay ? { delayMs: delay } : {}),
      ...(action.pressEnter === true || action.press_enter === true ? { pressEnter: true } : {}),
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'keyDown' || type === 'key_down') {
    const key = String(action.key || action.value || '').trim();
    if (!key) throw new Error(`actions[${index}].key is required for keyDown.`);
    await page.keyboard.down(key);
    return { index, type: 'keyDown', key, ...(action.intent ? { intent: String(action.intent) } : {}) };
  }

  if (type === 'keyUp' || type === 'key_up') {
    const key = String(action.key || action.value || '').trim();
    if (!key) throw new Error(`actions[${index}].key is required for keyUp.`);
    await page.keyboard.up(key);
    return { index, type: 'keyUp', key, ...(action.intent ? { intent: String(action.intent) } : {}) };
  }

  if (type === 'hotkey') {
    let keys;
    try {
      keys = normalizeKeys(action.keys);
    } catch (error) {
      throw new Error(`actions[${index}].${error instanceof Error ? error.message : String(error)}`);
    }
    await page.keyboard.press(keys.join('+'));
    return { index, type, keys, ...(action.intent ? { intent: String(action.intent) } : {}) };
  }

  if (type === 'scroll') {
    const delta = scrollDelta(action);
    await page.mouse.wheel(delta.dx, delta.dy);
    return {
      index,
      type,
      direction: delta.direction,
      magnitudeInPixels: delta.magnitudeInPixels,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'navigate') {
    const nextUrl = resolveTargetUrl({ url: action.url, allowedHosts });
    await page.goto(nextUrl.toString(), { waitUntil: 'domcontentloaded', timeout });
    return { index, type, url: nextUrl.href, ...(action.intent ? { intent: String(action.intent) } : {}) };
  }

  if (type === 'goBack' || type === 'go_back') {
    const response = await page.goBack({ waitUntil: 'domcontentloaded', timeout }).catch(() => null);
    return {
      index,
      type: 'goBack',
      url: page.url(),
      navigated: response !== null,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
  }

  if (type === 'goForward' || type === 'go_forward') {
    const response = await page.goForward({ waitUntil: 'domcontentloaded', timeout }).catch(() => null);
    return {
      index,
      type: 'goForward',
      url: page.url(),
      navigated: response !== null,
      ...(action.intent ? { intent: String(action.intent) } : {}),
    };
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
      actionResults.push(await performAction(page, action, index, opened.timeoutMs, normalizeHosts(args.allowedHosts)));
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
      finalUrl: page.url(),
      title: await page.title().catch(() => ''),
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
