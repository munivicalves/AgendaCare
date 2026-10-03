package AgendaCare.dto;

import AgendaCare.entity.Paciente;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PacienteResponseDTO(
        Long id,
        String nome,
        String email,
        String telefone,
        LocalDate dataNascimento,
        String observacoes,
        LocalDateTime createdAt) {

    public PacienteResponseDTO(Paciente paciente) {
        this(
                paciente.getId(),
                paciente.getNome(),
                paciente.getEmail(),
                paciente.getTelefone(),
                paciente.getDataNascimento(),
                paciente.getObservacoes(),
                paciente.getCreatedAt());
    }
}