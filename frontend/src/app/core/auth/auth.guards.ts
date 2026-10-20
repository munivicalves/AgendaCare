import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { retornoSeguro } from './auth.config';

export const authGuard: CanActivateFn = (_route, state) => {
  return inject(AuthService).tokenAtual()
    ? true
    : inject(Router).createUrlTree(['/login'], {
        queryParams: { retorno: retornoSeguro(state.url) },
      });
};
export const visitanteGuard: CanActivateFn = () => {
  return inject(AuthService).tokenAtual() ? inject(Router).parseUrl('/') : true;
};
