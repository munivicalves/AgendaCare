import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PacienteService } from '../../core/services/paciente';
import { Paciente } from '../../models/paciente';

@Component({
  selector: 'app-pacientes',
  imports: [A11yModule, FormsModule, RouterLink],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes implements OnInit {
  pacientes = signal<Paciente[]>([]);
  carregando = signal(true);
  erro = signal('');
  sucesso = signal('');

  termoBusca = '';

  // Controle do modal de exclusão
  pacienteParaExcluir = signal<Paciente | null>(null);
  excluindo = signal(false);

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

  buscar(): void {
    const nome = this.termoBusca.trim();

    if (!nome) {
      this.carregarPacientes();
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    this.pacienteService.buscarPorNome(nome).subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.carregando.set(false);
      },

      error: (erro) => {
        console.error('Erro ao buscar pacientes:', erro);
        this.erro.set('Não foi possível realizar a busca.');
        this.carregando.set(false);
      },
    });
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.carregarPacientes();
  }

  // Abre o modal
  confirmarExclusao(paciente: Paciente): void {
    this.erro.set('');
    this.sucesso.set('');
    this.pacienteParaExcluir.set(paciente);
  }

  // Fecha o modal
  cancelarExclusao(): void {
    if (this.excluindo()) {
      return;
    }

    this.pacienteParaExcluir.set(null);
  }

  // Exclui o paciente no backend
  excluirPaciente(): void {
    const paciente = this.pacienteParaExcluir();

    if (!paciente || this.excluindo()) {
      return;
    }

    this.excluindo.set(true);
    this.erro.set('');
    this.sucesso.set('');

    this.pacienteService.excluir(paciente.id).subscribe({
      next: () => {
        // Atualiza a tabela sem recarregar a página
        this.pacientes.update((pacientes) => pacientes.filter((p) => p.id !== paciente.id));

        this.pacienteParaExcluir.set(null);
        this.excluindo.set(false);

        this.sucesso.set(`Paciente ${paciente.nome} excluído com sucesso.`);
      },

      error: (erro) => {
        console.error('Erro ao excluir paciente:', erro);

        if (erro.status === 409) {
          this.erro.set('Este paciente possui agendamentos vinculados e não pode ser excluído.');
        } else {
          this.erro.set('Não foi possível excluir o paciente. Tente novamente.');
        }

        this.pacienteParaExcluir.set(null);
        this.excluindo.set(false);
      },
    });
  }
}
