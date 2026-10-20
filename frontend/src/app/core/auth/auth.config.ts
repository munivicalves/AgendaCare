import { InjectionToken } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8080/api',
});

export function retornoSeguro(value: string | null | undefined): string {
  if (!value || value.includes('\\') || value.startsWith('//')) return '/';
  const path = value.split(/[?#]/)[0];
  return /^(?:\/|\/agenda(?:\/novo|\/\d+\/editar)?|\/pacientes(?:\/novo|\/\d+(?:\/editar)?)?)$/.test(
    path,
  )
    ? value
    : '/';
}
