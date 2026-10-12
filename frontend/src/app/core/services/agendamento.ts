import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Agendamento, AgendamentoRequest } from '../../models/agendamento';

@Injectable({
  providedIn: 'root',
})
export class AgendamentoService {
  private readonly apiUrl = 'http://localhost:8080/api/agendamentos';

  constructor(private http: HttpClient) {}

  listar(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(this.apiUrl);
  }

  buscarPorId(id: number): Observable<Agendamento> {
    return this.http.get<Agendamento>(`${this.apiUrl}/${id}`);
  }

  listarPorData(data: string): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.apiUrl}/data/${data}`);
  }

  listarPorPaciente(pacienteId: number): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  criar(agendamento: AgendamentoRequest): Observable<Agendamento> {
    return this.http.post<Agendamento>(this.apiUrl, agendamento);
  }

  atualizar(id: number, agendamento: AgendamentoRequest): Observable<Agendamento> {
    return this.http.put<Agendamento>(`${this.apiUrl}/${id}`, agendamento);
  }

  cancelar(id: number): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.apiUrl}/${id}/cancelar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
