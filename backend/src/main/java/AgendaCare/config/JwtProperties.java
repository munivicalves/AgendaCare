package AgendaCare.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, String issuer, String audience, Duration ttl) {
    public JwtProperties {
        if (secret == null || secret.isBlank()) throw new IllegalArgumentException("JWT_SECRET e obrigatorio e deve conter uma chave aleatoria em Base64.");
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) throw new IllegalArgumentException("Issuer e audience JWT sao obrigatorios.");
        if (ttl == null || ttl.compareTo(Duration.ofMinutes(1)) < 0 || ttl.compareTo(Duration.ofHours(1)) > 0)
            throw new IllegalArgumentException("A validade JWT deve estar entre 1 minuto e 1 hora.");
    }
    @Override public String toString() { return "JwtProperties[redacted]"; }
}
