const collator = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
  ignorePunctuation: true,
});

export const compareUnitCodes = (a: string | null | undefined, b: string | null | undefined) => {
  const left = (a || '').trim();
  const right = (b || '').trim();

  const leftIsGroundFloor = /^(planta\s*baja|pb)\b/i.test(left);
  const rightIsGroundFloor = /^(planta\s*baja|pb)\b/i.test(right);

  if (leftIsGroundFloor !== rightIsGroundFloor) {
    return leftIsGroundFloor ? -1 : 1;
  }

  return collator.compare(left, right);
};

export const sortByUnitCode = <T extends { unit_code?: string | null }>(items: T[]) =>
  [...items].sort((a, b) => compareUnitCodes(a.unit_code, b.unit_code));