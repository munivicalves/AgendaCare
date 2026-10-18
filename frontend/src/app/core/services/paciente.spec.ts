import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PacienteService } from './paciente';

describe('Paciente', () => {
  let service: PacienteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PacienteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
