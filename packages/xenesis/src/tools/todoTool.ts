import { z } from "zod";
import type { Tool } from "./types.js";

const todoInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), text: z.string().min(1) }),
  z.object({ action: z.literal("complete"), id: z.number().int().positive() }),
  z.object({ action: z.literal("list") })
]);

const openaiTodoInput = z.object({
  action: z.enum(["add", "complete", "list"]),
  text: z.string().min(1).nullable(),
  id: z.number().int().positive().nullable()
});

export const todoTool: Tool<z.infer<typeof todoInput>> = {
  name: "todo",
  description: [
    "Maintain a short task list for the current run.",
    "Use this tool, not plain text only, when the user asks to create, track, or organize a todo/checklist/단계별 작업 list.",
    "For long-running or multi-step work, add immediate coordination steps here before using task_handoff."
  ].join(" "),
  inputSchema: todoInput,
  openaiInputSchema: openaiTodoInput,
  isReadOnly: () => false,
  async run(input, context) {
    if (input.action === "add") {
      const nextId = context.todos.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      context.todos.push({ id: nextId, text: input.text, done: false });
    }

    if (input.action === "complete") {
      const item = context.todos.find((todo) => todo.id === input.id);
      if (!item) return { ok: false, content: `Todo ${input.id} not found.` };
      item.done = true;
    }

    const lines = context.todos.map((item) => `[${item.done ? "done" : "open"}] ${item.id}. ${item.text}`);
    return { ok: true, content: lines.length > 0 ? lines.join("\n") : "No todos." };
  }
};
