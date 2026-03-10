import { initializeDatabase } from "../db/schema.js";
import { pool } from "../db/index.js";

async function main() {
  await initializeDatabase();
  console.log("Database schema initialized successfully.");
  await pool.end();
}

main().catch(async (error) => {
  console.error("Failed to initialize database.");
  console.error(error);
  await pool.end();
  process.exit(1);
});
