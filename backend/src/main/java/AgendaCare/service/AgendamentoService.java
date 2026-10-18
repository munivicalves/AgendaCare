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
import java.time.LocalDateTime;

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

                if (dto.status() != null
                                && dto.status() != StatusAgendamento.AGENDADO) {

                        throw new IllegalArgumentException(
                                        "Novas consultas devem iniciar com status AGENDADO.");
                }

                agendamento.setStatus(StatusAgendamento.AGENDADO);
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

                if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO
                                || agendamento.getStatus() == StatusAgendamento.CANCELADO
                                || agendamento.getStatus() == StatusAgendamento.FALTOU) {

                        throw new IllegalArgumentException(
                                        "Não é possível editar uma consulta finalizada ou cancelada.");
                }

                if (dto.status() != null
                                && dto.status() != agendamento.getStatus()) {

                        throw new IllegalArgumentException(
                                        "O status não pode ser alterado pela edição. Utilize a operação específica.");
                }

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

                Agendamento atualizado = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(atualizado);
        }

        public AgendamentoResponseDTO confirmar(Long id) {

                Agendamento agendamento = buscarEntidadePorId(id);

                if (agendamento.getStatus() != StatusAgendamento.AGENDADO) {
                        throw new IllegalArgumentException(
                                        "Somente consultas com status AGENDADO podem ser confirmadas.");
                }

                agendamento.setStatus(StatusAgendamento.CONFIRMADO);

                Agendamento confirmado = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(confirmado);
        }

        public AgendamentoResponseDTO concluir(Long id) {

                Agendamento agendamento = buscarEntidadePorId(id);

                if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
                        throw new IllegalArgumentException(
                                        "Somente consultas confirmadas podem ser concluídas.");
                }

                validarHorarioEncerrado(agendamento);

                agendamento.setStatus(StatusAgendamento.CONCLUIDO);

                Agendamento concluido = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(concluido);
        }

        public AgendamentoResponseDTO registrarFalta(Long id) {

                Agendamento agendamento = buscarEntidadePorId(id);

                if (agendamento.getStatus() != StatusAgendamento.AGENDADO
                                && agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
                        throw new IllegalArgumentException(
                                        "Somente consultas agendadas ou confirmadas podem ser marcadas como falta.");
                }

                validarHorarioEncerrado(agendamento);

                agendamento.setStatus(StatusAgendamento.FALTOU);

                Agendamento atualizado = agendamentoRepository.save(agendamento);

                return new AgendamentoResponseDTO(atualizado);
        }

        public AgendamentoResponseDTO cancelar(Long id) {

                Agendamento agendamento = buscarEntidadePorId(id);

                if (agendamento.getStatus() != StatusAgendamento.AGENDADO
                                && agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {

                        throw new IllegalArgumentException(
                                        "Somente consultas agendadas ou confirmadas podem ser canceladas.");
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

        private void validarHorarioEncerrado(Agendamento agendamento) {

                LocalDateTime fimConsulta = LocalDateTime.of(
                                agendamento.getData(),
                                agendamento.getHoraFim());

                LocalDateTime agora = LocalDateTime.now();

                if (agora.isBefore(fimConsulta)) {
                        throw new IllegalArgumentException(
                                        "Não é possível finalizar uma consulta antes do horário previsto para seu término.");
                }
        }
}