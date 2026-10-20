package AgendaCare;

import AgendaCare.config.JwtProperties;
import AgendaCare.entity.Usuario;
import AgendaCare.entity.Paciente;
import AgendaCare.entity.Agendamento;
import AgendaCare.entity.StatusAgendamento;
import AgendaCare.repository.PacienteRepository;
import AgendaCare.repository.AgendamentoRepository;
import AgendaCare.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationTests extends AuthTestSupport {
    private static final String PASSWORD = "SenhaSegura!2026";
    @Autowired
    MockMvc mvc;
    @Autowired
    UsuarioRepository usuarios;
    @Autowired
    PasswordEncoder passwords;
    @Autowired
    JwtEncoder encoder;
    @Autowired
    JwtDecoder decoder;
    @Autowired
    JwtProperties properties;
    @Autowired
    PacienteRepository pacientes;
    @Autowired
    AgendamentoRepository agendamentos;

    @BeforeEach
    void cleanUsers() {
        usuarios.deleteAll();
    }

    private ResultActions register(String email) throws Exception {
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":" Profissional Teste ","email":"%s","senha":"%s"}
                        """.formatted(email, PASSWORD)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","senha":"%s"}
                        """.formatted(email, password)));
    }

    private String validToken() throws Exception {
        register("teste@example.com").andExpect(status().isCreated());
        return JsonPath.read(login("teste@example.com", PASSWORD).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void registersNormalizedEmailAndHashedPasswordWithoutLeakingIt() throws Exception {
        register("  Teste@EXAMPLE.COM  ")
                .andExpect(status().isCreated()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").isNumber()).andExpect(jsonPath("$.nome").value("Profissional Teste"))
                .andExpect(jsonPath("$.email").value("teste@example.com"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.senha").doesNotExist()).andExpect(jsonPath("$.senhaHash").doesNotExist());
        var stored = usuarios.findByEmail("teste@example.com").orElseThrow();
        assertThat(stored.getSenhaHash()).isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, stored.getSenhaHash())).isTrue();
        assertThat(stored.getCreatedAt()).isNotNull();
    }

    @Test
    void rejectsDuplicateEmailRegardlessOfCaseOrWhitespace() throws Exception {
        register("teste@example.com").andExpect(status().isCreated());
        register(" TESTE@EXAMPLE.COM ").andExpect(status().isConflict());
        assertThat(usuarios.count()).isEqualTo(1);
    }

    @Test
    void databaseUniquenessProtectsConcurrentRegistration() {
        usuarios.saveAndFlush(new Usuario("Primeiro", "teste@example.com", "hash-only-for-db-test"));
        assertThatThrownBy(
                () -> usuarios.saveAndFlush(new Usuario("Segundo", "TESTE@example.com", "other-hash-only-for-db-test")))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(usuarios.count()).isEqualTo(1);
    }

    @Test
    void logsInAndReturnsShortLivedSignedToken() throws Exception {
        register("teste@example.com").andExpect(status().isCreated());
        var result = login(" TESTE@EXAMPLE.COM ", PASSWORD).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.tokenType").value("Bearer")).andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.usuario.email").value("teste@example.com"))
                .andExpect(jsonPath("$.usuario.senhaHash").doesNotExist()).andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain(PASSWORD).doesNotContain("senha_hash").doesNotContain("$2a$");
        String token = JsonPath.read(body, "$.accessToken");
        var jwt = decoder.decode(token);
        assertThat(jwt.getSubject())
                .isEqualTo(usuarios.findByEmail("teste@example.com").orElseThrow().getId().toString());
        assertThat(jwt.getAudience()).contains(properties.audience());
        assertThat(jwt.getExpiresAt()).isEqualTo(jwt.getIssuedAt().plusSeconds(900));
    }

    @Test
    void wrongPasswordAndUnknownUserReturnSameGenericFailure() throws Exception {
        register("teste@example.com").andExpect(status().isCreated());
        var wrong = login("teste@example.com", "SenhaErrada!2026").andExpect(status().isUnauthorized()).andReturn();
        var missing = login("ausente@example.com", "SenhaErrada!2026").andExpect(status().isUnauthorized()).andReturn();
        assertThat((String) JsonPath.read(wrong.getResponse().getContentAsString(), "$.mensagem"))
                .isEqualTo((String) JsonPath.read(missing.getResponse().getContentAsString(), "$.mensagem"));
        assertThat(wrong.getResponse().getContentAsString()).doesNotContain(PASSWORD);
    }

    @ParameterizedTest
    @ValueSource(strings = { "curta", "somenteletrasminusculas", "SENHA!123456789", "SemNumero!Senha",
            "SemSimbolo1234", "Ab1!cde" })
    void rejectsWeakPasswords(String password) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Teste","email":"teste@example.com","senha":"%s"}
                        """.formatted(password)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos[0].campo").value("senha"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(password))));
        assertThat(usuarios.count()).isZero();
    }

    @ParameterizedTest
    @ValueSource(ints = { 8, 64 })
    void registersAndLogsInAtPasswordCharacterBoundaries(int length) throws Exception {
        String password = "Ab1!" + "a".repeat(length - 4);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Teste","email":"teste@example.com","senha":"%s"}
                        """.formatted(password))).andExpect(status().isCreated());
        assertThat(passwords.matches(password, usuarios.findByEmail("teste@example.com").orElseThrow().getSenhaHash()))
                .isTrue();
        login("teste@example.com", password).andExpect(status().isOk());
    }

    @Test
    void rejectsMoreThan64CharactersWithUpdatedValidationMessage() throws Exception {
        String password = "Ab1!" + "a".repeat(61);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Teste","email":"teste@example.com","senha":"%s"}
                        """.formatted(password))).andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("8 a 64 caracteres")));
        assertThat(usuarios.count()).isZero();
    }

    @Test
    void acceptsExactly72Utf8Bytes() throws Exception {
        String password = "Ab1!" + "\u00e9".repeat(34);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Teste","email":"teste@example.com","senha":"%s"}
                        """.formatted(password))).andExpect(status().isCreated());
        login("teste@example.com", password).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}", "{\"nome\":\" \",\"email\":\"errado\",\"senha\":\"SenhaSegura!2026\"}",
            "{\"nome\":\"Teste\",\"email\":\"\",\"senha\":\"SenhaSegura!2026\"}", "{nao-e-json}"
    })
    void rejectsInvalidRegistrationFields(String body) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        assertThat(usuarios.count()).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = { "/api/pacientes", "/api/agendamentos", "/api/dashboard", "/api/auth/unknown",
            "/api/auth/login", "/error" })
    void deniesUnauthenticatedGetRequests(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"));
    }

    @Test
    void protectsAllExistingWriteOperations() throws Exception {
        for (String path : List.of("/api/pacientes", "/api/agendamentos")) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(put(path + "/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(delete(path + "/1")).andExpect(status().isUnauthorized());
        }
        for (String action : List.of("confirmar", "concluir", "falta", "cancelar"))
            mvc.perform(patch("/api/agendamentos/1/" + action)).andExpect(status().isUnauthorized());
    }

    @Test
    void validTokenAllowsExistingReadEndpointsWithoutCreatingASession() throws Exception {
        String token = validToken();
        for (String path : List.of("/api/pacientes", "/api/agendamentos")) {
            var result = mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk())
                    .andReturn();
            assertThat(result.getRequest().getSession(false)).isNull();
            assertThat(result.getResponse().getHeader("Set-Cookie")).isNull();
        }
    }

    @Test
    void tokenWithWrongSignatureOrMalformedTokenIsRejected() throws Exception {
        String token = validToken();
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        var other = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(key, "HmacSHA256")));
        var claims = JwtClaimsSet.builder().issuer(properties.issuer()).audience(List.of(properties.audience()))
                .subject("1").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(900)).build();
        String forged = other.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        for (String bad : List.of("not-a-jwt", forged, token + "tampered"))
            mvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + bad))
                    .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = { "expired", "future", "issuer", "audience", "no-exp", "no-sub" })
    void rejectsInvalidTokenClaims(String kind) throws Exception {
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(kind.equals("issuer") ? "other" : properties.issuer())
                .audience(List.of(kind.equals("audience") ? "other" : properties.audience()))
                .issuedAt(now.minusSeconds(120));
        if (!kind.equals("no-sub"))
            claims.subject("1");
        if (!kind.equals("no-exp"))
            claims.expiresAt(kind.equals("expired") ? now.minusSeconds(60) : now.plusSeconds(900));
        if (kind.equals("future"))
            claims.notBefore(now.plusSeconds(900));
        String token = encoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
        mvc.perform(get("/api/pacientes").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void supportsAngularPreflightWithoutOpeningProtectedRequests() throws Exception {
        mvc.perform(options("/api/pacientes").header("Origin", "http://localhost:4200")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        mvc.perform(options("/api/pacientes").header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
    }

    @Test
    void authenticationPreservesExistingRecordsAndAppointmentRules() throws Exception {
        var patient = new Paciente();
        patient.setNome("Paciente preexistente");
        patient.setTelefone("3432221234");
        patient = pacientes.saveAndFlush(patient);
        var appointment = new Agendamento();
        appointment.setPaciente(patient);
        appointment.setData(LocalDate.of(2099, 1, 1));
        appointment.setHoraInicio(LocalTime.of(9, 0));
        appointment.setHoraFim(LocalTime.of(10, 0));
        appointment.setTipo("Consulta preexistente");
        appointment.setStatus(StatusAgendamento.AGENDADO);
        appointment = agendamentos.saveAndFlush(appointment);
        try {
            String token = validToken();
            mvc.perform(get("/api/pacientes/" + patient.getId()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.telefone").value("3432221234"));
            String path = "/api/agendamentos/" + appointment.getId();
            mvc.perform(patch(path + "/concluir").header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());
            mvc.perform(patch(path + "/confirmar").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMADO"));
            mvc.perform(patch(path + "/concluir").header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());
            mvc.perform(patch(path + "/falta").header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());
            assertThat(agendamentos.findById(appointment.getId()).orElseThrow().getStatus())
                    .isEqualTo(StatusAgendamento.CONFIRMADO);
            assertThat(pacientes.findById(patient.getId()).orElseThrow().getNome())
                    .isEqualTo("Paciente preexistente");
        } finally {
            agendamentos.deleteById(appointment.getId());
            pacientes.deleteById(patient.getId());
        }
    }

    @Test
    void refusesOversizedUtf8PasswordsWithoutBcryptTruncation() throws Exception {
        String password = "Ab1!" + "\u00e9".repeat(35);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Teste","email":"teste@example.com","senha":"%s"}
                        """.formatted(password))).andExpect(status().isBadRequest());
        assertThat(usuarios.count()).isZero();
    }

    @Test
    void missingLoginFieldsReturnValidationError() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }
}
