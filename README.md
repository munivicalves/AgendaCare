# AgendaCare 🩺

**Sistema web de gestão de pacientes e agendamentos**, desenvolvido com Angular, Java, Spring Boot e PostgreSQL. O projeto reúne agenda mensal e semanal, histórico de pacientes, acompanhamento de consultas, indicadores gerenciais e autenticação de usuários.

> **Status:** projeto de portfólio em desenvolvimento. **Use somente dados fictícios:** nesta versão, todos os usuários autenticados compartilham os mesmos registros de pacientes e agendamentos.

## Funcionalidades

- **Dashboard:** indicadores e gráficos de atendimentos, distribuição por status, próximos atendimentos e filtros por período.
- **Pacientes:** cadastro, pesquisa por nome, edição, exclusão conforme regras de negócio e histórico de consultas.
- **Agenda:** calendários mensal e semanal, navegação por datas e visualização das consultas do dia.
- **Agendamentos:** criação e edição com horários de início e fim, tipo de atendimento, observações e detecção de conflitos.
- **Acompanhamento:** confirmação, conclusão, cancelamento e registro de falta, com regras validadas no backend.
- **Autenticação:** cadastro de usuários, login, logout local, proteção de rotas e endpoints.
- **Interface responsiva:** navegação e formulários adaptados para desktop e dispositivos móveis.

## Tecnologias

| Camada       | Tecnologias e versões verificadas                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Frontend     | Angular, Angular Material e CDK **22.2.1**; TypeScript **6.0.3**; Tailwind CSS **4.3.3**; RxJS **7.8.2**    |
| Backend      | Java **17** (alvo de compilação); Spring Boot **4.1.1**; Spring Data JPA; Spring Security **7.1.1**; Lombok |
| Persistência | PostgreSQL e Spring Data JPA/Hibernate                                                                      |
| Autenticação | JWT (HS256) e BCrypt                                                                                        |
| Testes       | JUnit Jupiter, MockMvc, AssertJ, H2, Vitest e jsdom                                                         |
| Ferramentas  | Maven Wrapper, Node.js, npm, Git e GitHub                                                                   |

As versões do frontend foram verificadas no lockfile. A versão do servidor PostgreSQL não está fixada no repositório. O Dashboard calcula seus indicadores no Angular, sem endpoint `/api/dashboard`.

## Estrutura do projeto

```text
AgendaCare/
├── backend/
│   ├── src/main/java/AgendaCare/
│   │   ├── config/       # Segurança, JWT e CORS
│   │   ├── controller/   # Endpoints REST
│   │   ├── dto/          # Contratos de entrada e saída
│   │   ├── entity/       # Entidades JPA
│   │   ├── exception/    # Tratamento de erros
│   │   ├── repository/   # Persistência
│   │   ├── service/      # Regras de negócio
│   │   └── validation/   # Validações
│   ├── src/test/         # Testes automatizados
│   ├── tools/            # Utilitários de validação
│   └── pom.xml
├── frontend/
│   ├── src/app/          # Componentes, páginas, rotas e serviços
│   ├── tools/            # Roteiros de verificação
│   └── package.json
└── README.md
```

O backend organiza as responsabilidades em controllers, services, repositories e DTOs. O frontend utiliza componentes Angular standalone, Signals, formulários reativos, guards e interceptor HTTP.

## Executar localmente

### Pré-requisitos

- JDK compatível com o alvo Java 17 (o projeto também foi validado com JDK 21).
- Node.js **22.22.3+** na linha 22 ou **24.15.0+** na linha 24, com npm.
- PostgreSQL disponível e banco `agendacare` criado.
- Acesso às dependências Maven e npm na primeira instalação.

Os comandos a seguir usam **Windows PowerShell**. No Windows, `npm.cmd` evita possíveis restrições de execução do `npm.ps1`.

### 1. Configurar o backend

Crie o arquivo local `backend/.env` (não o versione) ou configure as variáveis de ambiente do processo:

