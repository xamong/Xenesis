#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseBySyntax } from '@xcon-viewer/core';
import { getDefaultExportsDir, getMcpDir, resolveXenisHomeDir } from '../src/main/xenisHome.mjs';
import { applyTextFileWrite, previewTextFileWrite, restoreTextFileBackup } from './xenesis-desk-file-safety.mjs';

const SERVER_NAME = 'xenesis-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:3847';
const MCP_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLAYWRIGHT_WORKER_PATH = path.join(MCP_DIR, 'playwright-worker.mjs');
const PROMPT_DIR_CANDIDATES = [
  process.env.XENIS_PROMPTS_DIR,
  path.join(MCP_DIR, 'prompts'),
  path.resolve(MCP_DIR, '..', '..', '..', 'prompts'),
].filter(Boolean);

const promptFiles = [
  {
    key: 'shared-xcon-contract',
    fileName: '00-shared-xcon-contract.md',
    name: 'Shared XCON contract',
    description: 'Non-negotiable syntax, rendering, and safety rules for every XCON generation task.',
  },
  {
    key: 'sketch-ui-generation',
    fileName: '01-sketch-ui-generation.md',
    name: 'Sketch UI generation',
    description: 'Generate a complete XCON/SKETCH UI screen.',
  },
  {
    key: 'markdown-xcon-document',
    fileName: '02-markdown-xcon-document.md',
    name: 'Markdown + XCON document',
    description: 'Generate Markdown documents with embedded XCON/SKETCH visual blocks.',
  },
  {
    key: 'xcon-chain-generation',
    fileName: '03-xcon-chain-generation.md',
    name: 'XCON Chain generation',
    description: 'Generate XCON Chain SUGAR expressions and fixtures.',
  },
  {
    key: 'xcon-workflow-generation',
    fileName: '04-xcon-workflow-generation.md',
    name: 'XCON Workflow generation',
    description: 'Generate XCON Workflow documents with queues, schedulers, and action flow.',
  },
  {
    key: 'family-data-binding-template',
    fileName: '05-family-data-binding-template.md',
    name: 'Family data binding template',
    description: 'Generate fixture, chain, sketch, and workflow artifacts together.',
  },
  {
    key: 'monitoring-dashboard-workflow',
    fileName: '06-monitoring-dashboard-workflow.md',
    name: 'Monitoring dashboard workflow',
    description: 'Generate realtime workflow monitoring dashboards.',
  },
  {
    key: 'template-lab-business-document',
    fileName: '07-template-lab-business-document.md',
    name: 'Template Lab business document',
    description: 'Generate business documents such as reports, invoices, and checklists.',
  },
  {
    key: 'review-and-repair',
    fileName: '08-review-and-repair.md',
    name: 'Review and repair',
    description: 'Review, validate, and repair generated XCON artifacts.',
  },
  {
    key: 'chat-artifact-simulation',
    fileName: '09-chat-artifact-simulation.md',
    name: 'Chat artifact simulation',
    description: 'Simulate a chat response that streams Markdown plus XCON/SKETCH artifacts.',
  },
  {
    key: 'showcase-component-catalog',
    fileName: '10-showcase-component-catalog.md',
    name: 'Showcase component catalog',
    description: 'Use richer XCON components and composition patterns from showcase sketches.',
  },
  {
    key: 'auto-layout-layer-recipes',
    fileName: '11-auto-layout-layer-recipes.md',
    name: 'Auto-layout and layer recipes',
    description: 'Use auto-layout, layered heroes, and stable dense layout patterns.',
  },
  {
    key: 'rich-list-xlist-recipes',
    fileName: '12-rich-list-xlist-recipes.md',
    name: 'Rich list and XList recipes',
    description: 'Generate polished data-driven lists, rails, feeds, and chat layouts.',
  },
  {
    key: 'dashboard-chart-map-network-recipes',
    fileName: '13-dashboard-chart-map-network-recipes.md',
    name: 'Dashboard, chart, map, and network recipes',
    description: 'Generate dashboards with charts, maps, span grids, and network diagrams.',
  },
  {
    key: 'family-binding-workflow-recipes',
    fileName: '14-family-binding-workflow-recipes.md',
    name: 'Family binding and workflow recipes',
    description: 'Generate fixture, chain, sketch, and workflow artifacts that stay data-bound.',
  },
  {
    key: 'domain-blueprints',
    fileName: '15-domain-blueprints.md',
    name: 'Domain blueprint recipes',
    description: 'Choose XCON component patterns for common operational and product domains.',
  },
  {
    key: 'strict-generation-profile',
    fileName: '16-strict-generation-profile.md',
    name: 'Strict generation profile',
    description: 'Generate the smallest reliable renderable SKETCH artifact for validation-first flows.',
  },
  {
    key: 'workbench-natural-xcon-response',
    fileName: '17-workbench-natural-xcon-response.md',
    name: 'Workbench natural XCON response',
    description: 'Answer naturally in an inline Workbench and use XCON/SKETCH only when a visual response helps.',
  },
];

