package AgendaCare.exception;

public class EmailDuplicadoException extends RuntimeException {
    public EmailDuplicadoException() { super("Este e-mail ja esta cadastrado."); }
}
