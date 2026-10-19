import { Pipe, PipeTransform } from '@angular/core';

/** Presentation only: retain unrecognized values rather than dropping digits. */
export function formatarTelefoneBrasileiro(valor: string | null | undefined): string {
  if (!valor?.trim()) return '';
  if (!/^[+\d\s().-]+$/.test(valor)) return valor;
  let digitos = valor.replace(/\D/g, '');
  const internacional =
    (digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55');
  if (valor.trim().startsWith('+') && !internacional) return valor;
  if (internacional) digitos = digitos.slice(2);
  if (digitos.length !== 10 && digitos.length !== 11) return valor;
  const corte = digitos.length === 11 ? 7 : 6;
  return `${internacional ? '+55 ' : ''}(${digitos.slice(0, 2)}) ${digitos.slice(2, corte)}-${digitos.slice(corte)}`;
}

@Pipe({ name: 'telefoneBrasileiro' })
export class TelefoneBrasileiroPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatarTelefoneBrasileiro(valor) || 'N\u00e3o informado';
  }
}
