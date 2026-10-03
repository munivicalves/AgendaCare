package AgendaCare.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "agendamentos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "O paciente é obrigatório.")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @NotNull(message = "A data é obrigatória.")
    @Column(nullable = false)
    private LocalDate data;

    @NotNull(message = "O horário inicial é obrigatório.")
    @Column(nullable = false)
    private LocalTime horaInicio;

    @NotNull(message = "O horário final é obrigatório.")
    @Column(nullable = false)
    private LocalTime horaFim;

    @NotBlank(message = "O tipo do atendimento é obrigatório.")
    @Column(nullable = false)
    private String tipo;

    @NotNull(message = "O status é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusAgendamento status;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = StatusAgendamento.AGENDADO;
        }
    }
}