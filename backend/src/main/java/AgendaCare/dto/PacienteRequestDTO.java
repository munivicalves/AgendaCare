package AgendaCare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PacienteRequestDTO(

        @NotBlank(message = "O nome é obrigatório.") String nome,

        @Email(message = "Informe um e-mail válido.") String email,

        String telefone,

        LocalDate dataNascimento,

        String observacoes) {
}