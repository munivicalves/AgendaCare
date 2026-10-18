import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PacienteService } from '../../core/services/paciente';
import { AgendamentoService } from '../../core/services/agendamento';
import { Agendamento, StatusAgendamento } from '../../models/agendamento';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  totalPacientes = signal(0);
  agendamentos = signal<Agendamento[]>([]);

  carregando = signal(false);
  erro = signal('');

  // Data atual no formato YYYY-MM-DD
  hoje = signal(this.obterDataAtual());

  // Todas as consultas marcadas para hoje
  consultasHoje = computed(() =>
    this.agendamentos().filter((agendamento) => agendamento.data === this.hoje()),
  );

  // Consultas de hoje ainda não canceladas
  totalAtendimentosHoje = computed(
    () => this.consultasHoje().filter((agendamento) => agendamento.status !== 'CANCELADO').length,
  );

  // Próximas consultas a partir do momento atual
  proximosAtendimentos = computed(() => {
    const agora = new Date();

    return this.agendamentos()
      .filter((agendamento) => {
        if (agendamento.status !== 'AGENDADO' && agendamento.status !== 'CONFIRMADO') {
          return false;
        }

        const inicio = new Date(`${agendamento.data}T${agendamento.horaInicio}`);

        return inicio.getTime() >= agora.getTime();
      })
      .sort((a, b) => {
        const dataA = `${a.data}T${a.horaInicio}`;
        const dataB = `${b.data}T${b.horaInicio}`;

        return dataA.localeCompare(dataB);
      });
  });

  proximoAtendimento = computed(() => this.proximosAtendimentos()[0] ?? null);

  constructor(
    private pacienteService: PacienteService,
    private agendamentoService: AgendamentoService,
  ) {}

  ngOnInit(): void {
    this.carregarDashboard();
  }

  private obterDataAtual(): string {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  carregarDashboard(): void {
    this.carregando.set(true);
    this.erro.set('');
    this.hoje.set(this.obterDataAtual());

    forkJoin({
      pacientes: this.pacienteService.listar(),
      agendamentos: this.agendamentoService.listar(),
    }).subscribe({
      next: ({ pacientes, agendamentos }) => {
        this.totalPacientes.set(pacientes.length);
        this.agendamentos.set(agendamentos);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar dashboard:', erro);
        this.erro.set('Não foi possível carregar os dados do Dashboard.');
        this.carregando.set(false);
      },
    });
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  obterTextoStatus(status: StatusAgendamento): string {
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

  obterClasseStatus(status: StatusAgendamento): string {
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
