import { useEffect } from 'react';

// Allowlist of Unicode ranges covering European scripts and common symbols.
// Any character outside these ranges will be blocked from input.
//
// To permit additional scripts, add their Unicode range to ALLOWED_RE.
const ALLOWED_RANGE = /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{M}\p{N}\p{Zs}\p{P}\p{Sc}]*$/u;
// Ranges covered:
//   U+0000–U+024F  Basic Latin, Latin-1 Supplement, Latin Extended-A & -B
//   U+0250–U+02FF  IPA Extensions, Spacing Modifier Letters
//   U+0300–U+036F  Combining Diacritical Marks
//   U+0370–U+03FF  Greek and Coptic
//   U+0400–U+052F  Cyrillic + Cyrillic Supplement
//   U+1E00–U+1EFF  Latin Extended Additional
//   U+2000–U+206F  General Punctuation
//   U+20A0–U+20CF  Currency Symbols
//   U+FB00–U+FB06  Latin Ligatures (fi, fl, etc.)

export function useLanguageFilter(): void {
  useEffect(() => {
    const handleBeforeInput = (event: InputEvent): void => {
      if (event.data && !ALLOWED_RANGE.test(event.data)) {
        event.preventDefault();
      }
    };

    // IME-composed characters (CJK, Arabic via IME, etc.) bypass beforeinput.
    // Catch them at compositionend and strip from the input value.
    const handleCompositionEnd = (event: CompositionEvent): void => {
      if (!event.data || ALLOWED_RANGE.test(event.data)) return;
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (target && 'value' in target && target.value.endsWith(event.data)) {
        target.value = target.value.slice(0, -event.data.length);
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    document.addEventListener('beforeinput', handleBeforeInput);
    document.addEventListener('compositionend', handleCompositionEnd);
    return () => {
      document.removeEventListener('beforeinput', handleBeforeInput);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, []);
}
