package AgendaCare.dto;

import AgendaCare.entity.StatusAgendamento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record AgendamentoRequestDTO(

        @NotNull(message = "O paciente é obrigatório.") Long pacienteId,

        @NotNull(message = "A data é obrigatória.") LocalDate data,

        @NotNull(message = "O horário inicial é obrigatório.") LocalTime horaInicio,

        @NotNull(message = "O horário final é obrigatório.") LocalTime horaFim,

        @NotBlank(message = "O tipo do atendimento é obrigatório.") String tipo,

        StatusAgendamento status,

        String observacoes) {
}