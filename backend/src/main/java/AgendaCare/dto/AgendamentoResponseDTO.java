package AgendaCare.dto;

import AgendaCare.entity.Agendamento;
import AgendaCare.entity.StatusAgendamento;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record AgendamentoResponseDTO(
        Long id,
        Long pacienteId,
        String pacienteNome,
        LocalDate data,
        LocalTime horaInicio,
        LocalTime horaFim,
        String tipo,
        StatusAgendamento status,
        String observacoes,
        LocalDateTime createdAt) {

    public AgendamentoResponseDTO(Agendamento agendamento) {
        this(
                agendamento.getId(),
                agendamento.getPaciente().getId(),
                agendamento.getPaciente().getNome(),
                agendamento.getData(),
                agendamento.getHoraInicio(),
                agendamento.getHoraFim(),
                agendamento.getTipo(),
                agendamento.getStatus(),
                agendamento.getObservacoes(),
                agendamento.getCreatedAt());
    }
}