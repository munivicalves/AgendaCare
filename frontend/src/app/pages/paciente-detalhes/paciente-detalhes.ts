import { TelefoneBrasileiroPipe } from '../../shared/pipes/telefone-brasileiro';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PacienteService } from '../../core/services/paciente';
import { AgendamentoService } from '../../core/services/agendamento';

import { Paciente } from '../../models/paciente';
import { Agendamento } from '../../models/agendamento';

@Component({
  selector: 'app-paciente-detalhes',
  imports: [TelefoneBrasileiroPipe, RouterLink],
  templateUrl: './paciente-detalhes.html',
  styleUrl: './paciente-detalhes.css',
})
export class PacienteDetalhes implements OnInit {
  paciente = signal<Paciente | null>(null);
  agendamentos = signal<Agendamento[]>([]);

  carregando = signal(false);
  erro = signal('');

  constructor(
    private route: ActivatedRoute,
    private pacienteService: PacienteService,
    private agendamentoService: AgendamentoService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.erro.set('Identificador do paciente inválido.');
      return;
    }

    this.carregarHistorico(id);
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  carregarHistorico(pacienteId: number): void {
    this.carregando.set(true);
    this.erro.set('');

    forkJoin({
      paciente: this.pacienteService.buscarPorId(pacienteId),
      agendamentos: this.agendamentoService.listarPorPaciente(pacienteId),
    }).subscribe({
      next: ({ paciente, agendamentos }) => {
        this.paciente.set(paciente);
        this.agendamentos.set(agendamentos);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar histórico:', erro);

        this.erro.set(
          erro.status === 404
            ? 'Paciente não encontrado.'
            : 'Não foi possível carregar o histórico do paciente.',
        );

        this.carregando.set(false);
      },
    });
  }

  obterTextoStatus(status: Agendamento['status']): string {
    switch (status) {
      case 'CONFIRMADO':
        return 'Confirmado';
      case 'CONCLUIDO':
        return 'Concluído';
      case 'CANCELADO':
        return 'Cancelado';
      case 'FALTOU':
        return 'Faltou';
      default:
        return 'Agendado';
    }
  }

  obterClasseStatus(status: Agendamento['status']): string {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-green-100 text-green-700';
      case 'CONCLUIDO':
        return 'bg-blue-100 text-blue-700';
      case 'CANCELADO':
        return 'bg-red-100 text-red-700';
      case 'FALTOU':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
