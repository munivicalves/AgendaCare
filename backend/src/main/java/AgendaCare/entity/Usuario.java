package AgendaCare.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "usuarios", uniqueConstraints = @UniqueConstraint(name = "uk_usuarios_email", columnNames = "email"))
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String nome;
    @Column(nullable = false, length = 254)
    private String email;
    @JsonIgnore
    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Usuario() { }
    public Usuario(String nome, String email, String senhaHash) {
        this.nome = nome.strip();
        this.email = email.strip().toLowerCase(Locale.ROOT);
        this.senhaHash = senhaHash;
    }
    @PrePersist
    void prePersist() { this.createdAt = Instant.now(); }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    @JsonIgnore
    public String getSenhaHash() { return senhaHash; }
    public Instant getCreatedAt() { return createdAt; }
}