| Variável       | Padrão / finalidade                     |
| -------------- | --------------------------------------- |
| `DB_HOST`      | `localhost`                             |
| `DB_PORT`      | `5433`                                  |
| `DB_NAME`      | `agendacare`                            |
| `DB_USERNAME`  | `postgres`                              |
| `DB_PASSWORD`  | **Obrigatória:** senha do PostgreSQL    |
| `JWT_SECRET`   | **Obrigatória:** chave aleatória Base64 |
| `JWT_ISSUER`   | `agendacare`                            |
| `JWT_AUDIENCE` | `agendacare-api`                        |
| `JWT_TTL`      | `15m` (entre `1m` e `1h`)               |

O backend configura a importação opcional de `.env` por meio de `spring.config.import=optional:file:.env[.properties]`. **Inicie o Spring Boot a partir da pasta `backend/`**, pois esse caminho é relativo ao diretório de execução. O arquivo utiliza linhas `CHAVE=valor`, sem `export` e sem aspas de shell.

`JWT_SECRET` deve conter **pelo menos 32 bytes depois da decodificação Base64**. Para gerar uma chave na sessão atual do PowerShell, sem exibi-la:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
```

Configure também `DB_PASSWORD` no `.env` ou no ambiente. Não publique senhas, tokens nem o arquivo `.env`.

> O ambiente de desenvolvimento utiliza `spring.jpa.hibernate.ddl-auto=update`. Essa configuração não substitui migrações versionadas para produção.

### 2. Iniciar o backend

Na raiz do repositório:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080`.

### 3. Iniciar o frontend

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

Interface: **http://localhost:4200**. Cadastre um usuário fictício e faça login.

A API está configurada em `http://localhost:8080/api`, e o CORS permite `http://localhost:4200`. Se alterar host ou porta, revise o CORS do backend, `frontend/src/app/core/auth/auth.config.ts` e as URLs dos serviços de pacientes e agendamentos.

## Principais endpoints

Os endpoints de autenticação são públicos; os demais exigem `Authorization: Bearer <token>`.

| Método                 | Endpoint                                  | Finalidade                              |
| ---------------------- | ----------------------------------------- | --------------------------------------- |
| `POST`                 | `/api/auth/register`                      | Cadastro de usuário                     |
| `POST`                 | `/api/auth/login`                         | Login e emissão do JWT                  |
| `GET`, `POST`          | `/api/pacientes`                          | Listar e cadastrar pacientes            |
| `GET`, `PUT`, `DELETE` | `/api/pacientes/{id}`                     | Consultar, editar e excluir paciente    |
| `GET`                  | `/api/pacientes/buscar?nome=...`          | Pesquisar pacientes                     |
| `GET`, `POST`          | `/api/agendamentos`                       | Listar e criar agendamentos             |
| `GET`, `PUT`, `DELETE` | `/api/agendamentos/{id}`                  | Consultar, editar e excluir agendamento |
| `GET`                  | `/api/agendamentos/data/{data}`           | Listar por data (`AAAA-MM-DD`)          |
| `GET`                  | `/api/agendamentos/paciente/{pacienteId}` | Histórico do paciente                   |
| `PATCH`                | `/api/agendamentos/{id}/confirmar`        | Confirmar consulta                      |
| `PATCH`                | `/api/agendamentos/{id}/concluir`         | Concluir consulta                       |
| `PATCH`                | `/api/agendamentos/{id}/falta`            | Registrar falta                         |
| `PATCH`                | `/api/agendamentos/{id}/cancelar`         | Cancelar consulta                       |

Não há endpoint de logout ou de renovação de token. A interface oferece cancelamento; a exclusão definitiva de agendamentos está disponível na API.

## Regras de negócio

