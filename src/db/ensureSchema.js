import { initializeDatabase } from "./schema.js";

let schemaPromise;

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = initializeDatabase().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }

  return schemaPromise;
}
