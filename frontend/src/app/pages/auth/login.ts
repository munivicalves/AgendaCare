import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthFrame } from './auth-frame';
import { AuthService } from '../../core/auth/auth.service';
import { mensagemAuth } from '../../core/auth/auth.errors';
import { retornoSeguro } from '../../core/auth/auth.config';
import { emailValido, textoObrigatorio } from './auth.validators';

@Component({
  selector: 'app-login',
  imports: [AuthFrame, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './auth-form.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly enviando = signal(false);
  readonly erro = signal('');
  readonly mostrarSenha = signal(false);
  readonly expirou = this.route.snapshot.queryParamMap.get('motivo') === 'expirada';
  readonly cadastrado = this.route.snapshot.queryParamMap.get('cadastro') === 'sucesso';
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [textoObrigatorio, emailValido, Validators.maxLength(254)]],
    senha: ['', [Validators.required, Validators.maxLength(128)]],
  });
  entrar(): void {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.erro.set('');
    this.auth
      .login(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          this.form.controls.senha.reset();
          void this.router.navigateByUrl(
            retornoSeguro(this.route.snapshot.queryParamMap.get('retorno')),
            { replaceUrl: true },
          );
        },
        error: (error) => {
          this.erro.set(mensagemAuth(error));
          this.form.controls.senha.reset();
        },
      });
  }
}
