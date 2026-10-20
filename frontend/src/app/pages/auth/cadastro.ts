import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthFrame } from './auth-frame';
import { AuthService } from '../../core/auth/auth.service';
import { mensagemAuth } from '../../core/auth/auth.errors';
import {
  emailValido,
  textoObrigatorio,
  nomeValido,
  senhaSegura,
  senhasIguais,
} from './auth.validators';

@Component({
  selector: 'app-cadastro',
  imports: [AuthFrame, ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './auth-form.css',
})
export class Cadastro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly enviando = signal(false);
  readonly erro = signal('');
  readonly mostrarSenha = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      nome: ['', [textoObrigatorio, nomeValido]],
      email: ['', [textoObrigatorio, emailValido, Validators.maxLength(254)]],
      senha: ['', [senhaSegura]],
      confirmacao: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );
  cadastrar(): void {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.erro.set('');
    const { nome, email, senha } = this.form.getRawValue();
    this.auth
      .cadastrar({ nome, email, senha })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          this.form.controls.senha.reset();
          this.form.controls.confirmacao.reset();
          void this.router.navigate(['/login'], {
            queryParams: { cadastro: 'sucesso' },
            replaceUrl: true,
          });
        },
        error: (error) => {
          this.erro.set(mensagemAuth(error, true));
        },
      });
  }
}
