export interface Paciente {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  dataNascimento: string | null;
  observacoes: string | null;
  createdAt: string;
}
