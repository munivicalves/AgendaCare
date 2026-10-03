import { Component, OnInit, signal } from '@angular/core';
import { PacienteService } from '../../core/services/paciente';
import { Paciente } from '../../models/paciente';

@Component({
  selector: 'app-pacientes',
  imports: [],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes implements OnInit {
  pacientes = signal<Paciente[]>([]);
  carregando = signal(true);
  erro = signal('');

  constructor(private pacienteService: PacienteService) {}

  ngOnInit(): void {
    this.carregarPacientes();
  }

  carregarPacientes(): void {
    this.carregando.set(true);
    this.erro.set('');

    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.carregando.set(false);
      },

      error: (erro) => {
        console.error('Erro ao carregar pacientes:', erro);

        this.erro.set('Não foi possível carregar os pacientes.');

        this.carregando.set(false);
      },
    });
  }
}
