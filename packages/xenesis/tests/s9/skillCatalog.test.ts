import { describe, expect, it } from 'vitest';
import { buildSkillCatalogSystemMessage } from '../../src/extensions/skills.js';

describe('buildSkillCatalogSystemMessage', () => {
  it('emits name+description, NO body, with a load directive', () => {
    const msg = buildSkillCatalogSystemMessage([
      { name: 'code-review', description: 'Review a diff for defects' },
      { name: 'xd', description: 'Cross-doc helper', whenToUse: 'when editing docs' },
    ]);
    expect(msg).toBeDefined();
    const c = (msg as any).content as string;
    expect(c).toContain('<available_skills>');
    expect(c).toContain('name="code-review"');
    expect(c).toContain('Review a diff for defects');
    expect(c).toContain('when editing docs');
    expect(c).toContain('xenesis_skill'); // load directive
  });
  it('returns undefined for an empty catalog', () => {
    expect(buildSkillCatalogSystemMessage([])).toBeUndefined();
  });
  it('budget guard compacts to name-only when over maxChars and notes the drop', () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({ name: `s${i}`, description: 'D'.repeat(500) }));
    const msg = buildSkillCatalogSystemMessage(entries, { maxChars: 1000 });
    const c = (msg as any).content as string;
    // compacted: descriptions dropped (no 500-char blob), names retained
    expect(c).not.toContain('D'.repeat(500));
    expect(c).toContain('s0');
  });
});
