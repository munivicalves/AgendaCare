package AgendaCare.repository;

import AgendaCare.entity.Agendamento;
import AgendaCare.entity.StatusAgendamento;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AgendamentoRepository
                extends JpaRepository<Agendamento, Long> {

        List<Agendamento> findByDataOrderByHoraInicioAsc(LocalDate data);

        List<Agendamento> findByPacienteIdOrderByDataDescHoraInicioDesc(
                        Long pacienteId);

        boolean existsByDataAndHoraInicioLessThanAndHoraFimGreaterThanAndStatusNot(
                        LocalDate data,
                        LocalTime horaFim,
                        LocalTime horaInicio,
                        StatusAgendamento status);

        boolean existsByDataAndHoraInicioLessThanAndHoraFimGreaterThanAndIdNotAndStatusNot(
                        LocalDate data,
                        LocalTime horaFim,
                        LocalTime horaInicio,
                        Long id,
                        StatusAgendamento status);
}