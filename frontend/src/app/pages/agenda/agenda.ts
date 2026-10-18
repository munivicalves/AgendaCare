import { A11yModule } from '@angular/cdk/a11y';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AgendamentoService } from '../../core/services/agendamento';
import { Agendamento, StatusAgendamento } from '../../models/agendamento';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-agenda',
  imports: [A11yModule, FormsModule, RouterLink, DatePipe],
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
  alterandoStatusId = signal<number | null>(null);

  dataSelecionada = this.obterDataAtual();

  // Calendário mensal
  agendamentosCalendario = signal<Agendamento[]>([]);
  carregandoCalendario = signal(false);
  erroCalendario = signal('');

  visualizacao = signal<'mensal' | 'semanal'>('mensal');

  // Mês exibido no calendário
  mesCalendario = signal(this.obterDataAtual().slice(0, 7));

  // Nomes dos dias da semana
  diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Gera os dias que serão exibidos no calendário
  diasCalendario = computed(() => {
    const [ano, mes] = this.mesCalendario().split('-').map(Number);

    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
    const quantidadeDias = new Date(ano, mes, 0).getDate();

    const dias: (number | null)[] = [];

    // Espaços vazios antes do primeiro dia do mês
    for (let i = 0; i < primeiroDiaSemana; i++) {
      dias.push(null);
    }

    // Dias do mês
    for (let dia = 1; dia <= quantidadeDias; dia++) {
      dias.push(dia);
    }

    return dias;
  });

  // Data de referência da semana exibida
  dataReferenciaSemana = signal(this.obterDataAtual());

  // Gera os sete dias da semana, começando no domingo
  diasSemanaCalendario = computed(() => {
    const [ano, mes, dia] = this.dataReferenciaSemana().split('-').map(Number);

    const inicio = new Date(ano, mes - 1, dia);
    inicio.setDate(inicio.getDate() - inicio.getDay());

    return Array.from({ length: 7 }, (_, indice) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + indice);

      const anoDia = data.getFullYear();
      const mesDia = String(data.getMonth() + 1).padStart(2, '0');
      const numeroDia = String(data.getDate()).padStart(2, '0');

      return {
        data: `${anoDia}-${mesDia}-${numeroDia}`,
        numero: data.getDate(),
        nome: new Intl.DateTimeFormat('pt-BR', {
          weekday: 'short',
        }).format(data),
      };
    });
  });

  // Consultas de um determinado dia da semana
  consultasDoDia(data: string): Agendamento[] {
    return this.agendamentosCalendario()
      .filter((agendamento) => agendamento.data === data)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  // Navega entre as semanas
  alterarSemana(quantidade: number): void {
    const [ano, mes, dia] = this.dataReferenciaSemana().split('-').map(Number);

    const data = new Date(ano, mes - 1, dia);
    data.setDate(data.getDate() + quantidade * 7);

    const novoAno = data.getFullYear();
    const novoMes = String(data.getMonth() + 1).padStart(2, '0');
    const novoDia = String(data.getDate()).padStart(2, '0');

    this.dataReferenciaSemana.set(`${novoAno}-${novoMes}-${novoDia}`);
  }

  // Seleciona um dia da visualização semanal
  selecionarDiaSemana(data: string): void {
    this.dataSelecionada = data;
    this.dataReferenciaSemana.set(data);
    this.mesCalendario.set(data.slice(0, 7));
    this.carregarAgendamentos();
  }

  constructor(private agendamentoService: AgendamentoService) {}

  ngOnInit(): void {
    this.carregarAgendamentos();
    this.carregarCalendario();
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
    this.dataReferenciaSemana.set(this.dataSelecionada);
    this.mesCalendario.set(this.dataSelecionada.slice(0, 7));
    this.carregarAgendamentos();
  }

  voltarHoje(): void {
    this.dataSelecionada = this.obterDataAtual();
    this.dataReferenciaSemana.set(this.dataSelecionada);
    this.mesCalendario.set(this.dataSelecionada.slice(0, 7));
    this.carregarAgendamentos();
  }

  aoSelecionarData(): void {
    if (!this.dataSelecionada) return;

    this.dataReferenciaSemana.set(this.dataSelecionada);
    this.mesCalendario.set(this.dataSelecionada.slice(0, 7));
    this.carregarAgendamentos();
  }

  carregarCalendario(): void {
    this.carregandoCalendario.set(true);
    this.erroCalendario.set('');

    this.agendamentoService.listar().subscribe({
      next: (agendamentos) => {
        this.agendamentosCalendario.set(agendamentos);
        this.carregandoCalendario.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar calendário:', erro);
        this.erroCalendario.set('Não foi possível carregar o calendário.');
        this.carregandoCalendario.set(false);
      },
    });
  }

  alterarMes(quantidade: number): void {
    const [ano, mes] = this.mesCalendario().split('-').map(Number);

    const novaData = new Date(ano, mes - 1 + quantidade, 1);

    const novoAno = novaData.getFullYear();
    const novoMes = String(novaData.getMonth() + 1).padStart(2, '0');

    this.mesCalendario.set(`${novoAno}-${novoMes}`);
  }

  obterNomeMes(): string {
    const [ano, mes] = this.mesCalendario().split('-').map(Number);

    const data = new Date(ano, mes - 1, 1);

    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(data);
  }

  formatarDataCalendario(dia: number): string {
    return `${this.mesCalendario()}-${String(dia).padStart(2, '0')}`;
  }

  selecionarDia(dia: number): void {
    this.dataSelecionada = this.formatarDataCalendario(dia);
    this.dataReferenciaSemana.set(this.dataSelecionada);

    this.carregarAgendamentos();
  }

  quantidadeConsultasDia(dia: number): number {
    const data = this.formatarDataCalendario(dia);

    return this.agendamentosCalendario().filter((agendamento) => agendamento.data === data).length;
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

        this.agendamentosCalendario.update((agendamentos) =>
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

        this.agendamentosCalendario.update((agendamentos) =>
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
  concluirAgendamento(agendamento: Agendamento): void {
    if (agendamento.status !== 'CONFIRMADO' || this.alterandoStatusId() !== null) {
      return;
    }

    this.alterandoStatusId.set(agendamento.id);
    this.erro.set('');
    this.sucesso.set('');

    this.agendamentoService.concluir(agendamento.id).subscribe({
      next: (atualizado) => {
        this.agendamentos.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );

        this.agendamentosCalendario.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );

        this.alterandoStatusId.set(null);
        this.sucesso.set(`Consulta de ${agendamento.pacienteNome} concluída com sucesso.`);
      },

      error: (erro) => {
        console.error('Erro ao concluir consulta:', erro);

        this.erro.set(erro.error?.mensagem || 'Não foi possível concluir a consulta.');

        this.alterandoStatusId.set(null);
      },
    });
  }

  registrarFalta(agendamento: Agendamento): void {
    if (
      !['AGENDADO', 'CONFIRMADO'].includes(agendamento.status) ||
      this.alterandoStatusId() !== null
    ) {
      return;
    }

    this.alterandoStatusId.set(agendamento.id);
    this.erro.set('');
    this.sucesso.set('');

    this.agendamentoService.registrarFalta(agendamento.id).subscribe({
      next: (atualizado) => {
        this.agendamentos.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );
        this.agendamentosCalendario.update((agendamentos) =>
          agendamentos.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );
        this.alterandoStatusId.set(null);
        this.sucesso.set(`Falta de ${agendamento.pacienteNome} registrada com sucesso.`);
      },

      error: (erro) => {
        console.error('Erro ao registrar falta:', erro);

        this.erro.set(erro.error?.mensagem || 'Não foi possível registrar a falta.');

        this.alterandoStatusId.set(null);
      },
    });
  }

  consultaJaTerminou(agendamento: Agendamento): boolean {
    const dataHoraFim = new Date(`${agendamento.data}T${agendamento.horaFim}`);

    return Date.now() >= dataHoraFim.getTime();
  }
}
