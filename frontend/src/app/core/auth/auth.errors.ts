import { HttpErrorResponse } from '@angular/common/http';

export function mensagemAuth(error: unknown, cadastro = false): string {
  if (!(error instanceof HttpErrorResponse)) return 'Não foi possível concluir. Tente novamente.';
  switch (error.status) {
    case 0:
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    case 400:
      return cadastro
        ? 'Confira os campos e os requisitos da senha.'
        : 'Confira o e-mail e a senha informados.';
    case 401:
      return cadastro
        ? 'Não foi possível cadastrar. Tente novamente.'
        : 'E-mail ou senha incorretos.';
    case 409:
      return 'Este e-mail já está cadastrado. Entre na sua conta ou use outro e-mail.';
    default:
      return 'O servidor está indisponível no momento. Tente novamente em instantes.';
  }
}
