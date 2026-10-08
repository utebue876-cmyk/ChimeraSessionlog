import { render } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, test } from 'vitest';
import { useLanguageFilter } from './useLanguageFilter';

function TestComponent(): JSX.Element {
  useLanguageFilter();
  return <input aria-label="lang-input" />;
}

describe('useLanguageFilter', () => {
  test('prevents beforeinput for disallowed characters', () => {
    render(<TestComponent />);

    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: '你',
      inputType: 'insertText',
    });

    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  test('allows beforeinput for allowed characters', () => {
    render(<TestComponent />);

    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: 'A',
      inputType: 'insertText',
    });

    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  test('removes disallowed IME text on compositionend and emits input event', () => {
    const { getByLabelText } = render(<TestComponent />);
    const input = getByLabelText('lang-input') as HTMLInputElement;
    input.value = 'abc你';
    const inputSpy = document.createElement('div');
    let fired = false;
    input.addEventListener('input', () => {
      fired = true;
    });

    const event = new CompositionEvent('compositionend', {
      bubbles: true,
      cancelable: true,
      data: '你',
    });

    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(input.value).toBe('abc');
    expect(fired).toBe(true);
    expect(inputSpy).toBeDefined();
  });
});
