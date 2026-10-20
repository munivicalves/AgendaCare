import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_BASE_URL, retornoSeguro } from './auth.config';
import { LoginRequest, LoginResponse, RegisterRequest, UsuarioAutenticado } from './auth.models';

interface Sessao {
  token: string;
  expiraEm: number;
  usuario: UsuarioAutenticado;
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(API_BASE_URL);
  private readonly sessao = signal<Sessao | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  private geracao = 0;
  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly autenticado = computed(() => this.sessao() !== null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  cadastrar(dados: RegisterRequest) {
    return this.http.post<UsuarioAutenticado>(`${this.api}/auth/register`, {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      senha: dados.senha,
    });
  }

  login(dados: LoginRequest) {
    const tentativa = ++this.geracao;
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, {
        email: dados.email.trim().toLowerCase(),
        senha: dados.senha,
      })
      .pipe(
        tap((resposta) => {
          if (tentativa !== this.geracao) throw new Error('Tentativa de login encerrada.');
          const expiraEm = this.expiracao(resposta.accessToken);
          if (
            resposta.tokenType !== 'Bearer' ||
            !expiraEm ||
            expiraEm <= Date.now() ||
            !resposta.usuario?.id ||
            !Number.isFinite(resposta.expiresIn) ||
            resposta.expiresIn <= 0
          ) {
            throw new Error('Resposta de autenticacao invalida.');
          }
          clearTimeout(this.timer);
          const limite = Math.min(expiraEm, Date.now() + resposta.expiresIn * 1000);
          this.sessao.set({
            token: resposta.accessToken,
            expiraEm: limite,
            usuario: resposta.usuario,
          });
          this.agendarExpiracao();
        }),
      );
  }

  tokenAtual(): string | null {
    const sessao = this.sessao();
    if (sessao && sessao.expiraEm <= Date.now()) {
      this.expirar();
      return null;
    }
    return sessao?.token ?? null;
  }

  sair(): void {
    this.limpar();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  expirar(tokenRejeitado?: string): void {
    if (!this.sessao() || (tokenRejeitado && this.sessao()?.token !== tokenRejeitado)) return;
    const retorno = retornoSeguro(this.router.url);
    this.limpar();
    void this.router.navigate(['/login'], {
      replaceUrl: true,
      queryParams: { motivo: 'expirada', retorno },
    });
  }

  private limpar(): void {
    ++this.geracao;
    clearTimeout(this.timer);
    this.sessao.set(null);
  }
  private agendarExpiracao(): void {
    const restante = (this.sessao()?.expiraEm ?? 0) - Date.now();
    this.timer = setTimeout(
      () => {
        if ((this.sessao()?.expiraEm ?? 0) <= Date.now()) this.expirar();
        else this.agendarExpiracao();
      },
      Math.min(Math.max(restante, 1), 2147483647),
    );
  }
  private expiracao(token: string): number | null {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;
      const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
        ? payload.exp * 1000
        : null;
    } catch {
      return null;
    }
  }
}
