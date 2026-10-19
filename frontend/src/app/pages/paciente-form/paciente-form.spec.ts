import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacienteForm } from './paciente-form';

describe('PacienteForm', () => {
  let component: PacienteForm;
  let fixture: ComponentFixture<PacienteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [PacienteForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('associates invalid fields with their visible feedback', async () => {
    component.form.controls.nome.setValue('');
    component.form.controls.nome.markAsTouched();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const name = element.querySelector<HTMLInputElement>('#nome')!;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('nome-feedback');
    expect(element.querySelector('#nome-feedback')?.textContent?.trim().length).toBeGreaterThan(0);
  });
  it('rejects blank names and invalid email without sending a request', async () => {
    const http = TestBed.inject(HttpTestingController);
    component.form.patchValue({ nome: '   ', email: 'email-invalido' });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(component.form.controls.nome.hasError('required')).toBe(true);
    expect(component.form.controls.email.hasError('email')).toBe(true);
    expect(fixture.nativeElement.querySelector('#email').getAttribute('aria-invalid')).toBe('true');
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it.each([
    ['3432221234', '(34) 3222-1234'],
    ['34999991234', '(34) 99999-1234'],
    ['+5534999991234', '(34) 99999-1234'],
  ])('masks %s correctly in the form', async (digits, expected) => {
    const input = fixture.nativeElement.querySelector('#telefone') as HTMLInputElement;
    input.value = digits;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(input.value).toBe(expected);
    expect(component.form.controls.telefone.value).toBe(expected);
    expect(component.form.controls.telefone.valid).toBe(true);
  });

  it.each(['3432221234', '+5534999991234'])(
    'preserves stored phone %s when editing other fields',
    async (original) => {
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const http = TestBed.inject(HttpTestingController);
      component.pacienteId = 7;
      component.modoEdicao.set(true);
      component.carregarPaciente();
      http
        .expectOne('http://localhost:8080/api/pacientes/7')
        .flush({ id: 7, nome: 'Paciente Teste', telefone: original });
      component.form.controls.nome.setValue('Nome Atualizado');
      component.salvar();
      const update = http.expectOne((request) => request.method === 'PUT');
      expect(update.request.body.telefone).toBe(original);
      update.flush({});
      http.verify();
    },
  );
});
