package AgendaCare.dto;

import AgendaCare.entity.Usuario;
import java.time.Instant;

public record UsuarioResponseDTO(Long id, String nome, String email, Instant createdAt) {
    public UsuarioResponseDTO(Usuario usuario) {
        this(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getCreatedAt());
    }
}
