import { query } from "../db/index.js";

export async function getDashboardSnapshot(filters = {}) {
  const institutionId = filters.institutionId || null;
  const [
    institutionsResult,
    studentsResult,
    invoicesResult,
    paymentsResult,
    outstandingResult,
    recentInvoicesResult
  ] = await Promise.all([
    query(
      institutionId
        ? "SELECT COUNT(*) AS count FROM institutions WHERE id = $1"
        : "SELECT COUNT(*) AS count FROM institutions",
      institutionId ? [institutionId] : []
    ),
    query(
      institutionId
        ? "SELECT COUNT(*) AS count FROM students WHERE institution_id = $1"
        : "SELECT COUNT(*) AS count FROM students",
      institutionId ? [institutionId] : []
    ),
    query(
      institutionId
        ? "SELECT COUNT(*) AS count FROM fee_invoices WHERE institution_id = $1"
        : "SELECT COUNT(*) AS count FROM fee_invoices",
      institutionId ? [institutionId] : []
    ),
    query(
      institutionId
        ? "SELECT COALESCE(SUM(amount), 0) AS total FROM fee_payments WHERE institution_id = $1"
        : "SELECT COALESCE(SUM(amount), 0) AS total FROM fee_payments",
      institutionId ? [institutionId] : []
    ),
    query(
      `
        SELECT COALESCE(SUM(balance), 0) AS total
        FROM (
          SELECT fi.net_amount - COALESCE(SUM(fp.amount), 0) AS balance
          FROM fee_invoices fi
          LEFT JOIN fee_payments fp ON fp.fee_invoice_id = fi.id
          ${institutionId ? "WHERE fi.institution_id = $1" : ""}
          GROUP BY fi.id
        ) balances
      `,
      institutionId ? [institutionId] : []
    ),
    query(
      `
        SELECT
          fi.id,
          fi.title,
          fi.net_amount AS net_amount,
          fi.status,
          s.first_name,
          s.last_name,
          i.name AS institution_name
        FROM fee_invoices fi
        JOIN students s ON s.id = fi.student_id
        JOIN institutions i ON i.id = fi.institution_id
        ${institutionId ? "WHERE fi.institution_id = $1" : ""}
        ORDER BY fi.created_at DESC
        LIMIT 5
      `,
      institutionId ? [institutionId] : []
    )
  ]);

  return {
    totals: {
      institutions: Number(institutionsResult.rows[0].count),
      students: Number(studentsResult.rows[0].count),
      invoices: Number(invoicesResult.rows[0].count),
      collections: Number(paymentsResult.rows[0].total),
      outstanding: Number(outstandingResult.rows[0].total)
    },
    recentInvoices: recentInvoicesResult.rows
  };
}
