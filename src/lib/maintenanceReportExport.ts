// CSV export for maintenance tickets (filtered)

export interface MaintenanceCSVRow {
  realizado: string;
  programado: string;
  creado: string;
  propietario: string;
  propiedad: string;
  descripcion: string;
  proveedor: string;
  prioridad: string;
  estado: string;
  costo_estimado: number | null;
  costo_real: number | null;
  moneda: string;
}

const escapeCSV = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function exportMaintenanceCSV(rows: MaintenanceCSVRow[], filename = 'mantenimientos.csv') {
  const headers = [
    'Fecha realizada', 'Fecha programada', 'Fecha creación',
    'Propietario', 'Propiedad', 'Descripción', 'Proveedor',
    'Prioridad', 'Estado', 'Costo estimado', 'Costo real', 'Moneda',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      escapeCSV(r.realizado),
      escapeCSV(r.programado),
      escapeCSV(r.creado),
      escapeCSV(r.propietario),
      escapeCSV(r.propiedad),
      escapeCSV(r.descripcion),
      escapeCSV(r.proveedor),
      escapeCSV(r.prioridad),
      escapeCSV(r.estado),
      escapeCSV(r.costo_estimado ?? ''),
      escapeCSV(r.costo_real ?? ''),
      escapeCSV(r.moneda),
    ].join(','));
  }
  // BOM for Excel UTF-8
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
