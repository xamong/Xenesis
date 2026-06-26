import { z } from "zod";
import type { Tool } from "./types.js";

const nullableOptionalString = z.preprocess(
  (value) => value === null ? undefined : value,
  z.string().optional()
);

const askOptionInput = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
  preview: nullableOptionalString
});

const askQuestionInput = z.object({
  question: z.string().min(1),
  header: z.string().min(1),
  options: z.array(askOptionInput).min(2).max(4),
  multiSelect: z.boolean().default(false)
});

const askAnnotationInput = z.object({
  preview: nullableOptionalString,
  notes: nullableOptionalString
});

const referenceAskInput = z.object({
  questions: z.array(askQuestionInput).min(1).max(4),
  question: nullableOptionalString,
  answers: z.preprocess(
    (value) => value === null ? undefined : value,
    z.record(z.string()).optional()
  ),
  annotations: z.preprocess(
    (value) => value === null ? undefined : value,
    z.record(askAnnotationInput).optional()
  ),
  metadata: z.preprocess(
    (value) => value === null ? undefined : value,
    z.object({
      source: nullableOptionalString
    }).optional()
  )
}).refine((data) => {
  const questionTexts = data.questions.map((question) => question.question);
  if (questionTexts.length !== new Set(questionTexts).size) return false;
  return data.questions.every((question) => {
    const labels = question.options.map((option) => option.label);
    return labels.length === new Set(labels).size;
  });
}, {
  message: "Question texts must be unique, option labels must be unique within each question"
});

const legacyAskInput = z.object({
  question: z.string().min(1)
});

const askInput = z.union([referenceAskInput, legacyAskInput]);

const askOutput = z.object({
  questions: z.array(askQuestionInput),
  answers: z.record(z.string()),
  annotations: z.record(askAnnotationInput).optional()
});

const askOpenAIInput = z.object({
  question: z.string().nullable(),
  questions: z.array(z.object({
    question: z.string(),
    header: z.string(),
    options: z.array(z.object({
      label: z.string(),
      description: z.string(),
      preview: z.string().nullable()
    })).min(2).max(4),
    multiSelect: z.boolean().nullable()
  })).min(1).max(4).nullable(),
  answers: z.record(z.string()).nullable(),
  annotations: z.record(z.object({
    preview: z.string().nullable(),
    notes: z.string().nullable()
  })).nullable(),
  metadata: z.object({
    source: z.string().nullable()
  }).nullable()
});

type AskInput = z.infer<typeof askInput>;
type ReferenceAskInput = z.infer<typeof referenceAskInput>;
type AskOutput = z.infer<typeof askOutput>;

function isReferenceAskInput(input: AskInput): input is ReferenceAskInput {
  return "questions" in input;
}

function questionText(input: ReferenceAskInput) {
  return input.questions.map((question) => question.question).join(" | ");
}

function resultBlockContent(result: Pick<AskOutput, "answers" | "annotations">) {
  const answersText = Object.entries(result.answers).map(([question, answer]) => {
    const annotation = result.annotations?.[question];
    const parts = [`"${question}"="${answer}"`];
    if (annotation?.preview) {
      parts.push(`choice preview:\n${annotation.preview}`);
    }
    if (annotation?.notes) {
      parts.push(`user notes: ${annotation.notes}`);
    }
    return parts.join(" ");
  }).join(", ");
  return `User has answered your questions: ${answersText}. You can now continue with the user's answers in mind.`;
}

function validatePreviewFragment(preview: string | undefined): string | null {
  if (preview === undefined) return null;
  if (/<\s*(html|body|!doctype)\b/i.test(preview)) {
    return "preview must be an HTML fragment, not a full document";
  }
  if (/<\s*(script|style)\b/i.test(preview)) {
    return "preview must not contain <script> or <style> tags";
  }
  if (!/<[a-z][^>]*>/i.test(preview)) {
    return "preview must contain HTML";
  }
  return null;
}

export const askTool: Tool<AskInput, AskOutput> = {
  name: "ask",
  description: [
    "Asks the user multiple choice questions to gather information, clarify ambiguity, understand preferences, make decisions or offer them choices.",
    "Use this tool when you need user input during execution. Users can select Other to provide custom text.",
    "Use multiSelect for questions where multiple answers are valid. Put the recommended option first and suffix its label with (Recommended)."
  ].join("\n\n"),
  searchHint: "prompt the user with a multiple-choice question",
  shouldDefer: true,
  maxResultSizeChars: 100_000,
  inputSchema: askInput,
  outputSchema: askOutput,
  openaiInputSchema: askOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  requiresUserInteraction: () => true,
  toAutoClassifierInput(input) {
    return isReferenceAskInput(input) ? questionText(input) : input.question;
  },
  async validateInput(input) {
    if (!isReferenceAskInput(input)) return { result: true };
    for (const question of input.questions) {
      for (const option of question.options) {
        const error = validatePreviewFragment(option.preview);
        if (error) {
          const message = `Option "${option.label}" in question "${question.question}": ${error}`;
          return {
            result: false,
            errorCode: 1,
            message
          };
        }
      }
    }
    return { result: true };
  },
  async checkPermissions(input) {
    return {
      behavior: "ask",
      message: "Answer questions?",
      updatedInput: input
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      type: "tool_result",
      content: resultBlockContent(result),
      tool_use_id: toolUseId
    };
  },
  async run(input, context) {
    if (isReferenceAskInput(input)) {
      const data: AskOutput = {
        questions: input.questions,
        answers: input.answers ?? {},
        ...(input.annotations ? { annotations: input.annotations } : {})
      };
      const combinedQuestion = questionText(input);
      context.emit({
        type: "ask",
        question: combinedQuestion,
        questions: input.questions,
        ...(input.metadata ? { metadata: input.metadata } : {})
      });
      return {
        ok: true,
        content: Object.keys(data.answers).length > 0
          ? resultBlockContent(data)
          : `User input required: ${combinedQuestion}`,
        data
      };
    }

    context.emit({ type: "ask", question: input.question });
    return {
      ok: true,
      content: `User input required: ${input.question}`,
      data: {
        questions: [{
          question: input.question,
          header: "Question",
          options: [
            { label: "Answer", description: "Provide the requested answer." },
            { label: "Skip", description: "Do not answer this question." }
          ],
          multiSelect: false
        }],
        answers: {}
      }
    };
  }
};