const promptTemplates = [
  {
    name: 'xcon.sketch-ui',
    description: 'Generate a complete XCON/SKETCH UI screen.',
    files: [
      'shared-xcon-contract',
      'sketch-ui-generation',
      'showcase-component-catalog',
      'auto-layout-layer-recipes',
      'rich-list-xlist-recipes',
    ],
  },
  {
    name: 'xcon.markdown-document',
    description: 'Generate Markdown with embedded XCON/SKETCH visual artifacts.',
    files: [
      'shared-xcon-contract',
      'markdown-xcon-document',
      'showcase-component-catalog',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
    ],
  },
  {
    name: 'xcon.dashboard-workflow',
    description: 'Generate a monitoring or dashboard workflow artifact.',
    files: [
      'shared-xcon-contract',
      'markdown-xcon-document',
      'monitoring-dashboard-workflow',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
      'domain-blueprints',
    ],
  },
  {
    name: 'xcon.family-template',
    description: 'Generate fixture, chain, sketch, and workflow as one family template.',
    files: [
      'shared-xcon-contract',
      'family-data-binding-template',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
    ],
  },
  {
    name: 'xcon.review-repair',
    description: 'Review and repair generated XCON Markdown or SKETCH.',
    files: ['shared-xcon-contract', 'review-and-repair'],
  },
  {
    name: 'xcon.chat-artifact',
    description: 'Generate a chat-style Markdown and XCON/SKETCH streaming artifact.',
    files: [
      'shared-xcon-contract',
      'chat-artifact-simulation',
      'showcase-component-catalog',
      'auto-layout-layer-recipes',
      'rich-list-xlist-recipes',
    ],
  },
  {
    name: 'xcon.workbench-response',
    description: 'Generate a natural inline Workbench response that uses XCON/SKETCH only when helpful.',
    files: [
      'shared-xcon-contract',
      'workbench-natural-xcon-response',
      'showcase-component-catalog',
      'dashboard-chart-map-network-recipes',
      'domain-blueprints',
    ],
  },
  {
    name: 'xcon.strict-sketch',
    description: 'Generate one minimal validation-first XCON/SKETCH screen.',
    files: ['shared-xcon-contract', 'strict-generation-profile'],
  },
];

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const tools = [
  {
    name: 'xenesis_desk_get_xcon_prompt',
    description: 'Return Xenesis Desk XCON/SKETCH generation guidance assembled from the bundled prompt files.',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: [
            'sketch-ui',
            'strict-sketch',
            'markdown-xcon',
            'dashboard-workflow',
            'family-template',
            'review-repair',
            'chat-artifact',
            'workbench-response',
            'chain',
            'workflow',
            'template-lab',
          ],
          description: 'Prompt profile to assemble. Defaults to markdown-xcon.',
          default: 'markdown-xcon',
        },
        task: {
          type: 'string',
          description: 'Optional task hint, for example dashboard, workflow, review, or business document.',
        },
        brief: {
          type: 'string',
          description: 'User request or generation brief to append to the prompt guidance.',
        },
        audience: {
          type: 'string',
          description: 'Optional target audience for the generated document or screen.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_validate_xcon_markdown',
    description: 'Validate Markdown content that contains one or more renderable XCON/SKETCH fences.',
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Markdown content to validate before saving or opening in Xenesis Desk.',
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_create_xcon_markdown_from_content',
    description: 'Save LLM-generated Markdown containing XCON/SKETCH fences and optionally open it in Xenesis Desk.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Optional document title. Defaults to the first Markdown H1 or a generic title.',
        },
        content: {
          type: 'string',
          description: 'Complete Markdown content to write. The content is saved exactly as provided.',
        },
        workspaceDir: {
          type: 'string',
          description:
            'Directory where the Markdown file should be written. Defaults to XENIS_HOME/exports; relative paths resolve under that exports directory.',
        },
        outDir: {
          type: 'string',
          description: 'Alias for workspaceDir. Relative paths resolve under XENIS_HOME/exports.',
        },
        fileName: {
          type: 'string',
          description: 'Optional Markdown file name. The .md extension is added when omitted.',
        },
        placement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional dock placement used when opening the generated file in Xenesis Desk.',
        },
        targetPaneId: {
          type: 'string',
          description:
            'Open the generated artifact in a specific Xenesis Desk pane. Defaults to the configured artifact pane when omitted.',
        },
        streaming: {
          type: 'boolean',
          description: 'When true, open the generated file with a visual streaming render effect.',
          default: false,
        },
        streamingIntervalMs: {
          type: 'number',
          description: 'Milliseconds between streaming render updates. Defaults to 24.',
        },
        streamingChunkSize: {
          type: 'number',
          description: 'Number of characters appended on each streaming render update. Defaults to 80.',
        },
        streamingInitialDelayMs: {
          type: 'number',
          description: 'Delay before the streaming render effect starts. Defaults to 0.',
        },
        openInDesk: {
          type: 'boolean',
          description: 'When true, ask the running Xenesis Desk app to open the generated file.',
          default: true,
        },
        exportPdf: {
          type: 'boolean',
          description: 'When true, also export the generated Markdown to PDF through the running Xenesis Desk app.',
          default: false,
        },
        pdfFileName: {
          type: 'string',
          description: 'Optional PDF file name. The .pdf extension is added when omitted.',
        },
        pdfOutDir: {
          type: 'string',
          description:
            'Optional PDF output directory. Defaults to the generated Markdown file directory; relative paths resolve under XENIS_HOME/exports.',
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_create_xcon_markdown',
    description: 'Create a Markdown file containing an XCON/SKETCH fence and open it in Xenesis Desk.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'What the user wants to build with XCON/SKETCH.',
        },
        title: {
          type: 'string',
          description: 'Optional document title. Defaults to a title derived from the prompt.',
        },
        workspaceDir: {
          type: 'string',
          description:
            'Directory where the Markdown file should be written. Defaults to XENIS_HOME/exports; relative paths resolve under that exports directory.',
        },
        outDir: {
          type: 'string',
          description: 'Alias for workspaceDir. Relative paths resolve under XENIS_HOME/exports.',
        },
        fileName: {
          type: 'string',
          description: 'Optional Markdown file name. The .md extension is added when omitted.',
        },
        mode: {
          type: 'string',
          enum: ['view', 'code', 'both'],
          description: 'XCON/SKETCH fence display mode used by the Xenesis Desk Markdown viewer.',
          default: 'view',
        },
        placement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional dock placement used when opening the generated file in Xenesis Desk.',
        },
        targetPaneId: {
          type: 'string',
          description:
            'Open the generated artifact in a specific Xenesis Desk pane. Defaults to the configured artifact pane when omitted.',
        },
        streaming: {
          type: 'boolean',
          description: 'When true, open the generated file with a visual streaming render effect.',
          default: false,
        },
        streamingIntervalMs: {
          type: 'number',
          description: 'Milliseconds between streaming render updates. Defaults to 24.',
        },
        streamingChunkSize: {
          type: 'number',
          description: 'Number of characters appended on each streaming render update. Defaults to 80.',
        },
        streamingInitialDelayMs: {
          type: 'number',
          description: 'Delay before the streaming render effect starts. Defaults to 0.',
        },
        openInDesk: {
          type: 'boolean',
          description: 'When true, ask the running Xenesis Desk app to open the generated file.',
          default: true,
        },
        exportPdf: {
          type: 'boolean',
          description: 'When true, also export the generated Markdown to PDF through the running Xenesis Desk app.',
          default: false,
        },
        pdfFileName: {
          type: 'string',
          description: 'Optional PDF file name. The .pdf extension is added when omitted.',
        },
        pdfOutDir: {
          type: 'string',
          description:
            'Optional PDF output directory. Defaults to the generated Markdown file directory; relative paths resolve under XENIS_HOME/exports.',
        },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_export_xcon_pdf',
    description: 'Export an existing XCON Markdown file to PDF using the running Xenesis Desk app.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path of the XCON Markdown file to export.',
        },
        title: {
          type: 'string',
          description: 'Optional document title used for the PDF metadata and first-page render context.',
        },
        pdfFileName: {
          type: 'string',
          description: 'Optional PDF file name. The .pdf extension is added when omitted.',
        },
        pdfOutDir: {
          type: 'string',
          description:
            'Optional PDF output directory. Defaults to the Markdown file directory; relative paths resolve under XENIS_HOME/exports.',
        },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_open_file',
    description: 'Ask the running Xenesis Desk app to open an existing local file.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute path of the local file to open in Xenesis Desk.',
        },
        placement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional dock placement used when opening the file in Xenesis Desk.',
        },
        targetPaneId: {
          type: 'string',
          description:
            'Open the file in a specific Xenesis Desk pane. Defaults to the configured artifact pane when omitted.',
        },
        streaming: {
          type: 'boolean',
          description: 'When true, open the file with a visual streaming render effect.',
          default: false,
        },
        streamingIntervalMs: {
          type: 'number',
          description: 'Milliseconds between streaming render updates. Defaults to 24.',
        },
        streamingChunkSize: {
          type: 'number',
          description: 'Number of characters appended on each streaming render update. Defaults to 80.',
        },
        streamingInitialDelayMs: {
          type: 'number',
          description: 'Delay before the streaming render effect starts. Defaults to 0.',
        },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_preview_text_file_write',
    description:
      'Preview a safe local text file write without changing disk. Returns a unified diff and backup requirement metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute local file path to create or overwrite.',
        },
        content: {
          type: 'string',
          description: 'Complete UTF-8 text content to write.',
        },
        maxBytes: {
          type: 'number',
          description: 'Optional maximum file/content size in bytes. Defaults to 204800.',
        },
      },
      required: ['filePath', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_apply_text_file_write',
    description:
      'Apply a safe local text file write after approval. Existing files are backed up before writing and can be restored.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute local file path to create or overwrite.',
        },
        content: {
          type: 'string',
          description: 'Complete UTF-8 text content to write.',
        },
        backupRoot: {
          type: 'string',
          description: 'Optional absolute backup root. Defaults to XENIS_HOME/bot-backups.',
        },
        maxBytes: {
          type: 'number',
          description: 'Optional maximum file/content size in bytes. Defaults to 204800.',
        },
      },
      required: ['filePath', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_restore_text_file_backup',
    description: 'Restore a file created by xenesis_desk_apply_text_file_write from its backup artifact.',
    inputSchema: {
      type: 'object',
      properties: {
        backupPath: {
          type: 'string',
          description: 'Absolute path to a .bak file returned by xenesis_desk_apply_text_file_write.',
        },
        filePath: {
          type: 'string',
          description: 'Optional absolute restore target. Must match backup metadata when provided.',
        },
      },
      required: ['backupPath'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_playwright_snapshot',
    description: 'Capture a screenshot from a URL using Playwright.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Absolute URL to open for screenshot capture.',
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to capture a specific element.',
        },
        outDir: {
          type: 'string',
          description:
            'Directory to save screenshot artifacts. Defaults to XENIS_HOME/captures; relative paths resolve under XENIS_HOME/exports.',
        },
        fileName: {
          type: 'string',
          description: 'Optional screenshot file name. Extension is inferred from format.',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Screenshot output format. Default is png.',
          default: 'png',
        },
        quality: {
          type: 'number',
          description: 'JPEG quality (1-100), ignored for png.',
        },
        width: {
          type: 'number',
          description: 'Viewport width for the capture session.',
        },
        height: {
          type: 'number',
          description: 'Viewport height for the capture session.',
        },
        timeoutMs: {
          type: 'number',
          description: 'Navigation timeout in milliseconds. Default 60000.',
        },
        fullPage: {
          type: 'boolean',
          description: 'When true, capture full page when no selector is provided. Defaults to true.',
          default: true,
        },
        headless: {
          type: 'boolean',
          description: 'Run browser headless. Defaults to true.',
          default: true,
        },
        waitForSelector: {
          type: 'boolean',
          description: 'Whether to wait for selector before capturing when selector is set.',
          default: true,
        },
        allowedHosts: {
          type: 'array',
          description: 'Optional allowlist for host matching. Supports exact host or *.example.com pattern.',
          items: {
            type: 'string',
          },
        },
        openInDesk: {
          type: 'boolean',
          description:
            'When true, open the generated screenshot in the Xenesis Desk image viewer. Defaults to true; set false to only save the artifact.',
          default: true,
        },
        placement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional dock placement used when opening the screenshot in Xenesis Desk.',
        },
        targetPaneId: {
          type: 'string',
          description:
            'Open the generated screenshot in a specific Xenesis Desk pane. Defaults to the configured artifact pane when omitted.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_playwright_run',
    description:
      'Run a Playwright browser session with ordered actions, optional screenshots, and optional trace.zip output.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL to open before running actions.' },
        actions: {
          type: 'array',
          description:
            'Ordered Playwright action sequence. Supported types: click, fill, press, waitForSelector, waitForTimeout, screenshot.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['click', 'fill', 'press', 'waitForSelector', 'waitForTimeout', 'screenshot'],
              },
              selector: {
                type: 'string',
                description: 'CSS selector used by click, fill, press, waitForSelector, or screenshot.',
              },
              value: { type: 'string', description: 'Input value for fill or wait time for waitForTimeout.' },
              text: { type: 'string', description: 'Alternate input value for fill.' },
              key: { type: 'string', description: 'Keyboard key for press, for example Enter or Control+S.' },
              ms: { type: 'number', description: 'Wait milliseconds for waitForTimeout.' },
              state: {
                type: 'string',
                enum: ['attached', 'detached', 'visible', 'hidden'],
                description: 'Selector wait state for waitForSelector.',
              },
              timeoutMs: { type: 'number', description: 'Per-action timeout in milliseconds.' },
              fileName: { type: 'string', description: 'Screenshot file name for screenshot actions.' },
            },
            required: ['type'],
            additionalProperties: false,
          },
        },
        outDir: {
          type: 'string',
          description:
            'Directory to save screenshots and trace artifacts. Defaults to XENIS_HOME/captures; relative paths resolve under XENIS_HOME/exports.',
        },
        screenshot: {
          type: 'boolean',
          description: 'When true, capture a final screenshot after all actions.',
          default: false,
        },
        screenshotSelector: { type: 'string', description: 'Optional CSS selector for the final screenshot.' },
        screenshotFileName: { type: 'string', description: 'Optional final screenshot file name.' },
        trace: { type: 'boolean', description: 'When true, save a Playwright trace.zip artifact.', default: false },
        traceFileName: { type: 'string', description: 'Optional trace zip file name.' },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Screenshot output format. Default is png.',
          default: 'png',
        },
        quality: { type: 'number', description: 'JPEG quality (1-100), ignored for png.' },
        width: { type: 'number', description: 'Viewport width for the browser session.' },
        height: { type: 'number', description: 'Viewport height for the browser session.' },
        timeoutMs: {
          type: 'number',
          description: 'Navigation and default action timeout in milliseconds. Default 60000.',
        },
        fullPage: {
          type: 'boolean',
          description: 'When true, final page screenshots capture the full page. Defaults to true.',
          default: true,
        },
        headless: { type: 'boolean', description: 'Run browser headless. Defaults to true.', default: true },
        allowedHosts: {
          type: 'array',
          description: 'Optional allowlist for host matching. Supports exact host or *.example.com pattern.',
          items: { type: 'string' },
        },
        openInDesk: {
          type: 'boolean',
          description: 'When true, open the first screenshot artifact in Xenesis Desk.',
          default: false,
        },
        placement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional dock placement used when opening the screenshot in Xenesis Desk.',
        },
        targetPaneId: {
          type: 'string',
          description:
            'Open the generated screenshot in a specific Xenesis Desk pane. Defaults to the configured artifact pane when omitted.',
        },
      },
      required: ['url', 'actions'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_capabilities',
    description: 'List Xenesis Desk bridge capability registry nodes.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_capability',
    description: 'Describe one Xenesis Desk bridge capability registry node by path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Capability path, for example xd.app.status.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_call_capability',
    description:
      'Call a registered Xenesis Desk bridge capability by path. Only wired capabilities execute; others return a structured error.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Capability path, for example xd.app.status.',
        },
        args: {
          type: 'object',
          description: 'Optional capability arguments.',
        },
        approved: {
          type: 'boolean',
          description:
            'Explicit approval for control or execute capabilities. Read-only capabilities do not require this.',
          default: false,
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_state',
    description: 'Read a summary of the running Xenesis Desk bridge, terminals, panels, files, and diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_active_context',
    description: 'Read the currently active Xenesis Desk pane, content, file, panel, or terminal context.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_context_actions',
    description:
      'List context-aware Xenesis Desk actions for the currently active pane, content, file, panel, or terminal.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_list_panels',
    description: 'List extension panels currently known to the Xenesis Desk MCP bridge.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_list_open_files',
    description: 'List files opened through the Xenesis Desk MCP bridge.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_recent_diagnostics',
    description: 'Read recent redacted Xenesis Desk diagnostics entries.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum diagnostics entries to return. Defaults to 20.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_renderer_performance_trace',
    description: 'Enable, disable, clear, or filter Xenesis Desk renderer performance trace diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Set to true to enable renderer performance tracing or false to disable it.',
        },
        setting: {
          type: 'string',
          description: 'Trace scopes or filters, for example "xdbot markdown-xcon".',
        },
        clear: {
          type: 'boolean',
          description: 'When true, clear existing renderer performance trace samples before applying the setting.',
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_preview',
    description: 'Preview an Xenesis Desk terminal command without starting a terminal session.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Terminal command to run inside Xenesis Desk.',
        },
        shell: {
          type: 'string',
          enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
          description: 'Optional local shell. Defaults to the Xenesis Desk default shell.',
        },
        cwd: {
          type: 'string',
          description: 'Optional working directory. Defaults to the Xenesis Desk default terminal directory.',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_run',
    description: 'Run a terminal command in a visible Xenesis Desk terminal tab.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Terminal command to run inside Xenesis Desk.',
        },
        shell: {
          type: 'string',
          enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
          description: 'Optional local shell. Defaults to the Xenesis Desk default shell.',
        },
        cwd: {
          type: 'string',
          description: 'Optional working directory. Defaults to the Xenesis Desk default terminal directory.',
        },
        id: {
          type: 'string',
          description: 'Optional terminal session id. Defaults to a generated id.',
        },
        cols: {
          type: 'number',
          description: 'Optional initial terminal columns. Defaults to 120.',
        },
        rows: {
          type: 'number',
          description: 'Optional initial terminal rows. Defaults to 30.',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_tail',
    description: 'Read recent output from an Xenesis Desk terminal session.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Xenesis Desk terminal session id returned by xenesis_desk_terminal_run.',
        },
        maxBytes: {
          type: 'number',
          description: 'Maximum recent output characters to return. Defaults to 16384.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_stop',
    description: 'Stop an Xenesis Desk terminal session.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Xenesis Desk terminal session id returned by xenesis_desk_terminal_run.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_list',
    description: 'List terminal sessions currently known to Xenesis Desk.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_image_show',
    description:
      'Render a PNG, JPEG, or GIF directly inside a Xenesis Desk terminal from an absolute local file path or HTTP/HTTPS URL. Uses the active terminal when termId is omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        termId: {
          type: 'string',
          description:
            'Optional target terminal id. When omitted, the active terminal is used, then the first known terminal as fallback.',
        },
        source: {
          type: 'string',
          description: 'Absolute PNG, JPEG, or GIF file path or HTTP/HTTPS image URL.',
        },
        width: {
          type: 'string',
          description:
            "Display width: 'auto', terminal cells like '40', pixels like '320px', or percentage like '80%'. Defaults to 80%.",
        },
        height: {
          type: 'string',
          description: "Display height: 'auto', terminal cells, pixels, or percentage. Defaults to auto.",
        },
        preserveAspectRatio: {
          type: 'boolean',
          description: 'Preserve image aspect ratio. Defaults to true.',
        },
        filename: {
          type: 'string',
          description: 'Optional display filename for the inline image sequence.',
        },
      },
      required: ['source'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_image_show_base64',
    description:
      'Render a base64-encoded PNG, JPEG, or GIF directly inside a Xenesis Desk terminal. Uses the active terminal when termId is omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        termId: {
          type: 'string',
          description:
            'Optional target terminal id. When omitted, the active terminal is used, then the first known terminal as fallback.',
        },
        base64: {
          type: 'string',
          description: 'Base64-encoded PNG, JPEG, or GIF bytes. Do not include a data URL prefix.',
        },
        width: {
          type: 'string',
          description:
            "Display width: 'auto', terminal cells like '40', pixels like '320px', or percentage like '80%'. Defaults to 80%.",
        },
        height: {
          type: 'string',
          description: "Display height: 'auto', terminal cells, pixels, or percentage. Defaults to auto.",
        },
        preserveAspectRatio: {
          type: 'boolean',
          description: 'Preserve image aspect ratio. Defaults to true.',
        },
        filename: {
          type: 'string',
          description: 'Optional display filename for the inline image sequence.',
        },
      },
      required: ['base64'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_terminal_xcon_image_show',
    description:
      'Render XCON/SKETCH markup to an image and display it directly inside a Xenesis Desk terminal. Uses the active terminal when termId is omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        termId: {
          type: 'string',
          description:
            'Optional target terminal id. When omitted, the active terminal is used, then the first known terminal as fallback.',
        },
        xcon: {
          type: 'string',
          description: 'XCON/SKETCH markup or a Markdown fence containing XCON/SKETCH.',
        },
        width: {
          type: 'string',
          description:
            "Display width: 'auto', terminal cells like '40', pixels like '320px', or percentage like '80%'. Defaults to 80%.",
        },
        height: {
          type: 'string',
          description: "Display height: 'auto', terminal cells, pixels, or percentage. Defaults to auto.",
        },
        syntax: {
          type: 'string',
          description: 'Optional renderer syntax hint.',
        },
        theme: {
          type: 'string',
          description: 'Optional renderer theme hint.',
        },
        title: {
          type: 'string',
          description: 'Optional image or render title.',
        },
        viewportWidth: {
          type: 'number',
          description: 'Optional XCON render viewport width in pixels.',
        },
      },
      required: ['xcon'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_subagent_start',
    description:
      'Start a Desk-visible subagent session in a separate Xenesis Desk terminal tab. Use this when a parent Codex, Claude, Gemini, or Xenesis session wants delegated work to be visible in its own terminal. Started sessions are tagged with the xd visible-subagent skill contract identity.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Delegated task or prompt for the subagent.',
        },
        agent: {
          type: 'string',
          enum: ['codex', 'claude', 'gemini', 'xenesis', 'custom'],
          description: 'CLI agent to launch when command is not provided. Defaults to codex.',
          default: 'codex',
        },
        command: {
          type: 'string',
          description: 'Optional exact command to run. When set, it is used instead of the default command for agent.',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the subagent terminal.',
        },
        shell: {
          type: 'string',
          enum: ['powershell', 'cmd', 'pwsh', 'wsl'],
          description: 'Optional local shell. Defaults to the Xenesis Desk default shell.',
        },
        id: {
          type: 'string',
          description: 'Optional terminal session id. Defaults to a generated id.',
        },
        title: {
          type: 'string',
          description:
            'Short display title for the subagent terminal. The terminal title is prefixed with "Subagent:".',
        },
        parentTermId: {
          type: 'string',
          description: 'Optional terminal id of the parent agent session requesting this subagent.',
        },
        cols: {
          type: 'number',
          description: 'Optional initial terminal columns. Defaults to 120.',
        },
        rows: {
          type: 'number',
          description: 'Optional initial terminal rows. Defaults to 30.',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_subagent_list',
    description: 'List Xenesis Desk terminal sessions so a parent agent can find Desk-visible subagent sessions.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_subagent_tail',
    description: 'Read recent output from a Desk-visible subagent terminal session.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Subagent terminal session id returned by xenesis_desk_subagent_start.',
        },
        maxBytes: {
          type: 'number',
          description: 'Maximum recent output characters to return. Defaults to 16384.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_subagent_stop',
    description: 'Stop a Desk-visible subagent terminal session.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Subagent terminal session id returned by xenesis_desk_subagent_start.',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_command_palette',
    description: 'List searchable Xenesis Desk command palette commands exposed by the running app.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional search text for command id, title, category, or extension name.',
        },
        includeDisabled: {
          type: 'boolean',
          description: 'When true, include disabled or unavailable commands in the result.',
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_run_command_palette',
    description: 'Run a searchable Xenesis Desk command palette command and dispatch its UI actions.',
    inputSchema: {
      type: 'object',
      properties: {
        commandId: {
          type: 'string',
          description: 'Command palette command id to run.',
        },
        panelPlacement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description: 'Optional placement override for panels opened by this command.',
        },
      },
      required: ['commandId'],
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_list_extension_commands',
    description: 'List extension commands currently registered in the running Xenesis Desk app.',
    inputSchema: {
      type: 'object',
      properties: {
        includeDisabled: {
          type: 'boolean',
          description: 'When true, include disabled or unavailable commands in the result.',
          default: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'xenesis_desk_run_extension_command',
    description: 'Run a registered Xenesis Desk extension command and dispatch its UI actions to the running app.',
    inputSchema: {
      type: 'object',
      properties: {
        commandId: {
          type: 'string',
          description: 'Extension command id to run, for example sample.hello-world.openPanel.',
        },
        panelPlacement: {
          type: 'string',
          enum: ['tab', 'left', 'right', 'top', 'bottom'],
          description:
            'Optional placement override for extension panels opened by this command. Defaults to the app behavior.',
        },
      },
      required: ['commandId'],
      additionalProperties: false,
    },
  },
];

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message, data) {
  send({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  });
}

function textResult(text, structuredContent) {
  return {
    content: [{ type: 'text', text }],
    ...(structuredContent === undefined ? {} : { structuredContent }),
  };
}

function toolError(text) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

function promptFileByKey(key) {
  const file = promptFiles.find((item) => item.key === key);
  if (!file) throw new Error(`Unknown XCON prompt file: ${key}`);
  return file;
}

function promptTemplateByName(name) {
  return promptTemplates.find((template) => template.name === name);
}

function promptResourceUri(key) {
  return `xenesis://prompts/${key}`;
}

function resourceKeyFromUri(uri) {
  const text = String(uri || '');
  const prefix = 'xenesis://prompts/';
  return text.startsWith(prefix) ? text.slice(prefix.length) : '';
}

function resolvePromptDir() {
  for (const candidate of PROMPT_DIR_CANDIDATES) {
    const resolved = path.resolve(candidate);
    if (fsSync.existsSync(path.join(resolved, '00-shared-xcon-contract.md'))) {
      return resolved;
    }
  }
  return path.resolve(PROMPT_DIR_CANDIDATES[0] || path.join(MCP_DIR, 'prompts'));
}

async function readPromptFile(key) {
  const file = promptFileByKey(key);
  const promptDir = resolvePromptDir();
  return fs.readFile(path.join(promptDir, file.fileName), 'utf8');
}

function listPromptResources() {
  return promptFiles.map((file) => ({
    uri: promptResourceUri(file.key),
    name: file.name,
    description: file.description,
    mimeType: 'text/markdown',
  }));
}

async function readPromptResource(uri) {
  const key = resourceKeyFromUri(uri);
  if (!key) throw new Error(`Unsupported resource URI: ${uri}`);
  const file = promptFileByKey(key);
  const text = await readPromptFile(key);
  return {
    contents: [
      {
        uri: promptResourceUri(file.key),
        name: file.name,
        mimeType: 'text/markdown',
        text,
      },
    ],
  };
}

function listPromptTemplates() {
  return {
    prompts: promptTemplates.map((template) => ({
      name: template.name,
      description: template.description,
      arguments: [
        {
          name: 'brief',
          description: 'The concrete user request to satisfy.',
          required: false,
        },
        {
          name: 'audience',
          description: 'The target reader or operator for the generated artifact.',
          required: false,
        },
        {
          name: 'task',
          description: 'Optional task hint such as dashboard, workflow, or review.',
          required: false,
        },
      ],
    })),
  };
}

function promptFilesForKind(kind, task) {
  const normalizedKind = String(kind || 'markdown-xcon').trim() || 'markdown-xcon';
  const normalizedTask = String(task || '').toLowerCase();
  if (normalizedKind === 'markdown-xcon' && /dashboard|monitor|운영|대시|모니터/.test(normalizedTask)) {
    return [
      'shared-xcon-contract',
      'markdown-xcon-document',
      'monitoring-dashboard-workflow',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
      'domain-blueprints',
    ];
  }

  const filesByKind = {
    'sketch-ui': [
      'shared-xcon-contract',
      'sketch-ui-generation',
      'showcase-component-catalog',
      'auto-layout-layer-recipes',
      'rich-list-xlist-recipes',
    ],
    'strict-sketch': ['shared-xcon-contract', 'strict-generation-profile'],
    'markdown-xcon': [
      'shared-xcon-contract',
      'markdown-xcon-document',
      'showcase-component-catalog',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
    ],
    'dashboard-workflow': [
      'shared-xcon-contract',
      'markdown-xcon-document',
      'monitoring-dashboard-workflow',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
      'domain-blueprints',
    ],
    'family-template': [
      'shared-xcon-contract',
      'family-data-binding-template',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
    ],
    'review-repair': ['shared-xcon-contract', 'review-and-repair'],
    'chat-artifact': [
      'shared-xcon-contract',
      'chat-artifact-simulation',
      'showcase-component-catalog',
      'auto-layout-layer-recipes',
      'rich-list-xlist-recipes',
    ],
    'workbench-response': [
      'shared-xcon-contract',
      'workbench-natural-xcon-response',
      'showcase-component-catalog',
      'dashboard-chart-map-network-recipes',
      'domain-blueprints',
    ],
    chain: ['shared-xcon-contract', 'xcon-chain-generation'],
    workflow: ['shared-xcon-contract', 'xcon-workflow-generation'],
    'template-lab': [
      'shared-xcon-contract',
      'template-lab-business-document',
      'dashboard-chart-map-network-recipes',
      'family-binding-workflow-recipes',
      'domain-blueprints',
    ],
  };
  return filesByKind[normalizedKind] || filesByKind['markdown-xcon'];
}

async function assemblePromptText({ files, brief, audience, task }) {
  const sections = [];
  for (const fileKey of files) {
    sections.push(await readPromptFile(fileKey));
  }

  const contextLines = [];
  if (task) contextLines.push(`Task: ${String(task).trim()}`);
  if (audience) contextLines.push(`Audience: ${String(audience).trim()}`);
  if (brief) contextLines.push(`Brief: ${String(brief).trim()}`);
  if (contextLines.length) {
    sections.push(['## Request Context', '', ...contextLines].join('\n'));
  }

  sections.push(
    [
      '## Xenesis Desk MCP Output Rule',
      '',
      'Return the complete artifact content inline. For Markdown documents, include the Markdown and every required `xcon-chain`, `xcon-chain-fixture`, `xcon-workflow`, and `xcon-sketch` fence directly in the document.',
      'For inline chat or Workbench responses, do not call validation tools before or after returning generated XCON/SKETCH. Return the Markdown inline immediately; the Workbench renderer handles partial rendering and visible render errors. Validate only when the user explicitly asks to save, export, open, or validate an artifact, or when the task is specifically repair/validation.',
      'Call `xenesis_desk_create_xcon_markdown_from_content` only when the user explicitly asks to save, create a file, export, or open a separate Desk artifact. If saving without opening, set `openInDesk` to false. Set `openInDesk` to true only when the user explicitly asks to open a separate Xenesis Desk pane or window.',
    ].join('\n'),
  );

  return sections.join('\n\n---\n\n');
}

async function getPromptTemplate(params = {}) {
  const name = String(params.name || '');
  const template = promptTemplateByName(name);
  if (!template) throw new Error(`Unknown prompt template: ${name}`);
  const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
  const text = await assemblePromptText({
    files: template.files,
    brief: args.brief,
    audience: args.audience,
    task: args.task,
  });
  return {
    description: template.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text,
        },
      },
    ],
  };
}

