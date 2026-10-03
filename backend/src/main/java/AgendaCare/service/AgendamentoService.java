package AgendaCare.service;

import AgendaCare.dto.AgendamentoRequestDTO;
import AgendaCare.entity.Agendamento;
import AgendaCare.entity.Paciente;
import AgendaCare.entity.StatusAgendamento;
import AgendaCare.exception.ConflitoAgendamentoException;
import AgendaCare.exception.RecursoNaoEncontradoException;
import AgendaCare.repository.AgendamentoRepository;
import AgendaCare.repository.PacienteRepository;
import org.springframework.stereotype.Service;
import AgendaCare.dto.AgendamentoResponseDTO;

import java.time.LocalDate;
import java.util.List;

@Service
public class AgendamentoService {

        private final AgendamentoRepository agendamentoRepository;
        private final PacienteRepository pacienteRepository;

        public AgendamentoService(
                        AgendamentoRepository agendamentoRepository,
                        PacienteRepository pacienteRepository) {
                this.agendamentoRepository = agendamentoRepository;
                this.pacienteRepository = pacienteRepository;
        }

        public AgendamentoResponseDTO salvar(AgendamentoRequestDTO dto) {

                validarHorarios(dto);

                Paciente paciente = buscarPaciente(dto.pacienteId());

                boolean existeConflito = agendamentoRepository
                                .existsByDataAndHoraInicioLessThanAndHoraFimGreaterThanAndStatusNot(
                                                dto.data(),
                                                dto.horaFim(),
                                                dto.horaInicio(),
                                                StatusAgendamento.CANCELADO);

                if (existeConflito) {
                        throw new ConflitoAgendamentoException(
                                        "Já existe um agendamento nesse horário.");
                }

                Agendamento agendamento = new Agendamento();

                agendamento.setPaciente(paciente);
                agendamento.setData(dto.data());
                agendamento.setHoraInicio(dto.horaInicio());
                agendamento.setHoraFim(dto.horaFim());
                agendamento.setTipo(dto.tipo());
                agendamento.setObservacoes(dto.observacoes());

                if (dto.status() == null) {
                        agendamento.setStatus(StatusAgendamento.AGENDADO);
                } else {
                        agendamento.setStatus(dto.status());
                }

                Agendamento salvo = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(salvo);
        }

        public List<AgendamentoResponseDTO> listarTodos() {

                return agendamentoRepository.findAll()
                                .stream()
                                .map(AgendamentoResponseDTO::new)
                                .toList();
        }

        public List<AgendamentoResponseDTO> listarPorData(LocalDate data) {

                return agendamentoRepository
                                .findByDataOrderByHoraInicioAsc(data)
                                .stream()
                                .map(AgendamentoResponseDTO::new)
                                .toList();
        }

        public List<AgendamentoResponseDTO> listarPorPaciente(Long pacienteId) {

                buscarPaciente(pacienteId);

                return agendamentoRepository
                                .findByPacienteIdOrderByDataDescHoraInicioDesc(pacienteId)
                                .stream()
                                .map(AgendamentoResponseDTO::new)
                                .toList();
        }

        public AgendamentoResponseDTO buscarPorId(Long id) {
                return new AgendamentoResponseDTO(
                                buscarEntidadePorId(id));
        }

        private Agendamento buscarEntidadePorId(Long id) {
                return agendamentoRepository.findById(id)
                                .orElseThrow(() -> new RecursoNaoEncontradoException(
                                                "Agendamento não encontrado."));
        }

        public AgendamentoResponseDTO atualizar(
                        Long id,
                        AgendamentoRequestDTO dto) {

                Agendamento agendamento = buscarEntidadePorId(id);

                validarHorarios(dto);

                Paciente paciente = buscarPaciente(dto.pacienteId());

                boolean existeConflito = agendamentoRepository
                                .existsByDataAndHoraInicioLessThanAndHoraFimGreaterThanAndIdNotAndStatusNot(
                                                dto.data(),
                                                dto.horaFim(),
                                                dto.horaInicio(),
                                                id,
                                                StatusAgendamento.CANCELADO);

                if (existeConflito) {
                        throw new ConflitoAgendamentoException(
                                        "Já existe outro agendamento nesse horário.");
                }

                agendamento.setPaciente(paciente);
                agendamento.setData(dto.data());
                agendamento.setHoraInicio(dto.horaInicio());
                agendamento.setHoraFim(dto.horaFim());
                agendamento.setTipo(dto.tipo());
                agendamento.setObservacoes(dto.observacoes());

                if (dto.status() != null) {
                        agendamento.setStatus(dto.status());
                }

                Agendamento atualizado = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(atualizado);
        }

        public AgendamentoResponseDTO cancelar(Long id) {

                Agendamento agendamento = buscarEntidadePorId(id);

                if (agendamento.getStatus() == StatusAgendamento.CANCELADO) {
                        throw new IllegalArgumentException(
                                        "Este agendamento já está cancelado.");
                }

                if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO) {
                        throw new IllegalArgumentException(
                                        "Não é possível cancelar um agendamento concluído.");
                }

                agendamento.setStatus(StatusAgendamento.CANCELADO);

                Agendamento cancelado = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(cancelado);
        }

        public void excluir(Long id) {
                Agendamento agendamento = buscarEntidadePorId(id);
                agendamentoRepository.delete(agendamento);
        }

        private Paciente buscarPaciente(Long id) {

                if (id == null) {
                        throw new IllegalArgumentException(
                                        "O paciente é obrigatório.");
                }

                return pacienteRepository.findById(id)
                                .orElseThrow(() -> new RecursoNaoEncontradoException(
                                                "Paciente não encontrado."));
        }

        private void validarHorarios(AgendamentoRequestDTO dto) {

                if (dto.horaInicio() == null || dto.horaFim() == null) {
                        throw new IllegalArgumentException(
                                        "Os horários de início e fim são obrigatórios.");
                }

                if (!dto.horaFim().isAfter(dto.horaInicio())) {
                        throw new IllegalArgumentException(
                                        "O horário final deve ser posterior ao horário inicial.");
                }
        }
}