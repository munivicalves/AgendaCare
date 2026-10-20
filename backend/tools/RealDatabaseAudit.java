import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;

class RealDatabaseAudit {
    static final Path BASELINE = Path.of("../.validation/database-baseline.properties");

    static String setting(Properties file, String name, String fallback) {
        String value = System.getenv(name);
        return value != null ? value : file.getProperty(name, fallback);
    }

    static boolean tableExists(Connection db, String table) throws SQLException {
        try (var query = db.prepareStatement("select to_regclass(?) is not null")) {
            query.setString(1, "public." + table);
            try (var rows = query.executeQuery()) {
                rows.next();
                return rows.getBoolean(1);
            }
        }
    }

    static String[] snapshot(Connection db, String table, String testEmail) throws Exception {
        var digest = MessageDigest.getInstance("SHA-256");
        long count = 0;
        if (tableExists(db, table)) {
            // Table identifiers are fixed by this tool, never supplied by external input.
            String sql = "select to_jsonb(t)::text from " + table + " t"
                    + (table.equals("usuarios") ? " where email <> ?" : "") + " order by id";
            try (var query = db.prepareStatement(sql)) {
                if (table.equals("usuarios"))
                    query.setString(1, testEmail);
                try (var rows = query.executeQuery()) {
                    while (rows.next()) {
                        digest.update(rows.getString(1).getBytes(StandardCharsets.UTF_8));
                        digest.update((byte) '\n');
                        count++;
                    }
                }
            }
        }
        return new String[] { Long.toString(count), HexFormat.of().formatHex(digest.digest()) };
    }

    public static void main(String[] args) throws Exception {
        var file = new Properties();
        if (Files.exists(Path.of(".env"))) {
            try (Reader reader = Files.newBufferedReader(Path.of(".env"), StandardCharsets.UTF_8)) {
                file.load(reader);
            }
        }
        String email = System.getenv("QA_AUTH_EMAIL");
        if (email == null || !email.endsWith("@example.invalid")) {
            throw new IllegalArgumentException("A unique fictional QA_AUTH_EMAIL is required.");
        }
        String url = "jdbc:postgresql://" + setting(file, "DB_HOST", "localhost") + ":"
                + setting(file, "DB_PORT", "5433") + "/" + setting(file, "DB_NAME", "agendacare");
        var credentials = new Properties();
        credentials.setProperty("user", setting(file, "DB_USERNAME", "postgres"));
        credentials.setProperty("password", setting(file, "DB_PASSWORD", ""));
        try (var db = DriverManager.getConnection(url, credentials)) {
            db.setAutoCommit(false);
            db.setReadOnly(true);
            try (var zone = db.createStatement()) {
                zone.execute("set local time zone 'UTC'");
            }
            boolean before = args.length == 1 && args[0].equals("before");
            var snapshot = new Properties();
            if (!before)
                try (Reader reader = Files.newBufferedReader(BASELINE)) {
                    snapshot.load(reader);
                }
            for (String table : List.of("pacientes", "agendamentos", "usuarios")) {
                String[] state = snapshot(db, table, email);
                if (before) {
                    snapshot.setProperty(table + ".count", state[0]);
                    snapshot.setProperty(table + ".digest", state[1]);
                } else if (!state[0].equals(snapshot.getProperty(table + ".count"))
                        || !state[1].equals(snapshot.getProperty(table + ".digest"))) {
                    throw new IllegalStateException("Existing rows changed: " + table);
                }
            }
            if (before) {
                Files.createDirectories(BASELINE.getParent());
                try (var writer = Files.newBufferedWriter(BASELINE)) {
                    snapshot.store(writer, "Counts and SHA-256 only; no row contents.");
                }
                System.out.println("READ_ONLY_BASELINE_OK");
            } else {
                try (var query = db.prepareStatement(
                        "select count(*), bool_and(senha_hash like '$2%' and created_at is not null) from usuarios where email = ?")) {
                    query.setString(1, email);
                    try (var rows = query.executeQuery()) {
                        rows.next();
                        if (rows.getInt(1) != 1 || !rows.getBoolean(2)) {
                            throw new IllegalStateException("Fictional user persistence or hash verification failed.");
                        }
                    }
                }
                System.out.println("EXISTING_ROWS_UNCHANGED_AND_FICTIONAL_USER_PERSISTED");
            }
            db.rollback();
        } catch (SQLException exception) {
            System.err.println("Database audit failed; SQLState=" + exception.getSQLState() + "; details suppressed.");
            System.exit(1);
        }
    }
}
