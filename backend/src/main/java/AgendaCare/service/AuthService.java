package AgendaCare.service;

import AgendaCare.config.JwtProperties;
import AgendaCare.dto.*;
import AgendaCare.entity.Usuario;
import AgendaCare.exception.EmailDuplicadoException;
import AgendaCare.repository.UsuarioRepository;
import java.time.Instant;
import java.sql.SQLException;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authentication;
    private final JwtEncoder tokens;
    private final JwtProperties properties;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder passwords, AuthenticationManager authentication,
            JwtEncoder tokens, JwtProperties properties) {
        this.usuarios = usuarios;
        this.passwords = passwords;
        this.authentication = authentication;
        this.tokens = tokens;
        this.properties = properties;
    }

    @Transactional
    public UsuarioResponseDTO register(RegisterRequestDTO request) {
        if (usuarios.existsByEmail(request.email()))
            throw new EmailDuplicadoException();
        var usuario = new Usuario(request.nome(), request.email(), passwords.encode(request.senha()));
        try {
            return new UsuarioResponseDTO(usuarios.saveAndFlush(usuario));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getMostSpecificCause() instanceof SQLException sql
                    && "23505".equals(sql.getSQLState())) {
                throw new EmailDuplicadoException();
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginRequestDTO request) {
        var authenticated = authentication.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.senha()));
        var usuario = usuarios.findById(Long.valueOf(authenticated.getName()))
                .orElseThrow(() -> new BadCredentialsException("Credenciais invalidas."));
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(properties.issuer()).audience(List.of(properties.audience()))
                .subject(usuario.getId().toString()).issuedAt(now).notBefore(now)
                .expiresAt(now.plus(properties.ttl())).build();
        var header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String token = tokens.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AuthResponseDTO(token, "Bearer", properties.ttl().toSeconds(), new UsuarioResponseDTO(usuario));
    }
}
