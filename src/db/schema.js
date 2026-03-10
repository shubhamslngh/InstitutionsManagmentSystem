import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaFilePath = path.resolve(__dirname, "../../sql/schema.sql");

export async function initializeDatabase() {
  const schemaSql = await fs.readFile(schemaFilePath, "utf8");
  await pool.query(schemaSql);
}
