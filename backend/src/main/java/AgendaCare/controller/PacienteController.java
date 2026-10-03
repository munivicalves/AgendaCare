package AgendaCare.controller;

import AgendaCare.dto.PacienteRequestDTO;
import AgendaCare.dto.PacienteResponseDTO;
import AgendaCare.service.PacienteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pacientes")
public class PacienteController {

    private final PacienteService pacienteService;

    public PacienteController(PacienteService pacienteService) {
        this.pacienteService = pacienteService;
    }

    @PostMapping
    public ResponseEntity<PacienteResponseDTO> criar(
            @Valid @RequestBody PacienteRequestDTO dto) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(pacienteService.salvar(dto));
    }

    @GetMapping
    public ResponseEntity<List<PacienteResponseDTO>> listar() {

        return ResponseEntity.ok(
                pacienteService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PacienteResponseDTO> buscarPorId(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                pacienteService.buscarPorId(id));
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<PacienteResponseDTO>> buscarPorNome(
            @RequestParam String nome) {

        return ResponseEntity.ok(
                pacienteService.buscarPorNome(nome));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PacienteResponseDTO> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody PacienteRequestDTO dto) {

        return ResponseEntity.ok(
                pacienteService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(
            @PathVariable Long id) {

        pacienteService.excluir(id);

        return ResponseEntity.noContent().build();
    }
}