import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const databaseUrl = new URL(env.databaseUrl);

export const pool = mysql.createPool({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || env.databasePort || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
  ssl: env.databaseSsl ? {} : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

function normalizeQuery(text) {
  return text.replace(/\$\d+/g, "?").replace(/\bTRUE\b/g, "TRUE").replace(/\bFALSE\b/g, "FALSE");
}

function mapResult(result) {
  if (Array.isArray(result)) {
    return {
      rows: result,
      rowCount: result.length
    };
  }

  return {
    rows: [],
    rowCount: result.affectedRows ?? 0,
    insertId: result.insertId ?? null
  };
}

export async function query(text, params = []) {
  const [result] = await pool.query(normalizeQuery(text), params);
  return mapResult(result);
}

export async function withTransaction(handler) {
  const connection = await pool.getConnection();
  const client = {
    async query(text, params = []) {
      const [result] = await connection.query(normalizeQuery(text), params);
      return mapResult(result);
    }
  };

  try {
    await connection.beginTransaction();
    const result = await handler(client);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
