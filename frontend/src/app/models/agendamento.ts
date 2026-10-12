export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO' | 'FALTOU';

export interface Agendamento {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: string;
  status: StatusAgendamento;
  observacoes: string | null;
  createdAt: string;
}

export interface AgendamentoRequest {
  pacienteId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: string;
  status: StatusAgendamento | null;
  observacoes: string | null;
}
