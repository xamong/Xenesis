import assert from 'node:assert/strict';
import test from 'node:test';
import { isEligibleGlobalNativeEditElement } from './globalNativeEditSurface';

function textInput(overrides: Partial<HTMLInputElement> = {}): HTMLInputElement {
  return {
    tagName: 'INPUT',
    type: 'text',
    readOnly: false,
    disabled: false,
    id: '',
    name: '',
    placeholder: '',
    getAttribute() {
      return null;
    },
    ...overrides,
  } as HTMLInputElement;
}

test('global native edit surface accepts safe text inputs and textareas', () => {
  const textarea = {
    tagName: 'TEXTAREA',
    readOnly: false,
    disabled: false,
    id: '',
    name: '',
    placeholder: '',
    getAttribute() {
      return null;
    },
  } as unknown as HTMLTextAreaElement;
  const searchInput = textInput({ type: 'search' });

  assert.equal(isEligibleGlobalNativeEditElement(textarea), true);
  assert.equal(isEligibleGlobalNativeEditElement(textInput()), true);
  assert.equal(isEligibleGlobalNativeEditElement(searchInput), true);
});

test('global native edit surface rejects secrets and non-text controls', () => {
  const password = textInput({ type: 'password' });
  const checkbox = textInput({ type: 'checkbox' });
  const apiKey = textInput({
    id: 'providerApiKey',
    name: 'apiKey',
    placeholder: 'API key',
    getAttribute(name: string) {
      return name === 'aria-label' ? 'API key' : null;
    },
  });

  assert.equal(isEligibleGlobalNativeEditElement(password), false);
  assert.equal(isEligibleGlobalNativeEditElement(checkbox), false);
  assert.equal(isEligibleGlobalNativeEditElement(apiKey), false);
});
