package AgendaCare.exception;

import AgendaCare.controller.AuthController;
import java.time.Instant;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {
    @ExceptionHandler(EmailDuplicadoException.class)
    ResponseEntity<?> duplicate() {
        return error(409, "Este e-mail ja esta cadastrado.");
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<?> credentials() {
        return error(401, "E-mail ou senha invalidos.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        var fields = exception.getBindingResult().getFieldErrors().stream()
                .map(field -> Map.of("campo", field.getField(), "mensagem",
                        field.getDefaultMessage() == null ? "Campo invalido." : field.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest()
                .body(Map.of("status", 400, "mensagem", "Verifique os campos informados.", "campos", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> malformed() {
        return error(400, "Corpo da requisicao invalido.");
    }

    private ResponseEntity<?> error(int status, String message) {
        return ResponseEntity.status(status)
                .body(Map.of("timestamp", Instant.now(), "status", status, "mensagem", message));
    }
}
