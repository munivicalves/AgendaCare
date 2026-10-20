export interface UsuarioAutenticado {
  id: number;
  nome: string;
  email: string;
  createdAt: string;
}
export interface LoginRequest {
  email: string;
  senha: string;
}
export interface RegisterRequest extends LoginRequest {
  nome: string;
}
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: UsuarioAutenticado;
}
