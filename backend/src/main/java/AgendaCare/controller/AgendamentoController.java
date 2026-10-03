package AgendaCare.controller;

import AgendaCare.dto.AgendamentoRequestDTO;
import AgendaCare.dto.AgendamentoResponseDTO;
import AgendaCare.service.AgendamentoService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
public class AgendamentoController {

        private final AgendamentoService agendamentoService;

        public AgendamentoController(
                        AgendamentoService agendamentoService) {
                this.agendamentoService = agendamentoService;
        }

        // Criar agendamento
        @PostMapping
        public ResponseEntity<AgendamentoResponseDTO> criar(
                        @Valid @RequestBody AgendamentoRequestDTO dto) {

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(agendamentoService.salvar(dto));
        }

        // Listar todos os agendamentos
        @GetMapping
        public ResponseEntity<List<AgendamentoResponseDTO>> listar() {

                return ResponseEntity.ok(
                                agendamentoService.listarTodos());
        }

        // Buscar agendamento por ID
        @GetMapping("/{id}")
        public ResponseEntity<AgendamentoResponseDTO> buscarPorId(
                        @PathVariable Long id) {
                return ResponseEntity.ok(
                                agendamentoService.buscarPorId(id));
        }

        // Listar agendamentos por data
        @GetMapping("/data/{data}")
        public ResponseEntity<List<AgendamentoResponseDTO>> listarPorData(
                        @PathVariable LocalDate data) {

                return ResponseEntity.ok(
                                agendamentoService.listarPorData(data));
        }

        // Listar histórico de agendamentos de um paciente
        @GetMapping("/paciente/{pacienteId}")
        public ResponseEntity<List<AgendamentoResponseDTO>> listarPorPaciente(
                        @PathVariable Long pacienteId) {

                return ResponseEntity.ok(
                                agendamentoService.listarPorPaciente(pacienteId));
        }

        // Atualizar / reagendar
        @PutMapping("/{id}")
        public ResponseEntity<AgendamentoResponseDTO> atualizar(
                        @PathVariable Long id,
                        @Valid @RequestBody AgendamentoRequestDTO dto) {

                return ResponseEntity.ok(
                                agendamentoService.atualizar(id, dto));
        }

        // Cancelar agendamento
        @PatchMapping("/{id}/cancelar")
        public ResponseEntity<AgendamentoResponseDTO> cancelar(
                        @PathVariable Long id) {

                return ResponseEntity.ok(
                                agendamentoService.cancelar(id));
        }

        // Excluir definitivamente
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> excluir(
                        @PathVariable Long id) {

                agendamentoService.excluir(id);

                return ResponseEntity.noContent().build();
        }
}