import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute } from "node:path";
import { z } from "zod";
import { assertExistingPathInsideWorkspace } from "../utils/workspace.js";
import type { Tool } from "./types.js";

const editModes = ["replace", "insert", "delete"] as const;
const cellTypes = ["code", "markdown"] as const;

const nullableToUndefined = (value: unknown) => value === null ? undefined : value;

const notebookEditInput = z.object({
  notebook_path: z.string().min(1),
  cell_id: z.preprocess(nullableToUndefined, z.string().min(1).optional()),
  cell_number: z.preprocess(nullableToUndefined, z.number().int().min(0).optional()),
  new_source: z.preprocess(nullableToUndefined, z.string().optional()),
  cell_type: z.preprocess(nullableToUndefined, z.enum(cellTypes).optional()),
  edit_mode: z.preprocess(nullableToUndefined, z.enum(editModes).optional())
});

const notebookEditOpenAIInput = z.object({
  notebook_path: z.string().min(1),
  cell_id: z.string().min(1).nullable(),
  cell_number: z.number().int().min(0).nullable(),
  new_source: z.string().nullable(),
  cell_type: z.enum(cellTypes).nullable(),
  edit_mode: z.enum(editModes).nullable()
});

type NotebookEditInput = z.infer<typeof notebookEditInput>;
type NotebookCellType = typeof cellTypes[number];
type NotebookEditMode = typeof editModes[number];

interface NotebookCell {
  id?: string;
  cell_type: NotebookCellType | string;
  metadata?: Record<string, unknown>;
  source?: unknown;
  execution_count?: number | null;
  outputs?: unknown[];
}

interface NotebookDocument {
  cells: NotebookCell[];
  metadata?: {
    language_info?: {
      name?: string;
    };
  };
  nbformat?: number;
  nbformat_minor?: number;
}

export interface NotebookEditResult {
  notebook_path: string;
  cell_id?: string;
  cell_number: number;
  cell_type: NotebookCellType;
  edit_mode: NotebookEditMode;
  language: string;
  original_file: string;
  updated_file: string;
}

function parseNotebook(content: string): NotebookDocument | undefined {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object") return undefined;
  const notebook = parsed as Partial<NotebookDocument>;
  if (!Array.isArray(notebook.cells)) return undefined;
  return notebook as NotebookDocument;
}

function parseCellIdIndex(cellId: string): number | undefined {
  const match = cellId.match(/^cell-(\d+)$/u) ?? cellId.match(/^(\d+)$/u);
  if (!match) return undefined;
  return Number(match[1]);
}

function generatedCellId(notebook: NotebookDocument) {
  if ((notebook.nbformat ?? 4) > 4 || ((notebook.nbformat ?? 4) === 4 && (notebook.nbformat_minor ?? 0) >= 5)) {
    return randomUUID().replace(/-/gu, "").slice(0, 12);
  }
  return undefined;
}

function normalizeEditMode(input: NotebookEditInput): NotebookEditMode {
  return input.edit_mode ?? "replace";
}

function resolveCellIndex(
  notebook: NotebookDocument,
  input: NotebookEditInput,
  editMode: NotebookEditMode
) {
  if (input.cell_id) {
    const exact = notebook.cells.findIndex((cell) => cell.id === input.cell_id);
    const parsed = exact >= 0 ? exact : parseCellIdIndex(input.cell_id);
    if (parsed === undefined || !notebook.cells[parsed]) {
      return { ok: false as const, message: `Cell with ID "${input.cell_id}" not found in notebook.` };
    }
    return {
      ok: true as const,
      index: editMode === "insert" ? parsed + 1 : parsed
    };
  }

  if (input.cell_number !== undefined) {
    return {
      ok: true as const,
      index: input.cell_number
    };
  }

  if (editMode === "insert") {
    return { ok: true as const, index: 0 };
  }

  return {
    ok: false as const,
    message: "Cell ID or cell number must be specified when not inserting a new cell."
  };
}

function validateNotebookEditInput(input: NotebookEditInput, notebook: NotebookDocument, editMode: NotebookEditMode) {
  if (editMode === "insert" && !input.cell_type) {
    return "Cell type is required when using edit_mode=insert.";
  }
  if (editMode !== "delete" && input.new_source === undefined) {
    return "new_source is required when edit_mode is replace or insert.";
  }

  const resolved = resolveCellIndex(notebook, input, editMode);
  if (!resolved.ok) return resolved.message;

  if (editMode === "insert") {
    if (resolved.index < 0 || resolved.index > notebook.cells.length) {
      return `Insert index ${resolved.index} is outside notebook bounds.`;
    }
    return undefined;
  }

  if (!notebook.cells[resolved.index]) {
    return `Notebook cell #${resolved.index} was not found.`;
  }

  return undefined;
}

