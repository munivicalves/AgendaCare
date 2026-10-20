import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { authGuard, visitanteGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { retornoSeguro } from './auth.config';
import { respostaLogin } from '../../../testing/auth-fixtures';

describe('Authentication guards', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  const guard = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  it.each([
    '/',
    '/agenda',
    '/agenda/novo',
    '/agenda/7/editar',
    '/pacientes',
    '/pacientes/novo',
    '/pacientes/7',
    '/pacientes/7/editar',
  ])('redirects guests away from %s', (path) => {
    const result = guard(path) as UrlTree;
    expect(result.toString()).toContain('/login?retorno=');
  });
  it('allows authenticated users internally and redirects them away from login', () => {
    TestBed.inject(AuthService)
      .login({ email: 'teste@example.com', senha: 'SenhaSegura!2026' })
      .subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:8080/api/auth/login')
      .flush(respostaLogin());
    expect(guard('/agenda')).toBe(true);
    expect(
      (
        TestBed.runInInjectionContext(() =>
          visitanteGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
        ) as UrlTree
      ).toString(),
    ).toBe('/');
  });
  it('allows guests into login and registration', () =>
    expect(
      TestBed.runInInjectionContext(() =>
        visitanteGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ),
    ).toBe(true));
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/login',
    '/unknown',
    '/%2f%2fevil.example',
  ])('rejects unsafe return path %s', (path) => expect(retornoSeguro(path)).toBe('/'));
});
