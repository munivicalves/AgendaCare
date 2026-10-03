package AgendaCare.service;

import AgendaCare.dto.PacienteRequestDTO;
import AgendaCare.dto.PacienteResponseDTO;
import AgendaCare.entity.Paciente;
import AgendaCare.exception.RecursoNaoEncontradoException;
import AgendaCare.repository.PacienteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PacienteService {

    private final PacienteRepository pacienteRepository;

    public PacienteService(PacienteRepository pacienteRepository) {
        this.pacienteRepository = pacienteRepository;
    }

    public PacienteResponseDTO salvar(PacienteRequestDTO dto) {

        Paciente paciente = new Paciente();

        paciente.setNome(dto.nome());
        paciente.setEmail(dto.email());
        paciente.setTelefone(dto.telefone());
        paciente.setDataNascimento(dto.dataNascimento());
        paciente.setObservacoes(dto.observacoes());

        Paciente salvo = pacienteRepository.save(paciente);

        return new PacienteResponseDTO(salvo);
    }

    public List<PacienteResponseDTO> listarTodos() {

        return pacienteRepository.findAll()
                .stream()
                .map(PacienteResponseDTO::new)
                .toList();
    }

    public PacienteResponseDTO buscarPorId(Long id) {
        return new PacienteResponseDTO(buscarEntidadePorId(id));
    }

    public List<PacienteResponseDTO> buscarPorNome(String nome) {

        return pacienteRepository
                .findByNomeContainingIgnoreCaseOrderByNomeAsc(nome)
                .stream()
                .map(PacienteResponseDTO::new)
                .toList();
    }

    public PacienteResponseDTO atualizar(
            Long id,
            PacienteRequestDTO dto) {

        Paciente paciente = buscarEntidadePorId(id);

        paciente.setNome(dto.nome());
        paciente.setEmail(dto.email());
        paciente.setTelefone(dto.telefone());
        paciente.setDataNascimento(dto.dataNascimento());
        paciente.setObservacoes(dto.observacoes());

        Paciente atualizado = pacienteRepository.save(paciente);

        return new PacienteResponseDTO(atualizado);
    }

    public void excluir(Long id) {

        Paciente paciente = buscarEntidadePorId(id);

        pacienteRepository.delete(paciente);
    }

    private Paciente buscarEntidadePorId(Long id) {

        return pacienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Paciente não encontrado."));
    }
}