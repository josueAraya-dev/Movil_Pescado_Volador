export function numeroONulo(texto: string | number | null | undefined): number | null {
  const valor = String(texto ?? '').trim();
  return valor === '' ? null : Number(valor);
}

export function textoONulo(texto: string | null | undefined): string | null {
  const valor = String(texto ?? '').trim();
  return valor === '' ? null : valor;
}

export function texto(valor: number | string | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}
