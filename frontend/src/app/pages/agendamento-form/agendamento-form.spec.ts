import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgendamentoForm } from './agendamento-form';

const api = 'http://localhost:8080/api/agendamentos';
describe('Appointment form functional review', () => {
  let fixture: ComponentFixture<AgendamentoForm>;
  let component: AgendamentoForm;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendamentoForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AgendamentoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
    http
      .expectOne('http://localhost:8080/api/pacientes')
      .flush([{ id: 1, nome: 'Paciente Teste' }]);
    await fixture.whenStable();
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  const valid = {
    pacienteId: 1,
    data: '2027-01-01',
    horaInicio: '09:00',
    horaFim: '10:00',
    tipo: 'Consulta',
    observacoes: '',
  };
  it('rejects missing fields with accessible feedback', async () => {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    for (const id of ['pacienteId', 'data', 'horaInicio', 'horaFim', 'tipo'])
      expect(fixture.nativeElement.querySelector('#' + id).getAttribute('aria-invalid')).toBe(
        'true',
      );
    http.expectNone((request) => request.method === 'POST');
  });
  it.each(['09:00', '08:00'])('rejects ending time %s before or equal to start', async (fim) => {
    component.form.patchValue({ ...valid, horaFim: fim });
    component.salvar();
    await fixture.whenStable();
    expect(component.form.hasError('horarioInvalido')).toBe(true);
    expect(fixture.nativeElement.querySelector('#intervalo-feedback')).toBeTruthy();
    http.expectNone((request) => request.method === 'POST');
  });
  it.each(['', 'ab', '   '])('rejects invalid appointment type %s', (tipo) => {
    component.form.patchValue({ ...valid, tipo });
    component.salvar();
    expect(component.form.controls.tipo.invalid).toBe(true);
    http.expectNone((request) => request.method === 'POST');
  });
  it('creates one appointment with the existing payload and blocks double submission', () => {
    component.form.patchValue(valid);
    component.salvar();
    component.salvar();
    const request = http.expectOne(api);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...valid, status: 'AGENDADO', observacoes: null });
    request.flush({ id: 7 });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/agenda']);
  });
  it('preserves CONFIRMADO when editing', () => {
    component.modoEdicao.set(true);
    component.agendamentoId = 7;
    component.carregarAgendamento();
    http.expectOne(api + '/7').flush({ ...valid, id: 7, status: 'CONFIRMADO' });
    component.salvar();
    const request = http.expectOne(api + '/7');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.status).toBe('CONFIRMADO');
    request.flush({ id: 7 });
  });
  it('blocks saving an edit when the existing appointment could not be loaded', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.modoEdicao.set(true);
    component.agendamentoId = 7;
    component.carregarAgendamento();
    http.expectOne(api + '/7').flush({}, { status: 404, statusText: 'Not Found' });
    component.form.patchValue(valid);
    component.salvar();
    http.expectNone((request) => request.method === 'PUT');
    expect(component.edicaoCarregada()).toBe(false);
  });
  it.each([400, 409, 404, 500])('handles backend error %s without losing input', async (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.form.patchValue(valid);
    component.salvar();
    http
      .expectOne(api)
      .flush({ mensagem: 'Mensagem de validacao do backend' }, { status, statusText: 'Error' });
    await fixture.whenStable();
    expect(component.salvando()).toBe(false);
    expect(component.form.controls.tipo.value).toBe('Consulta');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    if (status === 400 || status === 409)
      expect(component.erro()).toContain('Mensagem de validacao');
  });
});
