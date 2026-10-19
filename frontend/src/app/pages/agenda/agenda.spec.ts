import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agenda } from './agenda';
import { Agendamento } from '../../models/agendamento';

const api = 'http://localhost:8080/api/agendamentos';
const appointment = (
  status: Agendamento['status'] = 'AGENDADO',
  data = '2000-01-01',
): Agendamento => ({
  id: 7,
  pacienteId: 1,
  pacienteNome: 'Paciente Teste',
  data,
  horaInicio: '09:00',
  horaFim: '10:00',
  tipo: 'Consulta',
  status,
  observacoes: null,
  createdAt: '2000-01-01',
});

describe('Agenda functional review', () => {
  let component: Agenda;
  let fixture: ComponentFixture<Agenda>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agenda],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Agenda);
    component = fixture.componentInstance;
    await fixture.whenStable();
    http.expectOne(api + '/data/' + component.dataSelecionada).flush([]);
    http.expectOne(api).flush([]);
    await fixture.whenStable();
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  const clickText = (element: HTMLElement, text: string) =>
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === text)!
      .click();

  it('navigates months across years, selects dates and switches views', async () => {
    component.mesCalendario.set('2026-12');
    component.alterarMes(1);
    expect(component.mesCalendario()).toBe('2027-01');
    component.alterarMes(-1);
    component.selecionarDia(31);
    http.expectOne(api + '/data/2026-12-31').flush([]);
    expect(component.dataReferenciaSemana()).toBe('2026-12-31');
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.month-grid button[aria-pressed="true"]')?.textContent,
    ).toContain('31');
    clickText(fixture.nativeElement, 'Semanal');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.week-grid')).toBeTruthy();
    component.alterarSemana(1);
    expect(component.dataReferenciaSemana()).toBe('2027-01-07');
    component.alterarSemana(-1);
    component.selecionarDiaSemana('2027-01-02');
    http.expectOne(api + '/data/2027-01-02').flush([]);
    expect(component.mesCalendario()).toBe('2027-01');
    clickText(fixture.nativeElement, 'Mensal');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.month-grid')).toBeTruthy();
  });

  it('cancels obsolete date requests and retains only the latest result', () => {
    component.dataSelecionada = '2026-12-31';
    component.carregarAgendamentos();
    const old = http.expectOne(api + '/data/2026-12-31');
    component.alterarData(1);
    expect(old.cancelled).toBe(true);
    http.expectOne(api + '/data/2027-01-01').flush([appointment()]);
    expect(component.dataSelecionada).toBe('2027-01-01');
    expect(component.agendamentos()).toHaveLength(1);
    component.voltarHoje();
    http.expectOne(api + '/data/' + component.dataSelecionada).flush([]);
    expect(component.mesCalendario()).toBe(component.dataSelecionada.slice(0, 7));
  });

  it.each([
    ['AGENDADO', '2000-01-01', ['Confirmar', 'Registrar falta', 'Cancelar', 'Editar']],
    ['CONFIRMADO', '2000-01-01', ['Concluir', 'Registrar falta', 'Cancelar', 'Editar']],
    ['CONFIRMADO', '2999-01-01', ['Cancelar', 'Editar']],
    ['AGENDADO', '2999-01-01', ['Confirmar', 'Cancelar', 'Editar']],
    ['CONCLUIDO', '2000-01-01', []],
    ['CANCELADO', '2000-01-01', []],
    ['FALTOU', '2000-01-01', []],
  ] as const)('shows valid actions for %s at %s', async (status, date, expected) => {
    component.agendamentos.set([appointment(status, date)]);
    await fixture.whenStable();
    const actions = [
      ...fixture.nativeElement.querySelectorAll(
        '.appointment-actions button, .appointment-actions a',
      ),
    ].map((el: any) => el.textContent.trim());
    expect(actions).toEqual(expect.arrayContaining([...expected]));
    expect(actions).toHaveLength(expected.length);
  });

  it.each([
    ['Confirmar', 'AGENDADO', 'confirmar', 'CONFIRMADO'],
    ['Concluir', 'CONFIRMADO', 'concluir', 'CONCLUIDO'],
    ['Registrar falta', 'AGENDADO', 'falta', 'FALTOU'],
  ] as const)(
    'executes %s and updates the daily and calendar lists',
    async (text, status, endpoint, updatedStatus) => {
      const item = appointment(status);
      component.agendamentos.set([item]);
      component.agendamentosCalendario.set([item]);
      await fixture.whenStable();
      clickText(fixture.nativeElement, text);
      await fixture.whenStable();
      expect(
        [...fixture.nativeElement.querySelectorAll('.appointment-actions button')].every(
          (el: any) => el.disabled,
        ),
      ).toBe(true);
      const request = http.expectOne(api + '/7/' + endpoint);
      expect(request.request.method).toBe('PATCH');
      request.flush({ ...item, status: updatedStatus });
      await fixture.whenStable();
      expect(component.agendamentos()[0].status).toBe(updatedStatus);
      expect(component.agendamentosCalendario()[0].status).toBe(updatedStatus);
      expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
        'sucesso',
      );
    },
  );

  it.each(['confirmar', 'concluir', 'falta', 'cancelar'])(
    'displays the backend refusal for %s without changing status',
    async (endpoint) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const item = appointment(endpoint === 'concluir' ? 'CONFIRMADO' : 'AGENDADO');
      component.agendamentos.set([item]);
      if (endpoint === 'confirmar') component.confirmarAgendamento(item);
      if (endpoint === 'concluir') component.concluirAgendamento(item);
      if (endpoint === 'falta') component.registrarFalta(item);
      if (endpoint === 'cancelar') {
        component.confirmarCancelamento(item);
        component.cancelarAgendamento();
      }
      http
        .expectOne(api + '/7/' + endpoint)
        .flush(
          { mensagem: 'Operacao recusada pelo backend' },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();
      expect(component.agendamentos()[0].status).toBe(item.status);
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Operacao recusada',
      );
      expect(component.acaoEmAndamento()).toBe(false);
    },
  );

  it('requires cancellation confirmation and permits Escape before submission', async () => {
    const item = appointment();
    component.agendamentos.set([item]);
    await fixture.whenStable();
    clickText(fixture.nativeElement, 'Cancelar');
    await fixture.whenStable();
    http.expectNone((request) => request.method === 'PATCH');
    fixture.nativeElement
      .querySelector('[role="dialog"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    clickText(fixture.nativeElement, 'Cancelar');
    await fixture.whenStable();
    clickText(fixture.nativeElement, 'Sim, cancelar');
    http.expectOne(api + '/7/cancelar').flush({ ...item, status: 'CANCELADO' });
    await fixture.whenStable();
    expect(component.agendamentos()[0].status).toBe('CANCELADO');
  });

  it('preserves new appointment and edit routes', async () => {
    component.agendamentos.set([appointment()]);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('a[routerLink="/agenda/novo"]').getAttribute('href'),
    ).toBe('/agenda/novo');
    expect(fixture.nativeElement.querySelector('.appointment-actions a').getAttribute('href')).toBe(
      '/agenda/7/editar',
    );
  });

  it('distinguishes empty results from failed requests and allows retry', async () => {
    expect(fixture.nativeElement.textContent).toContain('Nenhuma consulta agendada');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.carregarAgendamentos();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando',
    );
    http
      .expectOne(api + '/data/' + component.dataSelecionada)
      .flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma consulta agendada');
    clickText(fixture.nativeElement, 'Tentar novamente');
    http.expectOne(api + '/data/' + component.dataSelecionada).flush([]);
    await fixture.whenStable();
    expect(component.falhaCarregamento()).toBe(false);
  });
});