- Novos agendamentos começam com status **AGENDADO**, e o horário final deve ser posterior ao inicial.
- Consultas não canceladas não podem ter horários sobrepostos na mesma data. Horários consecutivos são permitidos.
- **AGENDADO → CONFIRMADO** por ação de confirmação.
- **CONFIRMADO → CONCLUIDO** somente após o término da consulta.
- **AGENDADO/CONFIRMADO → FALTOU** somente após o término da consulta.
- **AGENDADO/CONFIRMADO → CANCELADO** por ação de cancelamento.
- A edição é restrita a consultas agendadas ou confirmadas; mudanças de status utilizam endpoints específicos.
- Não é possível excluir um paciente com qualquer agendamento vinculado, inclusive cancelado.

## Autenticação e segurança

- **Cadastro:** nome de 2 a 120 caracteres, e-mail válido e único e senha de **8 a 64 caracteres**, contendo maiúscula, minúscula, número e símbolo, respeitando também **72 bytes UTF-8**. A confirmação de senha ocorre somente no formulário. Após cadastrar, é necessário fazer login.
- **Senhas:** armazenadas com BCrypt (custo 12); hashes não são retornados pela API.
- **JWT:** assinatura HS256; o backend valida assinatura, emissor, audiência e expiração. Duração padrão de **15 minutos**.
- **Sessão Angular:** token e dados de autenticação são mantidos **somente em memória**. Recarregar a página ou abrir outra aba exige novo login. O interceptor restringe o envio automático do Bearer token à API configurada; guards protegem a navegação e o Spring Security protege os endpoints.

### Limitações da versão demonstrativa

- O cadastro é público e **todos os usuários autenticados compartilham os registros**. Não há isolamento por profissional, clínica ou perfil de permissão.
- Manter o JWT em memória reduz sua persistência, mas **não elimina riscos de XSS**.
- O logout é local e não revoga imediatamente tokens emitidos; um token copiado pode continuar válido até expirar.
- Não há refresh token nem recuperação de senha.
- Uma implantação real exige HTTPS, controle de acesso por usuário, gestão de segredos, revisão de privacidade e migrações de banco.

**Não utilize dados reais de pacientes nesta versão.**

## Testes e validação

### Backend

Na pasta `backend/`:

```powershell
.\mvnw.cmd clean verify
```

Os testes utilizam JUnit Jupiter, MockMvc, AssertJ e **H2 em memória**, com configuração isolada do PostgreSQL existente.

### Frontend

Na pasta `frontend/`:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Os testes utilizam Vitest e jsdom. Há também roteiros de interface em `frontend/tools/` (`qa-auth.cjs`, `qa-pacientes.cjs` e `qa-agenda.cjs`) que utilizam respostas simuladas da API.

### Integração real

O roteiro `frontend/tools/qa-auth-real.cjs` verifica Angular → Spring Boot → PostgreSQL **sem mocks**. Exige builds prévios, PostgreSQL configurado, Java, Node.js, navegador Chrome/Edge e portas **8080** e **4200** livres. **Ele cadastra usuários fictícios que permanecem no banco**; leia o roteiro antes de executá-lo.

### Resultados registrados em 19/10/2026

| Verificação                    | Resultado                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Backend (`clean verify`)       | **41 testes aprovados**                                                                    |
| Frontend                       | **125 testes aprovados**                                                                   |
| Build de produção Angular      | **Concluído**                                                                              |
| Integração real com PostgreSQL | **18 verificações aprovadas em execução anterior**; não repetida após a alteração de senha |

Os testes atualizados verificaram senhas válidas de 8 e 64 caracteres, rejeição de 7 e 65 caracteres e limite de 72 bytes UTF-8. Os resultados acima representam execuções documentadas, não garantia de sucesso em outros ambientes.

## Próximos aprimoramentos

- Isolamento de dados e permissões por profissional ou clínica.
- Recuperação de senha e gerenciamento de contas.
- Renovação e revogação de sessões.
- Migrações versionadas e preparação para deploy seguro.

## Autoria

Desenvolvido por **Munique Alves** como projeto de estudos e portfólio Full Stack.

- [GitHub](https://github.com/munivicalves/AgendaCare)
- [LinkedIn](https://linkedin.com/in/munique-alves)

---

_Projeto demonstrativo: utilize exclusivamente dados fictícios._
