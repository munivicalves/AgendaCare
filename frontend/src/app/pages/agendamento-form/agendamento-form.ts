import { Component, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AgendamentoService } from '../../core/services/agendamento';
import { PacienteService } from '../../core/services/paciente';
import { Paciente } from '../../models/paciente';
import { AgendamentoRequest, StatusAgendamento } from '../../models/agendamento';

function validarIntervaloHorarios(control: AbstractControl): ValidationErrors | null {
  const inicio = control.get('horaInicio')?.value;
  const fim = control.get('horaFim')?.value;

  if (!inicio || !fim) {
    return null;
  }

  return fim <= inicio ? { horarioInvalido: true } : null;
}

@Component({
  selector: 'app-agendamento-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './agendamento-form.html',
  styleUrl: './agendamento-form.css',
})
export class AgendamentoForm implements OnInit {
  pacientes = signal<Paciente[]>([]);
  carregandoPacientes = signal(false);
  carregandoAgendamento = signal(false);
  salvando = signal(false);
  erro = signal('');
  modoEdicao = signal(false);
  readonly edicaoCarregada = signal(false);

  agendamentoId: number | null = null;
  statusAtual: StatusAgendamento = 'AGENDADO';

  form;

  constructor(
    private fb: FormBuilder,
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.nonNullable.group(
      {
        pacienteId: [0, [Validators.required, Validators.min(1)]],
        data: ['', [Validators.required]],
        horaInicio: ['', [Validators.required]],
        horaFim: ['', [Validators.required]],
        tipo: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            (control: AbstractControl) =>
              control.value.trim().length >= 3 ? null : { minlength: true },
          ],
        ],
        observacoes: [''],
      },
      {
        validators: validarIntervaloHorarios,
      },
    );
  }

  ngOnInit(): void {
    this.carregarPacientes();

    const id = this.route.snapshot.paramMap.get('id');

    if (id !== null) {
      this.modoEdicao.set(true);
      const idNumerico = Number(id);

      if (!Number.isSafeInteger(idNumerico) || idNumerico <= 0) {
        this.erro.set('Identificador do agendamento inválido.');
        return;
      }

      this.agendamentoId = idNumerico;
      this.modoEdicao.set(true);
      this.carregarAgendamento();
    }
  }

  carregarPacientes(): void {
    this.carregandoPacientes.set(true);

    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.carregandoPacientes.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar pacientes:', erro);
        this.erro.set('Não foi possível carregar os pacientes.');
        this.carregandoPacientes.set(false);
      },
    });
  }

  carregarAgendamento(): void {
    if (this.agendamentoId === null) return;

    this.edicaoCarregada.set(false);
    this.carregandoAgendamento.set(true);
    this.erro.set('');

    this.agendamentoService.buscarPorId(this.agendamentoId).subscribe({
      next: (agendamento) => {
        this.statusAtual = agendamento.status;
        this.edicaoCarregada.set(true);

        this.form.patchValue({
          pacienteId: agendamento.pacienteId,
          data: agendamento.data,
          horaInicio: agendamento.horaInicio.slice(0, 5),
          horaFim: agendamento.horaFim.slice(0, 5),
          tipo: agendamento.tipo,
          observacoes: agendamento.observacoes ?? '',
        });

        this.carregandoAgendamento.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar agendamento:', erro);

        this.erro.set('Não foi possível carregar os dados da consulta.');
        this.carregandoAgendamento.set(false);
      },
    });
  }

  salvar(): void {
    if (
      this.form.invalid ||
      this.salvando() ||
      this.carregandoPacientes() ||
      this.carregandoAgendamento() ||
      (this.modoEdicao() && (this.agendamentoId === null || !this.edicaoCarregada()))
    ) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const dados = this.form.getRawValue();

    const agendamento: AgendamentoRequest = {
      pacienteId: Number(dados.pacienteId),
      data: dados.data,
      horaInicio: dados.horaInicio,
      horaFim: dados.horaFim,
      tipo: dados.tipo.trim(),
      status: this.modoEdicao() ? this.statusAtual : 'AGENDADO',
      observacoes: dados.observacoes.trim() || null,
    };

    if (this.modoEdicao() && this.agendamentoId !== null) {
      this.agendamentoService.atualizar(this.agendamentoId, agendamento).subscribe({
        next: () => {
          this.salvando.set(false);
          this.router.navigate(['/agenda']);
        },
        error: (erro) => {
          console.error('Erro ao atualizar agendamento:', erro);
          this.tratarErro(erro);
        },
      });

      return;
    }

    this.agendamentoService.criar(agendamento).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/agenda']);
      },
      error: (erro) => {
        console.error('Erro ao criar agendamento:', erro);
        this.tratarErro(erro);
      },
    });
  }

  private tratarErro(erro: any): void {
    if (erro.status === 409) {
      this.erro.set(erro.error?.mensagem || 'Já existe uma consulta agendada nesse horário.');
    } else if (erro.status === 400) {
      this.erro.set(erro.error?.mensagem || 'Verifique os dados informados.');
    } else if (erro.status === 404) {
      this.erro.set('Paciente ou agendamento não encontrado.');
    } else {
      this.erro.set('Não foi possível salvar a consulta. Tente novamente.');
    }

    this.salvando.set(false);
  }
}
