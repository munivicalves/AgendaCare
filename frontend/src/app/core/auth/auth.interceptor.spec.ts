import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { respostaLogin } from '../../../testing/auth-fixtures';

describe('Authentication interceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.login({ email: 'teste@example.com', senha: 'SenhaSegura!2026' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush(respostaLogin());
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  it('adds Bearer only to protected API requests and prevents redirects', () => {
    client.get('http://localhost:8080/api/pacientes').subscribe();
    const req = http.expectOne('http://localhost:8080/api/pacientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + auth.tokenAtual());
    expect(req.request.redirect).toBe('error');
    req.flush([]);
  });
  it.each([
    'https://externo.example/api/pacientes',
    'http://localhost:8080.evil.example/api/pacientes',
    'http://localhost:8080/api-other',
    'http://localhost:8080/other',
    'https://localhost:8080/api/pacientes',
    'http://localhost:8080@evil.example/api/pacientes',
    '/fonts/test.woff2',
  ])('does not send the token to %s', (url) => {
    client.get(url).subscribe();
    const req = http.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
  it.each(['login', 'register'])('does not attach a token to public %s', (action) => {
    const url = 'http://localhost:8080/api/auth/' + action;
    client.post(url, {}).subscribe();
    const req = http.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
  it('clears a rejected session on a protected 401', () => {
    client.get('http://localhost:8080/api/pacientes').subscribe({ error: () => {} });
    http
      .expectOne('http://localhost:8080/api/pacientes')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.autenticado()).toBe(false);
  });
  it('does not expire a session for 400, 409 or external errors', () => {
    for (const [url, status] of [
      ['http://localhost:8080/api/pacientes', 409],
      ['https://externo.example', 401],
      ['http://localhost:8080/api/auth/login', 401],
    ] as const) {
      client.get(url).subscribe({ error: () => {} });
      http.expectOne(url).flush({}, { status, statusText: 'Error' });
      expect(auth.autenticado()).toBe(true);
    }
  });
});
