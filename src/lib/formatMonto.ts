export function formatMontoInput(value: string): string {
  const numeros = value.replace(/\D/g, '');

  if (!numeros) return '';

  const numero = parseInt(numeros, 10);

  return `$${numero.toLocaleString('es-AR')}`;
}

export function parseMontoInput(formattedValue: string): number {
  const numeros = formattedValue.replace(/\D/g, '');
  return numeros ? parseInt(numeros, 10) : 0;
}

export function getDisplayValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';

  const numValue = typeof value === 'string' ? parseMontoInput(value) : value;

  if (numValue === 0) return '';

  return `$${numValue.toLocaleString('es-AR')}`;
}
