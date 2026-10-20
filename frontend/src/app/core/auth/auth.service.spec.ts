import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { respostaLogin } from '../../../testing/auth-fixtures';

const base = 'http://localhost:8080/api/auth';
describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  const entrar = (response = respostaLogin()) => {
    auth.login({ email: ' Teste@EXAMPLE.COM ', senha: 'SenhaSegura!2026' }).subscribe();
    const request = http.expectOne(base + '/login');
    expect(request.request.body).toEqual({ email: 'teste@example.com', senha: 'SenhaSegura!2026' });
    request.flush(response);
    return response;
  };
  it('keeps the session in memory only and clears it on logout', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const data = entrar();
    expect(auth.tokenAtual()).toBe(data.accessToken);
    expect(auth.usuario()?.id).toBe(7);
    expect(storage).not.toHaveBeenCalled();
    auth.sair();
    expect(auth.tokenAtual()).toBeNull();
    expect(auth.usuario()).toBeNull();
    expect(auth.autenticado()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
  it('posts only registration fields and does not log the new user in', () => {
    auth
      .cadastrar({
        nome: ' Pessoa Teste ',
        email: ' Teste@EXAMPLE.COM ',
        senha: 'SenhaSegura!2026',
      })
      .subscribe();
    const req = http.expectOne(base + '/register');
    expect(req.request.body).toEqual({
      nome: 'Pessoa Teste',
      email: 'teste@example.com',
      senha: 'SenhaSegura!2026',
    });
    req.flush(respostaLogin().usuario);
    expect(auth.autenticado()).toBe(false);
  });
  it('expires the session automatically', () => {
    vi.useFakeTimers();
    entrar(respostaLogin(60));
    vi.advanceTimersByTime(60001);
    expect(auth.tokenAtual()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(
      ['/login'],
      expect.objectContaining({ queryParams: expect.objectContaining({ motivo: 'expirada' }) }),
    );
  });
  it('checks expiration on use even if a background timer has not run', () => {
    vi.useFakeTimers();
    entrar(respostaLogin(60));
    vi.setSystemTime(Date.now() + 61000);
    expect(auth.tokenAtual()).toBeNull();
  });
  it('ignores an old request rejection after a new login', () => {
    const old = entrar(respostaLogin(60));
    const current = entrar(respostaLogin(900));
    auth.expirar(old.accessToken);
    expect(auth.tokenAtual()).toBe(current.accessToken);
  });
  it('does not resurrect an in-flight login after logout', () => {
    let rejected = false;
    auth
      .login({ email: 'teste@example.com', senha: 'SenhaSegura!2026' })
      .subscribe({ error: () => (rejected = true) });
    auth.sair();
    http.expectOne(base + '/login').flush(respostaLogin());
    expect(auth.autenticado()).toBe(false);
    expect(rejected).toBe(true);
  });
  it.each(['invalid', 'expired'])('rejects an %s token response', (kind) => {
    let rejected = false;
    auth
      .login({ email: 'teste@example.com', senha: 'SenhaSegura!2026' })
      .subscribe({ error: () => (rejected = true) });
    const data = respostaLogin(kind === 'expired' ? -60 : 900);
    if (kind === 'invalid') data.accessToken = 'not-a-token';
    http.expectOne(base + '/login').flush(data);
    expect(rejected).toBe(true);
    expect(auth.autenticado()).toBe(false);
  });
});
