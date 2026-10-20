import { LoginResponse } from '../app/core/auth/auth.models';

export function respostaLogin(segundos = 900): LoginResponse {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '7', exp: Math.floor(Date.now() / 1000) + segundos })}.assinatura-apenas-de-teste`;
  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: segundos,
    usuario: {
      id: 7,
      nome: 'Pessoa de Teste',
      email: 'teste@example.com',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };
}
