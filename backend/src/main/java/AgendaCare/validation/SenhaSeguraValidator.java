package AgendaCare.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class SenhaSeguraValidator implements ConstraintValidator<SenhaSegura, String> {
    @Override
    public boolean isValid(String senha, ConstraintValidatorContext context) {
        if (senha == null || senha.length() < 8 || senha.length() > 64
                || senha.getBytes(StandardCharsets.UTF_8).length > 72)
            return false;
        return senha.chars().anyMatch(Character::isUpperCase)
                && senha.chars().anyMatch(Character::isLowerCase)
                && senha.chars().anyMatch(Character::isDigit)
                && senha.chars().anyMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c));
    }
}
