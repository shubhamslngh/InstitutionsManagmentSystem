import { pool } from "./index.js";
import { schemaSql } from "./schemaSql.js";

export async function initializeDatabase() {
  await pool.query(schemaSql);
}
