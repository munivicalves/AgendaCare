package AgendaCare.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SenhaSeguraValidator.class)
public @interface SenhaSegura {
    String message() default "A senha deve ter de 8 a 64 caracteres, maiuscula, minuscula, numero e simbolo (no maximo 72 bytes UTF-8).";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
