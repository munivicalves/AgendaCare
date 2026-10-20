import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Login } from './login';
import { Cadastro } from './cadastro';
import { respostaLogin } from '../../../testing/auth-fixtures';
import { senhaSegura } from './auth.validators';
import { FormControl } from '@angular/forms';

describe('Login and registration screens', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  const create = async <T>(component: new (...args: any[]) => T) => {
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return fixture;
  };
  it('validates login fields before making a request', async () => {
    const fixture = await create(Login);
    fixture.componentInstance.entrar();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#login-email').getAttribute('aria-invalid')).toBe(
      'true',
    );
    http.expectNone((request) => request.method === 'POST');
  });
  it('logs in once, clears the password and navigates internally', async () => {
    const fixture = await create(Login);
    const page = fixture.componentInstance;
    page.form.setValue({ email: 'teste@example.com', senha: 'SenhaSegura!2026' });
    page.entrar();
    page.entrar();
    http.expectOne('http://localhost:8080/api/auth/login').flush(respostaLogin());
    await fixture.whenStable();
    expect(page.form.controls.senha.value).toBe('');
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
  });
  it.each([400, 401, 409, 0, 500])(
    'shows a friendly login error %s without echoing backend data',
    async (status) => {
      const fixture = await create(Login);
      const page = fixture.componentInstance;
      page.form.setValue({ email: 'teste@example.com', senha: 'SenhaSegura!2026' });
      page.entrar();
      const req = http.expectOne('http://localhost:8080/api/auth/login');
      if (status === 0) req.error(new ProgressEvent('error'));
      else req.flush({ mensagem: 'sensitive-backend-detail' }, { status, statusText: 'Error' });
      await fixture.whenStable();
      expect(page.enviando()).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
      expect(page.erro()).not.toContain('sensitive-backend-detail');
    },
  );
  it('rejects mismatched confirmation and weak passwords', async () => {
    const fixture = await create(Cadastro);
    const page = fixture.componentInstance;
    page.form.setValue({
      nome: 'Pessoa Teste',
      email: 'teste@example.com',
      senha: 'curta',
      confirmacao: 'diferente',
    });
    page.cadastrar();
    await fixture.whenStable();
    expect(page.form.hasError('senhasDiferentes')).toBe(true);
    expect(page.form.controls.senha.invalid).toBe(true);
    http.expectNone((request) => request.method === 'POST');
  });
  it('registers without sending confirmation and routes to login', async () => {
    const fixture = await create(Cadastro);
    const page = fixture.componentInstance;
    page.form.setValue({
      nome: 'Pessoa Teste',
      email: 'teste@example.com',
      senha: 'Ab1!cdef',
      confirmacao: 'Ab1!cdef',
    });
    page.cadastrar();
    page.cadastrar();
    const req = http.expectOne('http://localhost:8080/api/auth/register');
    expect(Object.keys(req.request.body).sort()).toEqual(['email', 'nome', 'senha']);
    req.flush(respostaLogin().usuario);
    await fixture.whenStable();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { cadastro: 'sucesso' },
      replaceUrl: true,
    });
    expect(page.form.controls.senha.value).toBe('');
  });
  it('shows the duplicate email error on registration', async () => {
    const fixture = await create(Cadastro);
    const page = fixture.componentInstance;
    page.form.setValue({
      nome: 'Pessoa Teste',
      email: 'teste@example.com',
      senha: 'SenhaSegura!2026',
      confirmacao: 'SenhaSegura!2026',
    });
    page.cadastrar();
    http
      .expectOne('http://localhost:8080/api/auth/register')
      .flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(page.erro()).toContain('cadastrado');
    expect(page.enviando()).toBe(false);
  });
  it.each([
    'SemSimbolo1234',
    'SomenteLetras!',
    'Ab1!cde',
    'Ab1!' + 'a'.repeat(61),
    'Ab1!' + '\u00e9'.repeat(35),
  ])('matches the backend password requirements for %s', (value) =>
    expect(senhaSegura(new FormControl(value))).not.toBeNull(),
  );
  it.each(['Ab1!cdef', 'Ab1!' + 'a'.repeat(60), 'Ab1!' + '\u00e9'.repeat(34)])(
    'accepts valid passwords at character and UTF-8 byte boundaries',
    (value) => expect(senhaSegura(new FormControl(value))).toBeNull(),
  );
  it('does not submit a seven-character password with all required character types', async () => {
    const fixture = await create(Cadastro);
    const page = fixture.componentInstance;
    page.form.setValue({
      nome: 'Pessoa Teste',
      email: 'teste@example.com',
      senha: 'Ab1!cde',
      confirmacao: 'Ab1!cde',
    });
    page.cadastrar();
    expect(page.form.controls.senha.hasError('senhaSegura')).toBe(true);
    http.expectNone((request) => request.method === 'POST');
  });
});
