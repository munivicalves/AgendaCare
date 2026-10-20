import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

export function textoObrigatorio(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}
export function emailValido(control: AbstractControl): ValidationErrors | null {
  return Validators.email({ value: (control.value ?? '').trim() } as AbstractControl);
}
export function nomeValido(control: AbstractControl): ValidationErrors | null {
  const tamanho = (control.value ?? '').trim().length;
  return tamanho >= 2 && tamanho <= 120 ? null : { nome: true };
}
export function senhaSegura(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  return value.length >= 8 &&
    value.length <= 64 &&
    new TextEncoder().encode(value).length <= 72 &&
    /\p{Lu}/u.test(value) &&
    /\p{Ll}/u.test(value) &&
    /\p{Nd}/u.test(value) &&
    /[^\p{L}\p{N}\s]/u.test(value)
    ? null
    : { senhaSegura: true };
}
export function senhasIguais(control: AbstractControl): ValidationErrors | null {
  return control.get('senha')?.value === control.get('confirmacao')?.value
    ? null
    : { senhasDiferentes: true };
}
