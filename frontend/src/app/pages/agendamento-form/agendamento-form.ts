import { Component, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AgendamentoService } from '../../core/services/agendamento';
import { PacienteService } from '../../core/services/paciente';
import { Paciente } from '../../models/paciente';
import { AgendamentoRequest } from '../../models/agendamento';

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
  salvando = signal(false);
  erro = signal('');

  form;

  constructor(
    private fb: FormBuilder,
    private agendamentoService: AgendamentoService,
    private pacienteService: PacienteService,
    private router: Router,
  ) {
    this.form = this.fb.nonNullable.group(
      {
        pacienteId: [0, [Validators.required, Validators.min(1)]],
        data: ['', [Validators.required]],
        horaInicio: ['', [Validators.required]],
        horaFim: ['', [Validators.required]],
        tipo: ['', [Validators.required, Validators.minLength(3)]],
        observacoes: [''],
      },
      {
        validators: validarIntervaloHorarios,
      },
    );
  }

  ngOnInit(): void {
    this.carregarPacientes();
  }

  carregarPacientes(): void {
    this.carregandoPacientes.set(true);
    this.erro.set('');

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

  salvar(): void {
    if (this.form.invalid || this.salvando()) {
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
      status: 'AGENDADO',
      observacoes: dados.observacoes.trim() || null,
    };

    this.agendamentoService.criar(agendamento).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/agenda']);
      },
      error: (erro) => {
        console.error('Erro ao criar agendamento:', erro);

        if (erro.status === 409) {
          this.erro.set(erro.error?.mensagem || 'Já existe uma consulta agendada nesse horário.');
        } else if (erro.status === 400) {
          this.erro.set(erro.error?.mensagem || 'Verifique os dados informados.');
        } else if (erro.status === 404) {
          this.erro.set('O paciente selecionado não foi encontrado.');
        } else {
          this.erro.set('Não foi possível cadastrar a consulta. Tente novamente.');
        }

        this.salvando.set(false);
      },
    });
  }
}
