import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeCedula,
  isValidEmail,
  isValidPhone,
  sanitizePhone,
  validateOrderBy,
  validateOrderDir,
  validateNumberRange,
  sanitizeName,
  isValidISODate,
  isValidMoney,
  escapeHtml,
  sanitizeCode,
  validateRequired,
  validateMaxLength,
} from './validation';

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('removes HTML tags', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('removes control characters', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
  });

  it('handles null/undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });
});

describe('sanitizeCedula', () => {
  it('keeps only alphanumeric and hyphens', () => {
    expect(sanitizeCedula('123-456-789')).toBe('123-456-789');
    expect(sanitizeCedula('ABC123')).toBe('ABC123');
  });

  it('converts to uppercase', () => {
    expect(sanitizeCedula('abc123')).toBe('ABC123');
  });

  it('removes special characters', () => {
    expect(sanitizeCedula("123'456;DROP TABLE")).toBe('123456DROPTABLE');
  });

  it('handles null/undefined', () => {
    expect(sanitizeCedula(null)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('validates correct emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('allows empty emails (optional field)', () => {
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail(null)).toBe(true);
  });
});

describe('isValidPhone', () => {
  it('validates correct phones', () => {
    expect(isValidPhone('555-1234')).toBe(true);
    expect(isValidPhone('300 123 4567')).toBe(true);
    expect(isValidPhone('+57 300 123 4567')).toBe(true);
  });

  it('rejects invalid phones', () => {
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('123')).toBe(false); // too short
  });

  it('allows empty phones', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone(null)).toBe(true);
  });
});

describe('sanitizePhone', () => {
  it('keeps only valid phone characters', () => {
    expect(sanitizePhone('+57 300-123-4567')).toBe('+57 300-123-4567');
  });

  it('removes invalid characters', () => {
    expect(sanitizePhone('300abc123')).toBe('300123');
  });
});

describe('validateOrderBy', () => {
  const allowed = ['nombre', 'fecha', 'id'];

  it('returns valid column', () => {
    expect(validateOrderBy('nombre', allowed, 'id')).toBe('nombre');
    expect(validateOrderBy('fecha', allowed, 'id')).toBe('fecha');
  });

  it('returns default for invalid column', () => {
    expect(validateOrderBy('invalid', allowed, 'id')).toBe('id');
    expect(validateOrderBy('DROP TABLE', allowed, 'id')).toBe('id');
  });

  it('prevents SQL injection', () => {
    expect(validateOrderBy('nombre; DROP TABLE--', allowed, 'id')).toBe('id');
  });
});

describe('validateOrderDir', () => {
  it('returns ASC or DESC', () => {
    expect(validateOrderDir('ASC')).toBe('ASC');
    expect(validateOrderDir('DESC')).toBe('DESC');
    expect(validateOrderDir('asc')).toBe('ASC');
    expect(validateOrderDir('desc')).toBe('DESC');
  });

  it('defaults to ASC for invalid input', () => {
    expect(validateOrderDir('INVALID')).toBe('ASC');
    expect(validateOrderDir('')).toBe('ASC');
  });
});

describe('validateNumberRange', () => {
  it('returns value if in range', () => {
    expect(validateNumberRange(5, 1, 10, 1)).toBe(5);
  });

  it('returns default if out of range', () => {
    expect(validateNumberRange(0, 1, 10, 5)).toBe(5);
    expect(validateNumberRange(15, 1, 10, 5)).toBe(5);
  });

  it('returns default for NaN', () => {
    expect(validateNumberRange(NaN, 1, 10, 5)).toBe(5);
  });

  it('floors decimal values', () => {
    expect(validateNumberRange(5.9, 1, 10, 1)).toBe(5);
  });
});

describe('sanitizeName', () => {
  it('allows valid names', () => {
    expect(sanitizeName('Juan García')).toBe('Juan García');
    expect(sanitizeName("O'Connor")).toBe("O'Connor");
  });

  it('removes invalid characters', () => {
    expect(sanitizeName('Juan<script>')).toBe('Juanscript');
  });

  it('normalizes spaces', () => {
    expect(sanitizeName('Juan   García')).toBe('Juan García');
  });
});

describe('isValidISODate', () => {
  it('validates correct dates', () => {
    expect(isValidISODate('2024-03-15')).toBe(true);
    expect(isValidISODate('2024-12-31')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidISODate('15/03/2024')).toBe(false);
    expect(isValidISODate('2024-3-15')).toBe(false);
    expect(isValidISODate('invalid')).toBe(false);
  });

  it('allows empty dates', () => {
    expect(isValidISODate('')).toBe(true);
    expect(isValidISODate(null)).toBe(true);
  });
});

describe('isValidMoney', () => {
  it('validates positive numbers', () => {
    expect(isValidMoney(100)).toBe(true);
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(99.99)).toBe(true);
  });

  it('rejects negative numbers', () => {
    expect(isValidMoney(-100)).toBe(false);
  });

  it('allows null/undefined', () => {
    expect(isValidMoney(null)).toBe(true);
    expect(isValidMoney(undefined)).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    expect(escapeHtml("it's")).toBe('it&#039;s');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
  });
});

describe('sanitizeCode', () => {
  it('keeps alphanumeric and hyphens', () => {
    expect(sanitizeCode('ABC-123')).toBe('ABC-123');
  });

  it('converts to uppercase', () => {
    expect(sanitizeCode('abc123')).toBe('ABC123');
  });

  it('removes special characters', () => {
    expect(sanitizeCode('ABC;DROP--')).toBe('ABCDROP');
  });
});

describe('validateRequired', () => {
  it('returns error for empty values', () => {
    expect(validateRequired('', 'nombre')).toEqual({
      field: 'nombre',
      message: 'nombre es requerido',
    });
    expect(validateRequired(null, 'email')).not.toBeNull();
  });

  it('returns null for valid values', () => {
    expect(validateRequired('test', 'nombre')).toBeNull();
    expect(validateRequired(0, 'count')).toBeNull();
  });
});

describe('validateMaxLength', () => {
  it('returns error when exceeds max', () => {
    expect(validateMaxLength('abcdef', 5, 'code')).toEqual({
      field: 'code',
      message: 'code no puede exceder 5 caracteres',
    });
  });

  it('returns null when within limit', () => {
    expect(validateMaxLength('abc', 5, 'code')).toBeNull();
    expect(validateMaxLength(null, 5, 'code')).toBeNull();
  });
});
