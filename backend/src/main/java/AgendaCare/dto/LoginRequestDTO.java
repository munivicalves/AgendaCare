package AgendaCare.dto;

import jakarta.validation.constraints.*;
import java.util.Locale;

public record LoginRequestDTO(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 128) String senha) {
    public LoginRequestDTO {
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
    @Override public String toString() { return "LoginRequestDTO[redacted]"; }
}
