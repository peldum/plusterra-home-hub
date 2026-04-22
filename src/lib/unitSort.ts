const collator = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
  ignorePunctuation: true,
});

export const compareUnitCodes = (a: string | null | undefined, b: string | null | undefined) => {
  const left = (a || '').trim();
  const right = (b || '').trim();
  return collator.compare(left, right);
};

export const sortByUnitCode = <T extends { unit_code?: string | null }>(items: T[]) =>
  [...items].sort((a, b) => compareUnitCodes(a.unit_code, b.unit_code));