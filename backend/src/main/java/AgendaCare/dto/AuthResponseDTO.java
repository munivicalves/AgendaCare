package AgendaCare.dto;

public record AuthResponseDTO(String accessToken, String tokenType, long expiresIn, UsuarioResponseDTO usuario) {
    @Override public String toString() { return "AuthResponseDTO[redacted]"; }
}