async function getXconPrompt(args = {}) {
  const files = promptFilesForKind(args.kind, args.task || args.brief);
  const text = await assemblePromptText({
    files,
    brief: args.brief,
    audience: args.audience,
    task: args.task,
  });
  return textResult(text, {
    kind: String(args.kind || 'markdown-xcon'),
    files,
    promptDir: resolvePromptDir(),
  });
}

function extractXconSketchFences(content) {
  const fences = [];
  const source = String(content || '');
  const pattern = /```xcon-sketch[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = pattern.exec(source))) {
    const start = match.index;
    const line = source.slice(0, start).split(/\r?\n/).length;
    fences.push({
      index: fences.length,
      line,
      code: String(match[1] || '').trim(),
    });
  }
  return fences;
}

function isXconObject(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.get === 'function' &&
    typeof value[Symbol.iterator] === 'function'
  );
}

function xconGet(value, key) {
  return isXconObject(value) ? value.get(key) : undefined;
}

function xconComponentEntries(component) {
  const components = xconGet(component, 'components');
  if (!isXconObject(components)) return [];

  const orderedKeys = String(xconGet(components, 'componentsOrder') || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const keys =
    orderedKeys.length > 0
      ? orderedKeys
      : Array.from(components)
          .map((entry) => entry?.key || entry?.[0])
          .filter((key) => key && key !== 'componentsOrder');

  return keys.map((key) => [key, xconGet(components, key)]).filter(([, child]) => isXconObject(child));
}

function numericXconPos(value) {
  if (!Array.isArray(value) || value.length < 4) return null;
  const pos = value.slice(0, 4).map(Number);
  return pos.every(Number.isFinite) ? pos : null;
}

function hasLegacyScreenSizeSyntax(source) {
  const firstLine =
    String(source || '')
      .trimStart()
      .split(/\r?\n/, 1)[0] || '';
  return /^\s*screen\b[^\r\n]*\bsize\s+\d+\s+\d+\b/i.test(firstLine);
}

function findNestedCoordinateLayoutErrors(component, pathName = 'root', parent = null, errors = []) {
  const pos = numericXconPos(xconGet(component, 'pos'));
  const parentPos = parent ? numericXconPos(xconGet(parent, 'pos')) : null;
  const parentType = parent ? String(xconGet(parent, 'type') || '') : '';

  if (pos && parentPos && parentType !== 'form') {
    const [x, y, width, height] = pos;
    const [, , parentWidth, parentHeight] = parentPos;
    const overflowsX = x < 0 || x + width > parentWidth;
    const overflowsY = y < 0 || y + height > parentHeight;

    if (overflowsX || overflowsY) {
      const type = String(xconGet(component, 'type') || 'component');
      const parentName = String(xconGet(parent, 'name') || parentType || 'parent');
      errors.push(
        `${pathName}: nested child ${type} at [${pos.join(', ')}] exceeds parent "${parentName}" ${parentWidth}x${parentHeight}. ` +
          "Nested components use parent-local coordinates; Do not add the parent panel's screen x/y offset, and child x/y must fit inside the parent width/height.",
      );
    }
  }

  for (const [key, child] of xconComponentEntries(component)) {
    findNestedCoordinateLayoutErrors(child, `${pathName}.${key}`, component, errors);
  }

  return errors;
}

function validateXconMarkdownContent(content) {
  const sketches = extractXconSketchFences(content).map((fence) => {
    if (!fence.code) {
      return {
        index: fence.index,
        line: fence.line,
        valid: false,
        error: 'xcon-sketch fence is empty.',
      };
    }
    if (!/^screen\b/.test(fence.code.trimStart())) {
      return {
        index: fence.index,
        line: fence.line,
        valid: false,
        error: 'xcon-sketch fence must start with screen.',
      };
    }
    if (hasLegacyScreenSizeSyntax(fence.code)) {
      return {
        index: fence.index,
        line: fence.line,
        valid: false,
        error:
          'xcon-sketch screen uses legacy size keyword syntax. Use screen "Name" 390x240, not screen "Name" size 390 240.',
      };
    }
    try {
      const document = parseBySyntax(fence.code, 'sketch');
      const layoutErrors = findNestedCoordinateLayoutErrors(document).slice(0, 20);
      if (layoutErrors.length > 0) {
        return {
          index: fence.index,
          line: fence.line,
          valid: false,
          error: layoutErrors.join('\n'),
          layoutErrors,
        };
      }
      return {
        index: fence.index,
        line: fence.line,
        valid: true,
      };
    } catch (error) {
      return {
        index: fence.index,
        line: fence.line,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const errors = [];
  if (!sketches.length) errors.push('No xcon-sketch fences were found.');
  for (const sketch of sketches) {
    if (!sketch.valid) errors.push(`Fence ${sketch.index + 1}: ${sketch.error}`);
  }
  return {
    ok: sketches.length > 0 && sketches.every((sketch) => sketch.valid),
    fenceCount: sketches.length,
    sketches,
    errors,
  };
}

function markdownTitleFromContent(content) {
  const match = String(content || '').match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || '';
}

async function validateXconMarkdown(args = {}) {
  const content = String(args.content || '');
  if (!content.trim()) return toolError('content is required.');
  const validation = validateXconMarkdownContent(content);
  if (validation.ok) {
    return textResult(`Validated ${validation.fenceCount} XCON/SKETCH fence(s).`, validation);
  }
  return {
    isError: true,
    content: [{ type: 'text', text: validation.errors.join('\n') || 'XCON Markdown validation failed.' }],
    structuredContent: validation,
  };
}

function uniqueBridgeStateFilePaths(paths) {
  const seen = new Set();
  const result = [];
  for (const item of paths) {
    const normalized = String(item || '').trim();
    if (!normalized) continue;
    const resolved = path.resolve(normalized);
    const key = resolved.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(resolved);
  }
  return result;
}

function bridgeStateFilePathCandidates() {
  const homeOptions = { env: process.env };
  const homeDir = resolveXenisHomeDir(homeOptions);
  return uniqueBridgeStateFilePaths([
    process.env.XENIS_MCP_STATE_FILE,
    process.env.XENIS_DEV_BRIDGE_STATE,
    path.join(getMcpDir(homeOptions) || path.join(homeDir, 'mcp'), 'bridge.json'),
  ]);
}

function readBridgeState() {
  const errors = [];
  for (const stateFile of bridgeStateFilePathCandidates()) {
    if (!stateFile || !fsSync.existsSync(stateFile)) continue;
    try {
      const raw = fsSync.readFileSync(stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (error) {
      errors.push(`${stateFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (errors.length) {
    process.stderr.write(`[${SERVER_NAME}] Failed to read bridge state: ${errors.join(' | ')}\n`);
  }
  return {};
}

function resolveBridgeConfig() {
  const state = readBridgeState();
  return {
    bridgeUrl: String(process.env.XENIS_MCP_BRIDGE_URL || state.bridgeUrl || DEFAULT_BRIDGE_URL).replace(/\/+$/, ''),
    bridgeToken: String(process.env.XENIS_MCP_BRIDGE_TOKEN || state.bridgeToken || ''),
  };
}

function normalizeMode(value) {
  return value === 'view' || value === 'code' || value === 'both' ? value : 'view';
}

function normalizePanelPlacement(value) {
  return ['tab', 'left', 'right', 'top', 'bottom'].includes(value) ? value : '';
}

function normalizeTargetPaneId(value) {
  const targetPaneId = String(value || '').trim();
  return targetPaneId || '';
}

function normalizeRenderNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeRenderOptions(args = {}) {
  const hasStreamingInput =
    args.streaming === true ||
    args.streamingIntervalMs !== undefined ||
    args.streamingChunkSize !== undefined ||
    args.streamingInitialDelayMs !== undefined;
  if (!hasStreamingInput) return undefined;
  return {
    streaming: {
      enabled: args.streaming !== false,
      intervalMs: normalizeRenderNumber(args.streamingIntervalMs),
      chunkSize: normalizeRenderNumber(args.streamingChunkSize),
      initialDelayMs: normalizeRenderNumber(args.streamingInitialDelayMs),
    },
  };
}

function normalizeTitle(value, fallback) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) return text.slice(0, 80);
  const derived = String(fallback || 'XCON/SKETCH Dashboard')
    .replace(/\s+/g, ' ')
    .trim();
  return (derived || 'XCON/SKETCH Dashboard').slice(0, 80);
}

