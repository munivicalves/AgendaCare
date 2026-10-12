import { Component, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PacienteService } from '../../core/services/paciente';

function validarDataNascimento(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;

  // Campo vazio continua permitido
  if (!valor) {
    return null;
  }

  // Compara datas no formato YYYY-MM-DD
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  const dataAtual = `${ano}-${mes}-${dia}`;

  return valor > dataAtual ? { dataFutura: true } : null;
}

@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-form.html',
  styleUrl: './paciente-form.css',
})
export class PacienteForm implements OnInit {
  salvando = signal(false);
  carregando = signal(false);
  erro = signal('');

  modoEdicao = signal(false);

  pacienteId: number | null = null;

  form;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.nonNullable.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],

      email: ['', [Validators.email]],

      telefone: ['', [Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]],

      dataNascimento: [''],

      observacoes: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.pacienteId = Number(id);
      this.modoEdicao.set(true);

      this.carregarPaciente();
    }
  }

  carregarPaciente(): void {
    if (this.pacienteId === null) {
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    this.pacienteService.buscarPorId(this.pacienteId).subscribe({
      next: (paciente) => {
        this.form.patchValue({
          nome: paciente.nome,
          email: paciente.email ?? '',
          telefone: paciente.telefone ?? '',
          dataNascimento: paciente.dataNascimento ?? '',
          observacoes: paciente.observacoes ?? '',
        });

        this.carregando.set(false);
      },

      error: (erro) => {
        console.error('Erro ao carregar paciente:', erro);

        this.erro.set('Não foi possível carregar os dados do paciente.');

        this.carregando.set(false);
      },
    });
  }

  formatarTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;

    let valor = input.value.replace(/\D/g, '');

    valor = valor.substring(0, 11);

    if (valor.length > 0) {
      valor = `(${valor}`;
    }

    if (valor.length > 3) {
      valor = valor.substring(0, 3) + ') ' + valor.substring(3);
    }

    if (valor.length > 10) {
      valor = valor.substring(0, 10) + '-' + valor.substring(10, 14);
    } else if (valor.length > 9) {
      valor = valor.substring(0, 9) + '-' + valor.substring(9, 13);
    }

    this.form.controls.telefone.setValue(valor, {
      emitEvent: false,
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const dados = this.form.getRawValue();

    const paciente = {
      nome: dados.nome.trim(),

      email: dados.email.trim() || null,

      telefone: dados.telefone.trim() || null,

      dataNascimento: dados.dataNascimento || null,

      observacoes: dados.observacoes.trim() || null,
    };

    if (this.modoEdicao() && this.pacienteId !== null) {
      this.pacienteService.atualizar(this.pacienteId, paciente).subscribe({
        next: () => {
          this.salvando.set(false);

          this.router.navigate(['/pacientes']);
        },

        error: (erro) => {
          console.error('Erro ao atualizar paciente:', erro);

          this.erro.set('Não foi possível atualizar o paciente.');

          this.salvando.set(false);
        },
      });

      return;
    }

    this.pacienteService.criar(paciente).subscribe({
      next: () => {
        this.salvando.set(false);

        this.router.navigate(['/pacientes']);
      },

      error: (erro) => {
        console.error('Erro ao cadastrar paciente:', erro);

        this.erro.set('Não foi possível cadastrar o paciente.');

        this.salvando.set(false);
      },
    });
  }
}
