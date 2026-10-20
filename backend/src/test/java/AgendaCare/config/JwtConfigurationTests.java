package AgendaCare.config;

import java.time.Duration;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class JwtConfigurationTests {
        @Test
        void requiresSecretAndRejectsUnsafeExpiration() {
                assertThatThrownBy(() -> new JwtProperties(null, "issuer", "audience", Duration.ofMinutes(15)))
                                .isInstanceOf(IllegalArgumentException.class);
                assertThatThrownBy(() -> new JwtProperties("test", "issuer", "audience", Duration.ofDays(1)))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void rejectsMalformedAndShortKeys() {
                var security = new SecurityConfig();
                assertThatThrownBy(() -> security.jwtSecretKey(
                                new JwtProperties("not base64!", "issuer", "audience", Duration.ofMinutes(15))))
                                .isInstanceOf(IllegalArgumentException.class);
                var weak = Base64.getEncoder().encodeToString(new byte[8]);
                assertThatThrownBy(() -> security.jwtSecretKey(
                                new JwtProperties(weak, "issuer", "audience", Duration.ofMinutes(15))))
                                .isInstanceOf(IllegalArgumentException.class);
        }
}