function makeCell(notebook: NotebookDocument, cellType: NotebookCellType, source: string): NotebookCell {
  if (cellType === "markdown") {
    return {
      id: generatedCellId(notebook),
      cell_type: "markdown",
      metadata: {},
      source
    };
  }

  return {
    id: generatedCellId(notebook),
    cell_type: "code",
    metadata: {},
    source,
    execution_count: null,
    outputs: []
  };
}

export const notebookEditTool: Tool<NotebookEditInput, NotebookEditResult> = {
  name: "notebook_edit",
  description: [
    "Replace the contents of a specific cell in a Jupyter notebook.",
    "Completely replaces, inserts, or deletes a specific cell in a Jupyter notebook (.ipynb file) with new source.",
    "The notebook_path parameter must be an absolute path, not a relative path.",
    "The cell_number is 0-indexed. Use edit_mode=insert to add a new cell at the index specified by cell_number.",
    "Use edit_mode=delete to delete the cell at the index specified by cell_number."
  ].join(" "),
  inputSchema: notebookEditInput,
  openaiInputSchema: notebookEditOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    const editMode = normalizeEditMode(input);
    if (!isAbsolute(input.notebook_path)) {
      return { ok: false, content: "notebook_path must be an absolute path." };
    }
    if (extname(input.notebook_path) !== ".ipynb") {
      return { ok: false, content: "File must be a Jupyter notebook (.ipynb file)." };
    }

    let absolutePath: string;
    try {
      absolutePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.notebook_path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: message };
    }

    const originalFile = await readFile(absolutePath, "utf8");
    let notebook: NotebookDocument;
    try {
      const parsed = parseNotebook(originalFile);
      if (!parsed) return { ok: false, content: "Notebook is not valid Jupyter JSON." };
      notebook = parsed;
    } catch {
      return { ok: false, content: "Notebook is not valid JSON." };
    }

    const validationError = validateNotebookEditInput(input, notebook, editMode);
    if (validationError) {
      return { ok: false, content: validationError };
    }

    const resolved = resolveCellIndex(notebook, input, editMode);
    if (!resolved.ok) return { ok: false, content: resolved.message };
    const cellNumber = resolved.index;
    const language = notebook.metadata?.language_info?.name ?? "python";
    let cellType: NotebookCellType;

    if (editMode === "delete") {
      const [removed] = notebook.cells.splice(cellNumber, 1);
      cellType = removed?.cell_type === "markdown" ? "markdown" : "code";
    } else if (editMode === "insert") {
      cellType = input.cell_type ?? "code";
      notebook.cells.splice(cellNumber, 0, makeCell(notebook, cellType, input.new_source ?? ""));
    } else {
      const target = notebook.cells[cellNumber]!;
      const requestedCellType = input.cell_type;
      cellType = requestedCellType ?? (target.cell_type === "markdown" ? "markdown" : "code");
      target.source = input.new_source ?? "";
      if (target.cell_type === "code") {
        target.execution_count = null;
        target.outputs = [];
      }
      if (requestedCellType) {
        target.cell_type = requestedCellType;
        if (requestedCellType === "code") {
          target.execution_count = null;
          target.outputs = [];
        }
      }
    }

    const updatedFile = JSON.stringify(notebook, null, 1);
    await writeFile(absolutePath, updatedFile, "utf8");
    const fileName = basename(absolutePath);
    const action = editMode === "replace"
      ? `Updated cell ${cellNumber}`
      : editMode === "insert"
        ? `Inserted ${cellType} cell at index ${cellNumber}`
        : `Deleted cell ${cellNumber}`;

    return {
      ok: true,
      content: `${action} in ${fileName}.`,
      data: {
        notebook_path: absolutePath,
        ...(notebook.cells[cellNumber]?.id ? { cell_id: notebook.cells[cellNumber]!.id } : {}),
        cell_number: cellNumber,
        cell_type: cellType,
        edit_mode: editMode,
        language,
        original_file: originalFile,
        updated_file: updatedFile
      }
    };
  }
};