function slugify(value) {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return ascii || 'xcon-sketch';
}

function normalizeMarkdownFileName(value, title) {
  const raw = String(value || '').trim();
  const baseName = raw ? path.basename(raw) : `${timestampForFile()}-${slugify(title)}.md`;
  const withoutBadChars = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const safeName = withoutBadChars || `${timestampForFile()}-xcon-sketch.md`;
  return safeName.toLowerCase().endsWith('.md') ? safeName : `${safeName}.md`;
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

function resolveXconWorkspaceDir(value) {
  const baseDir = getDefaultExportsDir({ env: process.env });
  const normalized = normalizeWslMountPathForWindows(String(value || '').trim());
  if (!normalized) return path.resolve(baseDir);
  if (path.isAbsolute(normalized)) return path.resolve(normalized);
  return path.resolve(baseDir, normalized);
}

function resolveXconWorkspaceDirFromArgs(args = {}) {
  const workspaceDir = String(args.workspaceDir || '').trim();
  return resolveXconWorkspaceDir(workspaceDir || args.outDir);
}

function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function quoteXcon(value) {
  return JSON.stringify(
    String(value || '')
      .replace(/\r?\n/g, ' ')
      .trim(),
  );
}

function dashboardProfile({ title, prompt }) {
  const lowered = `${title} ${prompt}`.toLowerCase();
  if (lowered.includes('ftp') || lowered.includes('sftp') || lowered.includes('transfer') || lowered.includes('전송')) {
    return {
      kind: 'Transfer',
      heroValue: '1.8GB',
      heroLabel: 'moved today',
      status: 'SYNCING',
      statusColor: '#0f766e',
      accent: '#14b8a6',
      softAccent: '#ccfbf1',
      insight: 'Transfer queue is healthy; retry pressure remains low.',
      focus: '3 active routes',
      kpis: [
        ['Uploaded', '742MB', '#eff6ff', '#1d4ed8'],
        ['Downloaded', '1.1GB', '#ecfdf5', '#059669'],
        ['Retries', '4', '#fff7ed', '#ea580c'],
        ['Failures', '0', '#fef2f2', '#dc2626'],
      ],
      chartLabels: ['Local', 'SFTP', 'FTP', 'Archive'],
      chartValues: [42, 68, 28, 18],
      rows: [
        ['Route', 'Owner', 'Status'],
        ['SFTP assets', 'Desk', 'Active'],
        ['FTP legacy', 'Ops', 'Queued'],
        ['Local backup', 'You', 'Ready'],
      ],
    };
  }
  if (lowered.includes('sales') || lowered.includes('revenue') || lowered.includes('매출')) {
    return {
      kind: 'Revenue',
      heroValue: '$124.8K',
      heroLabel: '+18% MoM',
      status: 'ON TRACK',
      statusColor: '#166534',
      accent: '#fbbf24',
      softAccent: '#fef3c7',
      insight: "Enterprise upgrades are driving most of this month's expansion.",
      focus: 'NRR 118%',
      kpis: [
        ['New MRR', '$38.4K', '#eff6ff', '#1d4ed8'],
        ['Expansion', '$22.1K', '#ecfdf5', '#059669'],
        ['Churned', '-$2.6K', '#fef2f2', '#dc2626'],
        ['Churn', '2.1%', '#faf5ff', '#7c3aed'],
      ],
      chartLabels: ['Starter', 'Growth', 'Enterprise', 'Expansion'],
      chartValues: [18, 47, 77, 22],
      rows: [
        ['Plan', 'Owner', 'Status'],
        ['Enterprise', 'Nia', 'Strong'],
        ['Growth', 'Jules', 'Watch'],
        ['Starter', 'Mika', 'Stable'],
      ],
    };
  }
  if (
    lowered.includes('server') ||
    lowered.includes('ops') ||
    lowered.includes('operation') ||
    lowered.includes('운영')
  ) {
    return {
      kind: 'Operations',
      heroValue: '99.98%',
      heroLabel: 'SLO health',
      status: 'ON TRACK',
      statusColor: '#166534',
      accent: '#60a5fa',
      softAccent: '#dbeafe',
      insight: 'Latency is stable and no critical incidents are open.',
      focus: 'P95 142ms',
      kpis: [
        ['Uptime', '99.98%', '#eff6ff', '#1d4ed8'],
        ['Incidents', '0', '#ecfdf5', '#059669'],
        ['Deploys', '12', '#fff7ed', '#ea580c'],
        ['Alerts', '3', '#fef2f2', '#dc2626'],
      ],
      chartLabels: ['API', 'Worker', 'DB', 'Edge'],
      chartValues: [96, 88, 92, 84],
      rows: [
        ['Service', 'Owner', 'Status'],
        ['API', 'Nia', 'Healthy'],
        ['Worker', 'Jules', 'Review'],
        ['Database', 'Mika', 'Ready'],
      ],
    };
  }
  return {
    kind: 'Executive',
    heroValue: '87',
    heroLabel: 'health score',
    status: 'READY',
    statusColor: '#2563eb',
    accent: '#fbbf24',
    softAccent: '#fef3c7',
    insight: 'The generated dashboard is ready to refine into a working view.',
    focus: '4 priorities',
    kpis: [
      ['Metric', '128', '#eff6ff', '#1d4ed8'],
      ['Active', '24', '#ecfdf5', '#059669'],
      ['Blocked', '3', '#fff7ed', '#ea580c'],
      ['Risk', 'Low', '#fef2f2', '#dc2626'],
    ],
    chartLabels: ['Plan', 'Build', 'Review', 'Ship'],
    chartValues: [42, 64, 38, 72],
    rows: [
      ['Lane', 'Owner', 'Status'],
      ['Discovery', 'Nia', 'Ready'],
      ['Build', 'Jules', 'Active'],
      ['Review', 'Mika', 'Next'],
    ],
  };
}

function buildSketchCode({ title, prompt }) {
  const profile = dashboardProfile({ title, prompt });
  const chartData = {
    labels: profile.chartLabels,
    datasets: [
      {
        label: profile.kind,
        data: profile.chartValues,
        backgroundColor: profile.accent,
      },
    ],
  };
  const columns = [
    { id: 'name', title: profile.rows[0][0], width: 150 },
    { id: 'owner', title: profile.rows[0][1], width: 96 },
    { id: 'status', title: profile.rows[0][2], width: 126 },
  ];
  return [
    `screen ${quoteXcon(title)} 960x640 bg #f8fafc`,
    '  hero: panel at 24 24 912 118',
    '    bg #111827',
    '    radius 24',
    `    eyebrow: label ${quoteXcon(`${profile.kind} command center`)} at 28 20 280 20`,
    '      color #93c5fd',
    '      font',
    '        size 12',
    '        weight 800',
    `    title: label ${quoteXcon(title)} at 28 44 430 30`,
    '      color white',
    '      font',
    '        size 24',
    '        weight 800',
    `    value: label ${quoteXcon(profile.heroValue)} at 28 76 190 36`,
    `      color ${profile.accent}`,
    '      font',
    '        size 32',
    '        weight 800',
    `    valueLabel: label ${quoteXcon(profile.heroLabel)} at 218 88 180 22`,
    '      color #a7f3d0',
    '      font',
    '        size 14',
    '        weight 800',
    `    statusBadge: label ${quoteXcon(profile.status)} at 754 24 126 28`,
    `      bg ${profile.statusColor}`,
    '      color white',
    '      radius 14',
    '      align center',
    '      font',
    '        size 12',
    '        weight 800',
    `    summary: label ${quoteXcon(profile.insight)} at 520 62 360 40`,
    '      color #cbd5e1',
    '      align right',
    '      font',
    '        size 13',
    '        weight 600',
    '  kpiGrid: panel at 24 166 912 118',
    '    bg white',
    '    radius 18',
    '    border',
    '      visible true',
    '      color #d8e0ea',
    ...profile.kpis.flatMap(([label, value, bg, color], index) => {
      const x = 22 + index * 220;
      return [
        `    kpi${index + 1}: panel at ${x} 20 198 78`,
        `      bg ${bg}`,
        '      radius 14',
        `      label: label ${quoteXcon(label)} at 16 12 150 18`,
        `        color ${color}`,
        '        font',
        '          size 11',
        '          weight 800',
        `      value: label ${quoteXcon(value)} at 16 36 150 26`,
        `        color ${color}`,
        '        font',
        '          size 20',
        '          weight 800',
      ];
    }),
    '  chartBlock: panel at 24 312 438 226',
    '    bg white',
    '    radius 18',
    '    border',
    '      visible true',
    '      color #d8e0ea',
    `    chartTitle: label ${quoteXcon(`${profile.kind} trend`)} at 24 22 240 24`,
    '      color #172033',
    '      font',
    '        size 17',
    '        weight 800',
    '    chartSub: label "Live artifact generated through Xenesis Desk MCP" at 24 48 330 18',
    '      color #64748b',
    '    trendChart: chart at 24 70 390 126',
    '      chartType "bar"',
    `      chartData ${JSON.stringify(chartData)}`,
    '  ownerBlock: panel at 486 312 450 226',
    '    bg white',
    '    radius 18',
    '    border',
    '      visible true',
    '      color #d8e0ea',
    '    ownerTitle: label "Owners and status" at 24 22 240 24',
    '      color #172033',
    '      font',
    '        size 17',
    '        weight 800',
    `    ownerFocus: label ${quoteXcon(profile.focus)} at 300 24 126 22`,
    `      bg ${profile.softAccent}`,
    '      color #172033',
    '      radius 11',
    '      align center',
    '      font',
    '        size 12',
    '        weight 800',
    '    ownerGrid: spanGrid at 24 70 402 126',
    '      backgroundColor white',
    '      readonly true',
    `      data ${JSON.stringify(profile.rows)}`,
    `      columns ${JSON.stringify(columns)}`,
    '  actionBlock: panel at 24 564 912 52',
    '    bg #0f172a',
    '    radius 18',
    '    next: label "Next step" at 24 16 90 20',
    '      color #93c5fd',
    '      font',
    '        size 12',
    '        weight 800',
    `    actionText: label ${quoteXcon(`Refine the ${profile.kind.toLowerCase()} dashboard, bind real data, then share it with the team.`)} at 120 16 560 20`,
    '      color white',
    '    action: button "Open in Xenesis Desk" at 740 10 142 32',
    '      bg #2563eb',
    '      color white',
    '      radius 10',
  ].join('\n');
}

function buildMarkdownDocument({ title, prompt, mode }) {
  const profile = dashboardProfile({ title, prompt });
  const sketchCode = buildSketchCode({ title, prompt });
  return [
    `# ${title}`,
    '',
    `Generated from: ${prompt}`,
    '',
    '## Dashboard snapshot',
    '',
    `- **Health score:** 87`,
    `- **Focus:** ${profile.focus}`,
    `- **Signal:** ${profile.insight}`,
    '- **Output:** Editable XCON/SKETCH dashboard opened through Xenesis Desk MCP',
    '',
    `\`\`\`xcon-sketch mode ${mode}`,
    sketchCode,
    '```',
    '',
  ].join('\n');
}

async function callBridge(pathName, body) {
  const { bridgeUrl, bridgeToken } = resolveBridgeConfig();
  const response = await fetch(`${bridgeUrl}${pathName}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bridgeToken ? { authorization: `Bearer ${bridgeToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Xenesis Desk bridge returned ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function pdfExportPayload(args, filePath, title) {
  return {
    filePath,
    ...(title ? { title } : {}),
    ...(args.pdfFileName ? { pdfFileName: args.pdfFileName } : {}),
    ...(args.pdfOutDir ? { pdfOutDir: args.pdfOutDir } : {}),
  };
}

async function exportXconPdf(args = {}) {
  const filePath = String(args.filePath || '').trim();
  if (!filePath) return toolError('filePath is required.');

  try {
    const payload = await callBridge(
      '/xcon/export-pdf',
      pdfExportPayload(args, filePath, String(args.title || '').trim()),
    );
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk XCON PDF export failed.');
    const pdfPath = String(payload?.pdfPath || '').trim();
    const lines = [`Exported PDF: ${pdfPath || 'unknown PDF path'}`, `Source: ${payload?.filePath || filePath}`].filter(
      Boolean,
    );
    return textResult(lines.join('\n'), {
      ...payload,
      filePath: String(payload?.filePath || filePath),
      pdfPath,
      pdfExported: Boolean(pdfPath),
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function maybeExportCreatedXconPdf(args, filePath, title) {
  if (args.exportPdf === true) {
    try {
      const payload = await callBridge('/xcon/export-pdf', pdfExportPayload(args, filePath, title));
      return {
        pdfExported: payload?.ok !== false && Boolean(payload?.pdfPath),
        pdfPath: String(payload?.pdfPath || ''),
        pdfError: payload?.ok === false ? String(payload?.error || 'Xenesis Desk XCON PDF export failed.') : '',
        payload,
      };
    } catch (error) {
      return {
        pdfExported: false,
        pdfPath: '',
        pdfError: error instanceof Error ? error.message : String(error),
        payload: null,
      };
    }
  }
  return {
    pdfExported: false,
    pdfPath: '',
    pdfError: '',
    payload: null,
  };
}

async function createXconMarkdown(args = {}) {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) return toolError('prompt is required.');

  const title = normalizeTitle(args.title, prompt);
  const mode = normalizeMode(args.mode);
  const placement = normalizePanelPlacement(args.placement);
  const targetPaneId = normalizeTargetPaneId(args.targetPaneId);
  const renderOptions = normalizeRenderOptions(args);
  const workspaceDir = resolveXconWorkspaceDirFromArgs(args);
  const fileName = normalizeMarkdownFileName(args.fileName, title);
  const filePath = path.join(workspaceDir, fileName);
  const content = buildMarkdownDocument({ title, prompt, mode });

  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');

  let opened = false;
  let openError = '';
  if (args.openInDesk !== false) {
    try {
      await callBridge('/open-file', {
        filePath,
        ...(placement ? { placement } : {}),
        ...(targetPaneId ? { targetPaneId } : {}),
        ...(renderOptions ? { renderOptions } : {}),
      });
      opened = true;
    } catch (error) {
      openError = error instanceof Error ? error.message : String(error);
    }
  }

  const pdfExport = await maybeExportCreatedXconPdf(args, filePath, title);
  const lines = [
    `Created ${filePath}`,
    opened ? 'Opened in Xenesis Desk.' : 'Not opened in Xenesis Desk.',
    openError ? `Open error: ${openError}` : '',
    pdfExport.pdfExported ? `Exported PDF: ${pdfExport.pdfPath}` : '',
    pdfExport.pdfError ? `PDF export error: ${pdfExport.pdfError}` : '',
  ].filter(Boolean);

  return textResult(lines.join('\n'), {
    filePath,
    title,
    mode,
    placement,
    targetPaneId,
    renderOptions,
    opened,
    openError,
    pdfExported: pdfExport.pdfExported,
    pdfPath: pdfExport.pdfPath,
    pdfError: pdfExport.pdfError,
  });
}

async function createXconMarkdownFromContent(args = {}) {
  const content = String(args.content || '');
  if (!content.trim()) return toolError('content is required.');

  const validation = validateXconMarkdownContent(content);
  if (!validation.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: validation.errors.join('\n') || 'XCON Markdown validation failed.' }],
      structuredContent: validation,
    };
  }

  const title = normalizeTitle(args.title, markdownTitleFromContent(content) || 'XCON/SKETCH Document');
  const placement = normalizePanelPlacement(args.placement);
  const targetPaneId = normalizeTargetPaneId(args.targetPaneId);
  const renderOptions = normalizeRenderOptions(args);
  const workspaceDir = resolveXconWorkspaceDirFromArgs(args);
  const fileName = normalizeMarkdownFileName(args.fileName, title);
  const filePath = path.join(workspaceDir, fileName);

  await fs.mkdir(workspaceDir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');

  let opened = false;
  let openError = '';
  if (args.openInDesk !== false) {
    try {
      await callBridge('/open-file', {
        filePath,
        ...(placement ? { placement } : {}),
        ...(targetPaneId ? { targetPaneId } : {}),
        ...(renderOptions ? { renderOptions } : {}),
      });
      opened = true;
    } catch (error) {
      openError = error instanceof Error ? error.message : String(error);
    }
  }

  const pdfExport = await maybeExportCreatedXconPdf(args, filePath, title);
  const lines = [
    `Created ${filePath}`,
    opened ? 'Opened in Xenesis Desk.' : 'Not opened in Xenesis Desk.',
    openError ? `Open error: ${openError}` : '',
    pdfExport.pdfExported ? `Exported PDF: ${pdfExport.pdfPath}` : '',
    pdfExport.pdfError ? `PDF export error: ${pdfExport.pdfError}` : '',
  ].filter(Boolean);

  return textResult(lines.join('\n'), {
    filePath,
    title,
    placement,
    targetPaneId,
    renderOptions,
    opened,
    openError,
    pdfExported: pdfExport.pdfExported,
    pdfPath: pdfExport.pdfPath,
    pdfError: pdfExport.pdfError,
    validation,
  });
}

async function openFile(args = {}) {
  const filePath = String(args.filePath || '').trim();
  const placement = normalizePanelPlacement(args.placement);
  const targetPaneId = normalizeTargetPaneId(args.targetPaneId);
  const renderOptions = normalizeRenderOptions(args);
  if (!filePath) return toolError('filePath is required.');
  if (!path.isAbsolute(filePath)) return toolError('filePath must be an absolute path.');
  if (!fsSync.existsSync(filePath)) return toolError(`file does not exist: ${filePath}`);

  try {
    await callBridge('/open-file', {
      filePath,
      ...(placement ? { placement } : {}),
      ...(targetPaneId ? { targetPaneId } : {}),
      ...(renderOptions ? { renderOptions } : {}),
    });
    return textResult(`Opened ${filePath} in Xenesis Desk.`, {
      filePath,
      opened: true,
      placement,
      targetPaneId,
      renderOptions,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function previewSafeTextFileWrite(args = {}) {
  try {
    const result = await previewTextFileWrite(args);
    const lines = [
      `File: ${result.filePath}`,
      `Existing file: ${result.existed ? 'yes' : 'no'}`,
      `Would change: ${result.wouldChange ? 'yes' : 'no'}`,
      `Backup required: ${result.backupRequired ? 'yes' : 'no'}`,
      '',
      result.diff,
    ];
    return textResult(lines.join('\n'), result);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function applySafeTextFileWrite(args = {}) {
  try {
    const result = await applyTextFileWrite(args);
    const lines = [
      `Written: ${result.filePath}`,
      result.backupCreated ? `Backup: ${result.backupPath}` : 'Backup: not required',
      result.metadataPath ? `Backup metadata: ${result.metadataPath}` : '',
    ].filter(Boolean);
    return textResult(lines.join('\n'), result);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function restoreSafeTextFileBackup(args = {}) {
  try {
    const result = await restoreTextFileBackup(args);
    return textResult(`Restored ${result.filePath} from ${result.backupPath}`, result);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function normalizePlaywrightWorkerTimeout(args = {}) {
  const parsed = Number(args.timeoutMs);
  const timeoutMs = Number.isFinite(parsed) ? Math.max(500, Math.min(parsed, 180000)) : 60000;
  return timeoutMs;
}

function runPlaywrightWorker(args = {}) {
  return new Promise((resolve, reject) => {
    const timeoutMs = normalizePlaywrightWorkerTimeout(args);
    const processTimeoutMs = Math.max(timeoutMs + 10000, 15000);
    const child = spawn(process.execPath, [PLAYWRIGHT_WORKER_PATH], {
      cwd: path.resolve(MCP_DIR, '..'),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const maxOutputBytes = 1024 * 1024;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      if (error) reject(error);
      else resolve(result);
    };

    const killTimer = setTimeout(() => {
      child.kill();
      finish(new Error(`Playwright worker timed out after ${processTimeoutMs}ms.`));
    }, processTimeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > maxOutputBytes) {
        child.kill();
        finish(new Error('Playwright worker output exceeded the maximum size.'));
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > maxOutputBytes) {
        child.kill();
        finish(new Error('Playwright worker error output exceeded the maximum size.'));
      }
    });
    child.on('error', (error) => finish(error));
    child.on('close', (code) => {
      if (settled) return;
      let payload;
      try {
        payload = JSON.parse(stdout.trim() || '{}');
      } catch {
        payload = null;
      }
      if (code !== 0) {
        const message = payload?.error || stderr.trim() || `Playwright worker exited with code ${code}.`;
        finish(new Error(message));
        return;
      }
      if (!payload || typeof payload !== 'object') {
        finish(new Error(stderr.trim() || 'Playwright worker returned an invalid response.'));
        return;
      }
      finish(null, payload);
    });
    child.stdin.end(JSON.stringify(args || {}));
  });
}

async function runPlaywrightSnapshot(args = {}) {
  let workerResult;
  try {
    workerResult = await runPlaywrightWorker({ ...args, operation: 'snapshot' });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }

  if (workerResult?.ok === false) {
    return toolError(workerResult.error || 'Playwright snapshot failed.');
  }

  const filePath = String(workerResult?.filePath || '');
  if (!filePath) return toolError('Playwright worker did not return a file path.');

  let opened = false;
  let openError = '';
  if (args.openInDesk !== false) {
    const placement = normalizePanelPlacement(args.placement);
    const targetPaneId = normalizeTargetPaneId(args.targetPaneId);
    const renderOptions = normalizeRenderOptions(args);
    try {
      await callBridge('/open-file', {
        filePath,
        ...(placement ? { placement } : {}),
        ...(targetPaneId ? { targetPaneId } : {}),
        ...(renderOptions ? { renderOptions } : {}),
      });
      opened = true;
    } catch (error) {
      openError = error instanceof Error ? error.message : String(error);
    }
  }

  const lines = [
    `Saved screenshot: ${filePath}`,
    workerResult.url ? `URL: ${workerResult.url}` : '',
    workerResult.format ? `Format: ${String(workerResult.format).toUpperCase()}` : '',
    opened ? 'Opened in Xenesis Desk image viewer.' : 'Open in Xenesis Desk image viewer disabled.',
    openError ? `Open error: ${openError}` : '',
  ].filter(Boolean);

  return textResult(lines.join('\n'), {
    ...workerResult,
    openInDesk: args.openInDesk !== false,
    targetPaneId: normalizeTargetPaneId(args.targetPaneId),
    opened,
    openError,
  });
}

async function runPlaywrightActions(args = {}) {
  let workerResult;
  try {
    workerResult = await runPlaywrightWorker({ ...args, operation: 'run' });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }

  if (workerResult?.ok === false) {
    return toolError(workerResult.error || 'Playwright action run failed.');
  }

  const artifacts = Array.isArray(workerResult?.artifacts) ? workerResult.artifacts : [];
  const actions = Array.isArray(workerResult?.actions) ? workerResult.actions : [];
  const screenshotArtifact = artifacts.find((artifact) => artifact?.type === 'screenshot' && artifact?.filePath);
  const traceArtifact = artifacts.find((artifact) => artifact?.type === 'trace' && artifact?.filePath);

  let opened = false;
  let openError = '';
  if (args.openInDesk === true && screenshotArtifact?.filePath) {
    const placement = normalizePanelPlacement(args.placement);
    const targetPaneId = normalizeTargetPaneId(args.targetPaneId);
    const renderOptions = normalizeRenderOptions(args);
    try {
      await callBridge('/open-file', {
        filePath: screenshotArtifact.filePath,
        ...(placement ? { placement } : {}),
        ...(targetPaneId ? { targetPaneId } : {}),
        ...(renderOptions ? { renderOptions } : {}),
      });
      opened = true;
    } catch (error) {
      openError = error instanceof Error ? error.message : String(error);
    }
  }

  const lines = [
    `Ran Playwright actions: ${actions.length}`,
    workerResult.url ? `URL: ${workerResult.url}` : '',
    screenshotArtifact?.filePath ? `Screenshot: ${screenshotArtifact.filePath}` : '',
    traceArtifact?.filePath ? `Trace: ${traceArtifact.filePath}` : '',
    opened ? 'Opened screenshot in Xenesis Desk.' : '',
    args.openInDesk === true && !screenshotArtifact?.filePath
      ? 'Open in Xenesis Desk skipped: no screenshot artifact.'
      : '',
    openError ? `Open error: ${openError}` : '',
  ].filter(Boolean);

  return textResult(lines.join('\n'), {
    ...workerResult,
    openInDesk: args.openInDesk === true,
    targetPaneId: normalizeTargetPaneId(args.targetPaneId),
    opened,
    openError,
  });
}
async function listDeskCapabilities() {
  try {
    const payload = await callBridge('/capabilities/list', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk capability list failed.');
    const capabilities = Array.isArray(payload?.capabilities) ? payload.capabilities : [];
    const lines = capabilities
      .map((node) => {
        const kind = node?.kind ? ` [${node.kind}]` : '';
        const callable = node?.callable ? ' callable' : '';
        return `- ${node?.path || ''}${kind}${callable}`;
      })
      .filter(Boolean);
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk capabilities are registered.', {
      ...payload,
      capabilities,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function describeDeskCapability(args = {}) {
  const capabilityPath = String(args.path || '').trim();
  if (!capabilityPath) return toolError('path is required.');

  try {
    const payload = await callBridge('/capabilities/describe', { path: capabilityPath });
    if (payload?.ok === false)
      return toolError(payload.error || `Xenesis Desk capability not found: ${capabilityPath}`);
    const capability = payload?.capability && typeof payload.capability === 'object' ? payload.capability : null;
    const lines = capability
      ? [
          `Path: ${capability.path || capabilityPath}`,
          `Kind: ${capability.kind || 'unknown'}`,
          `Label: ${capability.label || ''}`,
          capability.description ? `Description: ${capability.description}` : '',
          capability.callable ? 'Callable: yes' : '',
          capability.readable ? 'Readable: yes' : '',
          capability.subscribable ? 'Subscribable: yes' : '',
        ].filter(Boolean)
      : [`Capability: ${capabilityPath}`];
    return textResult(lines.join('\n'), {
      ...payload,
      capability,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function callDeskCapability(args = {}) {
  const capabilityPath = String(args.path || '').trim();
  if (!capabilityPath) return toolError('path is required.');

  try {
    const payload = await callBridge('/capabilities/call', {
      path: capabilityPath,
      args: args.args && typeof args.args === 'object' ? args.args : {},
      source: 'mcp',
      approved: args.approved === true,
    });
    if (payload?.approvalRequired) {
      return textResult(
        'Desk approval is required. Use the inline approval card in Xenesis Desk to continue.',
        payload,
      );
    }
    if (payload?.ok === false)
      return toolError(payload.error || `Xenesis Desk capability call failed: ${capabilityPath}`);
    return textResult(`Called Xenesis Desk capability: ${payload?.path || capabilityPath}`, payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function getDeskState() {
  try {
    const payload = await callBridge('/state', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk state request failed.');
    const terminals = Array.isArray(payload?.terminals) ? payload.terminals : [];
    const panels = Array.isArray(payload?.panels) ? payload.panels : [];
    const openFiles = Array.isArray(payload?.openFiles) ? payload.openFiles : [];
    const diagnostics = Array.isArray(payload?.diagnostics) ? payload.diagnostics : [];
    const lines = [
      `Terminals: ${terminals.length}`,
      `Panels: ${panels.length}`,
      `Open files: ${openFiles.length}`,
      `Diagnostics: ${diagnostics.length}`,
    ];
    return textResult(lines.join('\n'), {
      ...payload,
      terminals,
      panels,
      openFiles,
      diagnostics,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function getActiveContext() {
  try {
    const payload = await callBridge('/active-context', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk active context request failed.');
    const activePane = payload?.activePane && typeof payload.activePane === 'object' ? payload.activePane : null;
    const activeContent =
      payload?.activeContent && typeof payload.activeContent === 'object' ? payload.activeContent : null;
    const activeOpenFile =
      payload?.activeOpenFile && typeof payload.activeOpenFile === 'object' ? payload.activeOpenFile : null;
    const activePanel = payload?.activePanel && typeof payload.activePanel === 'object' ? payload.activePanel : null;
    const activeTerminal =
      payload?.activeTerminal && typeof payload.activeTerminal === 'object' ? payload.activeTerminal : null;
    const counts = payload?.counts && typeof payload.counts === 'object' ? payload.counts : {};
    const lines = [
      activePane ? `Pane: ${activePane.id || ''}` : '',
      activeContent
        ? `Content: ${activeContent.id || ''}${activeContent.title ? ` - ${activeContent.title}` : ''}${activeContent.contentType ? ` [${activeContent.contentType}]` : ''}`
        : '',
      activeOpenFile ? `File: ${activeOpenFile.filePath || ''}` : '',
      activePanel ? `Panel: ${activePanel.title || activePanel.contentId || ''}` : '',
      activeTerminal
        ? `Terminal: ${activeTerminal.id || ''}${activeTerminal.title ? ` - ${activeTerminal.title}` : ''}`
        : '',
      `Counts: panes ${counts.panes ?? 0}, contents ${counts.contents ?? 0}, files ${counts.openFiles ?? 0}, panels ${counts.panels ?? 0}, terminals ${counts.terminals ?? 0}`,
    ].filter(Boolean);
    return textResult(lines.length ? lines.join('\n') : 'No active Xenesis Desk context is available.', {
      ...payload,
      activePane,
      activeContent,
      activeOpenFile,
      activePanel,
      activeTerminal,
      counts,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function normalizeBridgeContextActions(value) {
  const actions = Array.isArray(value) ? value : [];
  const normalizeButton = (button) => {
    if (!button || typeof button !== 'object' || Array.isArray(button)) return undefined;
    const style = ['primary', 'secondary', 'danger'].includes(button.style) ? button.style : undefined;
    return {
      label: String(button.label || ''),
      command: String(button.command || ''),
      value: String(button.value || ''),
      ...(style ? { style } : {}),
      requiresApproval: button.requiresApproval === true,
    };
  };
  return actions
    .filter((action) => action && typeof action === 'object')
    .map((action) => ({
      id: String(action.id || ''),
      label: String(action.label || action.id || ''),
      command: String(action.command || ''),
      kind: typeof action.kind === 'string' ? action.kind : undefined,
      requiresApproval: action.requiresApproval === true,
      button: normalizeButton(action.button),
      target:
        action.target && typeof action.target === 'object' && !Array.isArray(action.target) ? action.target : undefined,
    }))
    .filter((action) => action.id && action.command);
}

async function listContextActions() {
  try {
    const payload = await callBridge('/context-actions', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk context actions request failed.');
    const actions = normalizeBridgeContextActions(payload?.actions);
    const lines = actions.map((action) => {
      const kind = action.kind ? ` [${action.kind}]` : '';
      const approval = action.requiresApproval ? ' (approval)' : '';
      return `- ${action.label}${kind}${approval}: /xd ${action.command}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk context actions are available.', {
      ...payload,
      actions,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listPanels() {
  try {
    const payload = await callBridge('/panels/list', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk panel list failed.');
    const panels = Array.isArray(payload?.panels) ? payload.panels : [];
    const lines = panels.map((panel) => {
      const id = String(panel?.id || '');
      const title = String(panel?.title || id || 'panel');
      const placement = panel?.placement ? ` (${panel.placement})` : '';
      return `- ${id}: ${title}${placement}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk bridge panels are known.', {
      ...payload,
      panels,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listOpenFiles() {
  try {
    const payload = await callBridge('/files/open', {});
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk open file list failed.');
    const openFiles = Array.isArray(payload?.openFiles) ? payload.openFiles : [];
    const lines = openFiles.map((file) => {
      const filePath = String(file?.filePath || '');
      const placement = file?.placement ? ` (${file.placement})` : '';
      return `- ${filePath}${placement}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk bridge-opened files are known.', {
      ...payload,
      openFiles,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function recentDiagnostics(args = {}) {
  try {
    const payload = await callBridge('/diagnostics/recent', {
      ...(args.limit === undefined ? {} : { limit: args.limit }),
    });
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk diagnostics request failed.');
    const diagnostics = Array.isArray(payload?.diagnostics) ? payload.diagnostics : [];
    const lines = diagnostics.map((item) => {
      const level = String(item?.level || 'info');
      const source = String(item?.source || 'system');
      const message = String(item?.message || '');
      return `- [${level}] ${source}: ${message}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No recent Xenesis Desk diagnostics entries.', {
      ...payload,
      diagnostics,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function controlRendererPerformanceTrace(args = {}) {
  try {
    const payload = await callBridge('/renderer-performance-trace', {
      ...(typeof args.enabled === 'boolean' ? { enabled: args.enabled } : {}),
      ...(args.setting === undefined ? {} : { setting: String(args.setting || '') }),
      ...(args.clear === true ? { clear: true } : {}),
    });
    if (payload?.ok === false) {
      return toolError(payload.error || 'Xenesis Desk renderer performance trace request failed.');
    }
    const enabledText = typeof payload?.enabled === 'boolean' ? (payload.enabled ? 'enabled' : 'disabled') : 'updated';
    const sampleCount = Array.isArray(payload?.summary)
      ? payload.summary.length
      : Number.isFinite(Number(payload?.itemCount))
        ? Number(payload.itemCount)
        : 0;
    const lines = [
      `Renderer performance trace ${enabledText}.`,
      `Samples: ${sampleCount}`,
      payload?.setting ? `Setting: ${payload.setting}` : '',
    ].filter(Boolean);
    return textResult(lines.join('\n'), payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function previewTerminalCommand(args = {}) {
  try {
    const payload = await callBridge('/terminal/preview', args);
    if (payload?.ok === false) return toolError(payload.error || 'Terminal preview failed.');
    const text = [`Shell: ${payload?.shell || ''}`, `CWD: ${payload?.cwd || ''}`, `Command: ${payload?.command || ''}`]
      .filter(Boolean)
      .join('\n');
    return textResult(text || 'Terminal command preview is available.', payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function compactSubagentTitle(value, fallback = 'subagent') {
  const title =
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim() || fallback;
  return title.length > 64 ? `${title.slice(0, 61)}...` : title;
}

function quoteSubagentCommandArg(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function normalizeSubagentAgent(value) {
  const agent = String(value || 'codex')
    .trim()
    .toLowerCase();
  return ['codex', 'claude', 'gemini', 'xenesis', 'custom'].includes(agent) ? agent : 'custom';
}

const XENESIS_VISIBLE_SUBAGENT_SKILL = 'xd';
const XENESIS_VISIBLE_SUBAGENT_CONTRACT_VERSION = 'visible-subagent-v1';

function buildDefaultSubagentCommand(agent, task) {
  const prompt = quoteSubagentCommandArg(task);
  if (agent === 'claude') return `claude -p ${prompt}`;
  if (agent === 'gemini') return `gemini -p ${prompt}`;
  if (agent === 'xenesis') return `xenesis run ${prompt}`;
  if (agent === 'custom') return `echo ${prompt}`;
  return `codex exec ${prompt}`;
}

function buildSubagentStartRequest(args = {}) {
  const task = String(args.task || '').trim();
  if (!task) throw new Error('task is required.');
  const agent = normalizeSubagentAgent(args.agent);
  const command = String(args.command || '').trim() || buildDefaultSubagentCommand(agent, task);
  const title = `Subagent: ${compactSubagentTitle(args.title, task)}`;
  const subagentId = String(args.subagentId || args.id || `subagent-${Date.now().toString(36)}`).trim();
  return {
    command,
    ...(args.shell === undefined ? {} : { shell: args.shell }),
    ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
    ...(args.id === undefined ? {} : { id: args.id }),
    ...(args.cols === undefined ? {} : { cols: args.cols }),
    ...(args.rows === undefined ? {} : { rows: args.rows }),
    title,
    metadata: {
      kind: 'xenesis-desk-subagent',
      subagentId,
      agent,
      provider: agent,
      skill: XENESIS_VISIBLE_SUBAGENT_SKILL,
      contractVersion: XENESIS_VISIBLE_SUBAGENT_CONTRACT_VERSION,
      task,
      command,
      ...(args.parentTermId === undefined ? {} : { parentTermId: String(args.parentTermId || '').trim() }),
    },
  };
}

async function runTerminalCommand(args = {}) {
  try {
    const payload = await callBridge('/terminal/run', args);
    if (payload?.ok === false) return toolError(payload.error || 'Terminal command failed.');
    const text = [
      `Started Xenesis Desk terminal: ${payload?.id || ''}`,
      payload?.title ? `Title: ${payload.title}` : '',
      payload?.cwd ? `CWD: ${payload.cwd}` : '',
      payload?.mcpCommand ? `Command: ${payload.mcpCommand}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return textResult(text, payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function copyDefinedString(source, target, key) {
  if (source[key] === undefined) return;
  const value = String(source[key]).trim();
  if (value) target[key] = value;
}

function copyDefinedNumber(source, target, key) {
  if (source[key] === undefined) return;
  const value = Number(source[key]);
  if (Number.isFinite(value)) target[key] = value;
}

async function resolveTerminalImageTargetId(args = {}) {
  const explicit = String(args.termId || args.id || '').trim();
  if (explicit) return explicit;

  try {
    const contextPayload = await callBridge('/active-context', {});
    const activeTerminal =
      contextPayload?.activeTerminal && typeof contextPayload.activeTerminal === 'object'
        ? contextPayload.activeTerminal
        : null;
    const activeId = String(activeTerminal?.id || '').trim();
    if (contextPayload?.ok !== false && activeId) return activeId;
  } catch {
    // Fall through to terminal list fallback.
  }

  const listPayload = await callBridge('/terminal/list', {});
  if (listPayload?.ok === false) {
    throw new Error(listPayload.error || 'Terminal list failed while resolving image target.');
  }
  const sessions = Array.isArray(listPayload?.sessions) ? listPayload.sessions : [];
  const firstId = String(sessions[0]?.id || '').trim();
  if (!firstId) {
    throw new Error('termId is required because no active or known Xenesis Desk terminal is available.');
  }
  return firstId;
}

async function callTerminalImageCapability(capabilityPath, args, imageArgs) {
  const termId = await resolveTerminalImageTargetId(args);
  return callDeskCapability({
    path: capabilityPath,
    approved: true,
    args: {
      termId,
      ...imageArgs,
    },
  });
}

async function showTerminalImage(args = {}) {
  const source = String(args.source || '').trim();
  if (!source) return toolError('source is required.');
  const imageArgs = { source };
  copyDefinedString(args, imageArgs, 'width');
  copyDefinedString(args, imageArgs, 'height');
  copyDefinedString(args, imageArgs, 'filename');
  if (args.preserveAspectRatio !== undefined) imageArgs.preserveAspectRatio = args.preserveAspectRatio === true;
  return callTerminalImageCapability('xd.terminals.image.show', args, imageArgs);
}

async function showTerminalImageBase64(args = {}) {
  const base64 = String(args.base64 || '').trim();
  if (!base64) return toolError('base64 is required.');
  const imageArgs = { base64 };
  copyDefinedString(args, imageArgs, 'width');
  copyDefinedString(args, imageArgs, 'height');
  copyDefinedString(args, imageArgs, 'filename');
  if (args.preserveAspectRatio !== undefined) imageArgs.preserveAspectRatio = args.preserveAspectRatio === true;
  return callTerminalImageCapability('xd.terminals.image.showBase64', args, imageArgs);
}

async function showTerminalXconImage(args = {}) {
  const xcon = String(args.xcon || '').trim();
  if (!xcon) return toolError('xcon is required.');
  const imageArgs = { xcon };
  copyDefinedString(args, imageArgs, 'width');
  copyDefinedString(args, imageArgs, 'height');
  copyDefinedString(args, imageArgs, 'syntax');
  copyDefinedString(args, imageArgs, 'theme');
  copyDefinedString(args, imageArgs, 'title');
  copyDefinedNumber(args, imageArgs, 'viewportWidth');
  return callTerminalImageCapability('xd.terminals.image.showXcon', args, imageArgs);
}

async function startDeskSubagent(args = {}) {
  try {
    const request = buildSubagentStartRequest(args);
    const payload = await callBridge('/terminal/run', request);
    if (payload?.ok === false) return toolError(payload.error || 'Desk-visible subagent terminal failed.');
    const subagent = {
      ...request.metadata,
      id: payload?.id || request.id || request.metadata.subagentId,
      title: request.title,
    };
    const text = [
      `Started Desk-visible subagent: ${subagent.id}`,
      `Agent: ${subagent.agent}`,
      subagent.parentTermId ? `Parent terminal: ${subagent.parentTermId}` : '',
      `Title: ${request.title}`,
      `Command: ${request.command}`,
    ]
      .filter(Boolean)
      .join('\n');
    return textResult(text, {
      ...payload,
      subagent,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listDeskSubagents() {
  return listTerminalSessions();
}

async function tailDeskSubagent(args = {}) {
  return tailTerminalSession(args);
}

async function stopDeskSubagent(args = {}) {
  return stopTerminalSession(args);
}

async function tailTerminalSession(args = {}) {
  const id = String(args.id || '').trim();
  if (!id) return toolError('id is required.');
  try {
    const payload = await callBridge('/terminal/tail', {
      id,
      ...(args.maxBytes === undefined ? {} : { maxBytes: args.maxBytes }),
    });
    if (payload?.ok === false) return toolError(payload.error || `Terminal session not found: ${id}`);
    return textResult(payload?.tail || '', payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function stopTerminalSession(args = {}) {
  const id = String(args.id || '').trim();
  if (!id) return toolError('id is required.');
  try {
    const payload = await callBridge('/terminal/stop', { id });
    if (payload?.ok === false) return toolError(payload.error || `Terminal session not found: ${id}`);
    return textResult(`Stopped Xenesis Desk terminal: ${id}`, payload);
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listTerminalSessions() {
  try {
    const payload = await callBridge('/terminal/list', {});
    if (payload?.ok === false) return toolError(payload.error || 'Terminal list failed.');
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
    const lines = sessions.map((session) => {
      const id = String(session?.id || '');
      const title = String(session?.title || session?.shell || 'terminal');
      const cwd = session?.cwd ? ` (${session.cwd})` : '';
      return `- ${id}: ${title}${cwd}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk terminal sessions are running.', {
      ...payload,
      sessions,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function normalizeBridgeCommands(value, includeDisabled) {
  const commands = Array.isArray(value) ? value : [];
  return commands
    .filter((command) => command && typeof command === 'object')
    .filter((command) => includeDisabled || command.enabled !== false)
    .map((command) => ({
      id: String(command.id || ''),
      title: String(command.title || command.id || ''),
      category: typeof command.category === 'string' ? command.category : undefined,
      extensionId: String(command.extensionId || ''),
      extensionName: String(command.extensionName || ''),
      enabled: command.enabled !== false,
      source: typeof command.source === 'string' ? command.source : undefined,
      commandPalette: command.commandPalette === true,
      menuLocations: Array.isArray(command.menuLocations)
        ? command.menuLocations.filter((item) => typeof item === 'string')
        : [],
    }))
    .filter((command) => command.id);
}

async function listCommandPalette(args = {}) {
  const includeDisabled = args.includeDisabled === true;
  const query = String(args.query || '').trim();

  try {
    const payload = await callBridge('/command-palette', {
      ...(query ? { query } : {}),
      includeDisabled,
    });
    if (payload?.ok === false) return toolError(payload.error || 'Xenesis Desk command palette request failed.');
    const commands = normalizeBridgeCommands(payload?.commands, includeDisabled);
    const lines = commands.map((command) => {
      const menuText = command.menuLocations.length ? ` [${command.menuLocations.join(', ')}]` : '';
      const disabledText = command.enabled ? '' : ' (disabled)';
      return `- ${command.id}: ${command.title}${menuText}${disabledText}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No Xenesis Desk command palette commands matched.', {
      ...payload,
      query,
      commands,
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function runCommandPalette(args = {}) {
  const commandId = String(args.commandId || '').trim();
  if (!commandId) return toolError('commandId is required.');
  const panelPlacement = normalizePanelPlacement(args.panelPlacement);

  try {
    const payload = await callBridge('/command-palette/run', {
      commandId,
      ...(panelPlacement ? { panelPlacement } : {}),
    });
    if (payload?.ok === false) {
      return toolError(payload.error || `Command palette command failed: ${commandId}`);
    }
    return textResult(payload?.message || `Ran command palette command: ${commandId}`, {
      ok: payload?.ok !== false,
      commandId: payload?.commandId || commandId,
      actionsDispatched: payload?.actionsDispatched !== false,
      actions: Array.isArray(payload?.actions) ? payload.actions : [],
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function listExtensionCommands(args = {}) {
  const includeDisabled = args.includeDisabled === true;

  try {
    const payload = await callBridge('/extension-commands', {});
    const commands = normalizeBridgeCommands(payload?.commands, includeDisabled);
    const lines = commands.map((command) => {
      const menuText = command.menuLocations.length ? ` [${command.menuLocations.join(', ')}]` : '';
      const disabledText = command.enabled ? '' : ' (disabled)';
      return `- ${command.id}: ${command.title}${menuText}${disabledText}`;
    });
    return textResult(lines.length ? lines.join('\n') : 'No extension commands are registered.', { commands });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function runExtensionCommand(args = {}) {
  const commandId = String(args.commandId || '').trim();
  if (!commandId) return toolError('commandId is required.');
  const panelPlacement = normalizePanelPlacement(args.panelPlacement);

  try {
    const payload = await callBridge('/run-extension-command', {
      commandId,
      ...(panelPlacement ? { panelPlacement } : {}),
    });
    if (payload?.ok === false) {
      return toolError(payload.error || `Extension command failed: ${commandId}`);
    }
    return textResult(payload?.message || `Ran extension command: ${commandId}`, {
      ok: payload?.ok !== false,
      commandId: payload?.commandId || commandId,
      actionsDispatched: payload?.actionsDispatched !== false,
      actions: Array.isArray(payload?.actions) ? payload.actions : [],
    });
  } catch (error) {
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

async function handleToolCall(params = {}) {
  const name = String(params.name || '');
  const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
  if (name === 'xenesis_desk_get_xcon_prompt') return getXconPrompt(args);
  if (name === 'xenesis_desk_validate_xcon_markdown') return validateXconMarkdown(args);
  if (name === 'xenesis_desk_create_xcon_markdown_from_content') return createXconMarkdownFromContent(args);
  if (name === 'xenesis_desk_create_xcon_markdown') return createXconMarkdown(args);
  if (name === 'xenesis_desk_export_xcon_pdf') return exportXconPdf(args);
  if (name === 'xenesis_desk_open_file') return openFile(args);
  if (name === 'xenesis_desk_preview_text_file_write') return previewSafeTextFileWrite(args);
  if (name === 'xenesis_desk_apply_text_file_write') return applySafeTextFileWrite(args);
  if (name === 'xenesis_desk_restore_text_file_backup') return restoreSafeTextFileBackup(args);
  if (name === 'xenesis_desk_playwright_snapshot') return runPlaywrightSnapshot(args);
  if (name === 'xenesis_desk_playwright_run') return runPlaywrightActions(args);
  if (name === 'xenesis_desk_capabilities') return listDeskCapabilities(args);
  if (name === 'xenesis_desk_capability') return describeDeskCapability(args);
  if (name === 'xenesis_desk_call_capability') return callDeskCapability(args);
  if (name === 'xenesis_desk_state') return getDeskState(args);
  if (name === 'xenesis_desk_active_context') return getActiveContext(args);
  if (name === 'xenesis_desk_context_actions') return listContextActions(args);
  if (name === 'xenesis_desk_list_panels') return listPanels(args);
  if (name === 'xenesis_desk_list_open_files') return listOpenFiles(args);
  if (name === 'xenesis_desk_recent_diagnostics') return recentDiagnostics(args);
  if (name === 'xenesis_desk_renderer_performance_trace') return controlRendererPerformanceTrace(args);
  if (name === 'xenesis_desk_terminal_preview') return previewTerminalCommand(args);
  if (name === 'xenesis_desk_terminal_run') return runTerminalCommand(args);
  if (name === 'xenesis_desk_terminal_tail') return tailTerminalSession(args);
  if (name === 'xenesis_desk_terminal_stop') return stopTerminalSession(args);
  if (name === 'xenesis_desk_terminal_list') return listTerminalSessions(args);
  if (name === 'xenesis_desk_terminal_image_show') return showTerminalImage(args);
  if (name === 'xenesis_desk_terminal_image_show_base64') return showTerminalImageBase64(args);
  if (name === 'xenesis_desk_terminal_xcon_image_show') return showTerminalXconImage(args);
  if (name === 'xenesis_desk_subagent_start') return startDeskSubagent(args);
  if (name === 'xenesis_desk_subagent_list') return listDeskSubagents(args);
  if (name === 'xenesis_desk_subagent_tail') return tailDeskSubagent(args);
  if (name === 'xenesis_desk_subagent_stop') return stopDeskSubagent(args);
  if (name === 'xenesis_desk_command_palette') return listCommandPalette(args);
  if (name === 'xenesis_desk_run_command_palette') return runCommandPalette(args);
  if (name === 'xenesis_desk_list_extension_commands') return listExtensionCommands(args);
  if (name === 'xenesis_desk_run_extension_command') return runExtensionCommand(args);
  return toolError(`Unknown tool: ${name}`);
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === 'initialize') {
    sendResult(id, {
      protocolVersion: params?.protocolVersion || '2025-06-18',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    });
    return;
  }

  if (method === 'ping') {
    sendResult(id, {});
    return;
  }

  if (method === 'resources/list') {
    sendResult(id, { resources: listPromptResources() });
    return;
  }

  if (method === 'resources/read') {
    sendResult(id, await readPromptResource(params?.uri));
    return;
  }

  if (method === 'prompts/list') {
    sendResult(id, listPromptTemplates());
    return;
  }

  if (method === 'prompts/get') {
    sendResult(id, await getPromptTemplate(params));
    return;
  }

  if (method === 'tools/list') {
    sendResult(id, { tools });
    return;
  }

  if (method === 'tools/call') {
    sendResult(id, await handleToolCall(params));
    return;
  }

  sendError(id, -32601, `Method not found: ${method}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

let requestQueue = Promise.resolve();

rl.on('line', (line) => {
  const text = line.trim();
  if (!text) return;
  let message;
  try {
    message = JSON.parse(text);
  } catch (error) {
    sendError(null, -32700, 'Parse error', error instanceof Error ? error.message : String(error));
    return;
  }

  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    sendError(message?.id ?? null, -32600, 'Invalid Request');
    return;
  }

  if (message.id === undefined || message.id === null) {
    return;
  }

  requestQueue = requestQueue.then(async () => {
    try {
      await handleRequest(message);
    } catch (error) {
      sendError(message.id, -32603, error instanceof Error ? error.message : String(error));
    }
  });
});
