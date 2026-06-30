import { z } from 'zod';

const echoInputSchema = z.object({
  text: z.string().min(1),
  prefix: z.string().default(''),
});

const slugifyInputSchema = z.object({
  text: z.string().min(1),
  separator: z.string().min(1).max(3).default('-'),
});

function slugify(text, separator) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, separator)
    .replace(new RegExp(`${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+`, 'g'), separator)
    .replace(
      new RegExp(
        `^${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'g',
      ),
      '',
    );
}

export const sampleEchoTool = {
  name: 'sample_echo',
  description: 'Echo text with an optional prefix.',
  inputSchema: echoInputSchema,
  openaiInputSchema: z.object({
    text: z.string(),
    prefix: z.string(),
  }),
  isReadOnly() {
    return true;
  },
  async run(input) {
    return {
      ok: true,
      content: `${input.prefix}${input.text}`,
    };
  },
};

export const sampleSlugifyTool = {
  name: 'sample_slugify',
  description: 'Convert text into a lowercase URL slug.',
  inputSchema: slugifyInputSchema,
  openaiInputSchema: z.object({
    text: z.string(),
    separator: z.string(),
  }),
  isReadOnly() {
    return true;
  },
  async run(input) {
    return {
      ok: true,
      content: slugify(input.text, input.separator),
    };
  },
};
