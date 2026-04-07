const UNITS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TENS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  let result = '';
  const h = Math.floor(n / 100);
  const remainder = n % 100;

  if (h > 0) {
    result += HUNDREDS[h];
    if (remainder > 0) result += ' ';
  }

  if (remainder >= 10 && remainder <= 19) {
    result += TEENS[remainder - 10];
  } else if (remainder >= 21 && remainder <= 29) {
    result += 'veinti' + UNITS[remainder - 20];
  } else {
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;
    if (t > 0) {
      result += TENS[t];
      if (u > 0) result += ' y ' + UNITS[u];
    } else if (u > 0) {
      result += UNITS[u];
    }
  }

  return result;
}

export function numberToWordsGuaranies(n: number): string {
  if (n === 0) return 'cero guaraníes';
  if (n < 0) return 'menos ' + numberToWordsGuaranies(-n);

  n = Math.floor(n);

  const parts: string[] = [];

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const units = n % 1_000;

  if (millions > 0) {
    if (millions === 1) {
      parts.push('un millón');
    } else {
      parts.push(convertGroup(millions) + ' millones');
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mil');
    } else {
      parts.push(convertGroup(thousands) + ' mil');
    }
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1) + ' guaraníes';
}
