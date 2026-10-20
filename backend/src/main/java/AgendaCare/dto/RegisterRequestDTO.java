package AgendaCare.dto;

import AgendaCare.validation.SenhaSegura;
import jakarta.validation.constraints.*;
import java.util.Locale;

public record RegisterRequestDTO(
        @NotBlank @Size(min = 2, max = 120) String nome,
        @NotBlank @Email @Size(max = 254) String email,
        @SenhaSegura String senha) {
    public RegisterRequestDTO {
        nome = nome == null ? null : nome.strip();
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
    @Override public String toString() { return "RegisterRequestDTO[redacted]"; }
}
