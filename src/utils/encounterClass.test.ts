import { describe, expect, test } from 'vitest';
import { encounterClass } from './encounterClass';

describe('encounterClass', () => {
  test('exports the expected short-stay encounter class coding', () => {
    expect(encounterClass).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'SS',
      display: 'short stay',
    });
  });
});
