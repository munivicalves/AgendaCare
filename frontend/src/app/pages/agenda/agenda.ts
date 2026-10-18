import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AgendamentoService } from '../../core/services/agendamento';
import { Agendamento, StatusAgendamento } from '../../models/agendamento';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-agenda',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class Agenda implements OnInit {
  agendamentos = signal<Agendamento[]>([]);
  carregando = signal(false);
  erro = signal('');
  agendamentoParaCancelar = signal<Agendamento | null>(null);
  cancelando = signal(false);
  sucesso = signal('');
  confirmandoId = signal<number | null>(null);

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

  confirmarCancelamento(agendamento: Agendamento): void {
    this.erro.set('');
    this.sucesso.set('');
    this.agendamentoParaCancelar.set(agendamento);
  }

  fecharModalCancelamento(): void {
    if (this.cancelando()) return;

    this.agendamentoParaCancelar.set(null);
  }

  cancelarAgendamento(): void {
    const agendamento = this.agendamentoParaCancelar();

    if (!agendamento || this.cancelando()) return;

    this.cancelando.set(true);
    this.erro.set('');
    this.sucesso.set('');

    this.agendamentoService.cancelar(agendamento.id).subscribe({
      next: (atualizado) => {
        this.agendamentos.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );

        this.agendamentoParaCancelar.set(null);
        this.cancelando.set(false);

        this.sucesso.set(`Consulta de ${agendamento.pacienteNome} cancelada com sucesso.`);
      },

      error: (erro) => {
        console.error('Erro ao cancelar agendamento:', erro);

        this.erro.set(
          erro.error?.mensagem || 'Não foi possível cancelar a consulta. Tente novamente.',
        );

        this.agendamentoParaCancelar.set(null);
        this.cancelando.set(false);
      },
    });
  }

  confirmarAgendamento(agendamento: Agendamento): void {
    if (agendamento.status !== 'AGENDADO' || this.confirmandoId() !== null) {
      return;
    }

    this.confirmandoId.set(agendamento.id);
    this.erro.set('');
    this.sucesso.set('');

    this.agendamentoService.confirmar(agendamento.id).subscribe({
      next: (atualizado) => {
        this.agendamentos.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );

        this.confirmandoId.set(null);

        this.sucesso.set(`Consulta de ${agendamento.pacienteNome} confirmada com sucesso.`);
      },

      error: (erro) => {
        console.error('Erro ao confirmar agendamento:', erro);

        this.erro.set(
          erro.error?.mensagem || 'Não foi possível confirmar a consulta. Tente novamente.',
        );

        this.confirmandoId.set(null);
      },
    });
  }
}
