import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AgendamentoService } from '../../core/services/agendamento';
import { Agendamento, StatusAgendamento } from '../../models/agendamento';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-agenda',
  imports: [FormsModule, RouterLink],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda implements OnInit {
  agendamentos = signal<Agendamento[]>([]);
  carregando = signal(false);
  erro = signal('');

  dataSelecionada = this.obterDataAtual();

  constructor(private agendamentoService: AgendamentoService) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  private obterDataAtual(): string {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  carregarAgendamentos(): void {
    this.carregando.set(true);
    this.erro.set('');

    this.agendamentoService.listarPorData(this.dataSelecionada).subscribe({
      next: (agendamentos) => {
        this.agendamentos.set(agendamentos);
        this.carregando.set(false);
      },

      error: (erro) => {
        console.error('Erro ao carregar agendamentos:', erro);

        this.erro.set('Não foi possível carregar os agendamentos.');
        this.carregando.set(false);
      },
    });
  }

  alterarData(dias: number): void {
    const [ano, mes, dia] = this.dataSelecionada.split('-').map(Number);

    const data = new Date(ano, mes - 1, dia);
    data.setDate(data.getDate() + dias);

    const novoAno = data.getFullYear();
    const novoMes = String(data.getMonth() + 1).padStart(2, '0');
    const novoDia = String(data.getDate()).padStart(2, '0');

    this.dataSelecionada = `${novoAno}-${novoMes}-${novoDia}`;

    this.carregarAgendamentos();
  }

  voltarHoje(): void {
    this.dataSelecionada = this.obterDataAtual();
    this.carregarAgendamentos();
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
}
