import "dotenv/config";

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "127.0.0.1",
  databaseUrl: requireEnv(
    "DATABASE_URL",
    "postgresql://shubham:your_password@localhost:5432/mauryaschool"
  )
};
