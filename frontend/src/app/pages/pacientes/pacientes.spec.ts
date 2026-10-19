import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pacientes } from './pacientes';
import { Paciente } from '../../models/paciente';

describe('Pacientes', () => {
  let component: Pacientes;
  let fixture: ComponentFixture<Pacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [Pacientes],
    }).compileComponents();

    fixture = TestBed.createComponent(Pacientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('preserves search, patient actions and deletion confirmation', async () => {
    const http = TestBed.inject(HttpTestingController);
    const patient: Paciente = {
      id: 7,
      nome: 'Paciente Teste',
      email: null,
      telefone: null,
      dataNascimento: null,
      observacoes: null,
      createdAt: '2026-01-01',
    };
    http.expectOne('http://localhost:8080/api/pacientes').flush([patient]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#busca-paciente')!;
    input.value = 'Teste';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    http
      .expectOne(
        (request) => request.url.endsWith('/buscar') && request.params.get('nome') === 'Teste',
      )
      .flush([patient]);
    await fixture.whenStable();
    expect(element.querySelector('.history-action')?.getAttribute('href')).toBe('/pacientes/7');
    expect(element.querySelector('.patient-avatar')?.textContent).toBe('P');
    element.querySelector<HTMLButtonElement>('.delete-action')!.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain(patient.nome);
    http.expectNone((request) => request.method === 'DELETE');
    element
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    http.verify();
  });

  it('shows the empty state after loading an empty list', async () => {
    const http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando',
    );
    http.expectOne('http://localhost:8080/api/pacientes').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.list-state h3')?.textContent).toContain(
      'Nenhum paciente encontrado',
    );
    expect(fixture.nativeElement.querySelector('.empty-action')?.getAttribute('href')).toBe(
      '/pacientes/novo',
    );
    http.verify();
  });
  it.each([409, 500])(
    'preserves the list and reports backend deletion error %s',
    async (status) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const http = TestBed.inject(HttpTestingController);
      const patient: Paciente = {
        id: 7,
        nome: 'Paciente Teste',
        telefone: '3432221234',
        email: null,
        dataNascimento: null,
        observacoes: null,
        createdAt: '2026-01-01',
      };
      http.expectOne('http://localhost:8080/api/pacientes').flush([patient]);
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('(34) 3222-1234');
      fixture.nativeElement.querySelector('.delete-action').click();
      await fixture.whenStable();
      const confirm = fixture.nativeElement.querySelector('[role="dialog"] .bg-red-600');
      confirm.click();
      http
        .expectOne((request) => request.method === 'DELETE' && request.url.endsWith('/7'))
        .flush({}, { status, statusText: 'Error' });
      await fixture.whenStable();
      expect(component.pacientes()).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        status === 409 ? 'agendamentos vinculados' : 'Tente novamente',
      );
      expect(component.excluindo()).toBe(false);
      http.verify();
      vi.restoreAllMocks();
    },
  );

  it('deletes only after confirmation and removes the successful row', async () => {
    const http = TestBed.inject(HttpTestingController);
    const patient: Paciente = {
      id: 7,
      nome: 'Paciente Teste',
      telefone: null,
      email: null,
      dataNascimento: null,
      observacoes: null,
      createdAt: '2026-01-01',
    };
    http.expectOne('http://localhost:8080/api/pacientes').flush([patient]);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.delete-action').click();
    await fixture.whenStable();
    http.expectNone((request) => request.method === 'DELETE');
    fixture.nativeElement.querySelector('[role="dialog"] .bg-red-600').click();
    http.expectOne((request) => request.method === 'DELETE').flush(null);
    await fixture.whenStable();
    expect(component.pacientes()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('exclu');
    http.verify();
  });

  it('routes the edit button to the selected patient', async () => {
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('http://localhost:8080/api/pacientes')
      .flush([{ id: 7, nome: 'Paciente Teste' }]);
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.nativeElement.querySelector('.edit-action').click();
    expect(navigate.mock.calls[0][0].toString()).toBe('/pacientes/7/editar');
    http.verify();
  });

  it('clears the search and reloads the full list', async () => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8080/api/pacientes').flush([]);
    component.termoBusca = 'Teste';
    await fixture.whenStable();
    const clear = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: any) => button.textContent.trim() === 'Limpar',
    ) as HTMLButtonElement;
    clear.click();
    http.expectOne('http://localhost:8080/api/pacientes').flush([]);
    await fixture.whenStable();
    expect(component.termoBusca).toBe('');
    http.verify();
  });
});
