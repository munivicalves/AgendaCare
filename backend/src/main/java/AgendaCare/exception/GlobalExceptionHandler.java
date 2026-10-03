package AgendaCare.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConflitoAgendamentoException.class)
    public ResponseEntity<Map<String, Object>> tratarConflito(
            ConflitoAgendamentoException exception
    ) {

        Map<String, Object> erro = new LinkedHashMap<>();

        erro.put("timestamp", LocalDateTime.now());
        erro.put("status", HttpStatus.CONFLICT.value());
        erro.put("erro", "Conflito de horário");
        erro.put("mensagem", exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(erro);
    }

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<Map<String, Object>> tratarNaoEncontrado(
            RecursoNaoEncontradoException exception
    ) {

        Map<String, Object> erro = new LinkedHashMap<>();

        erro.put("timestamp", LocalDateTime.now());
        erro.put("status", HttpStatus.NOT_FOUND.value());
        erro.put("erro", "Recurso não encontrado");
        erro.put("mensagem", exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(erro);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> tratarArgumentoInvalido(
            IllegalArgumentException exception
    ) {

        Map<String, Object> erro = new LinkedHashMap<>();

        erro.put("timestamp", LocalDateTime.now());
        erro.put("status", HttpStatus.BAD_REQUEST.value());
        erro.put("erro", "Dados inválidos");
        erro.put("mensagem", exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(erro);
    }
}