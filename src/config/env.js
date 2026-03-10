import "dotenv/config";

function requireEnv(name, fallback) {
  const rawValue = process.env[name];
  const value = rawValue === undefined || rawValue === null || rawValue === "" ? fallback : rawValue;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const provider = process.env.DB_PROVIDER || "postgres";
  if (provider !== "postgres") {
    throw new Error(
      `Unsupported DB_PROVIDER "${provider}". This app currently supports PostgreSQL only.`
    );
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !name || !user || !password) {
    return "postgresql://shubham:your_password@localhost:5432/mauryaschool";
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  databaseProvider: process.env.DB_PROVIDER || "postgres",
  databaseHost: process.env.DB_HOST || "",
  databasePort: Number(process.env.DB_PORT || 5432),
  databaseName: process.env.DB_NAME || "",
  databaseUser: process.env.DB_USER || "",
  databasePassword: process.env.DB_PASSWORD || "",
  databaseSsl: getBoolean(process.env.DB_SSL, false),
  databaseUrl: requireEnv("DATABASE_URL", buildDatabaseUrl())
};
