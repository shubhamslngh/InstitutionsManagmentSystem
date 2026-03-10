import { query } from "../db/index.js";

export async function getDashboardSnapshot() {
  const [
    institutionsResult,
    studentsResult,
    invoicesResult,
    paymentsResult,
    outstandingResult,
    recentInvoicesResult
  ] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM institutions"),
    query("SELECT COUNT(*)::int AS count FROM students"),
    query("SELECT COUNT(*)::int AS count FROM fee_invoices"),
    query("SELECT COALESCE(SUM(amount), 0)::float AS total FROM fee_payments"),
    query(
      `
        SELECT COALESCE(SUM(balance), 0)::float AS total
        FROM (
          SELECT fi.net_amount - COALESCE(SUM(fp.amount), 0) AS balance
          FROM fee_invoices fi
          LEFT JOIN fee_payments fp ON fp.fee_invoice_id = fi.id
          GROUP BY fi.id
        ) balances
      `
    ),
    query(
      `
        SELECT
          fi.id,
          fi.title,
          fi.net_amount::float AS net_amount,
          fi.status,
          s.first_name,
          s.last_name,
          i.name AS institution_name
        FROM fee_invoices fi
        JOIN students s ON s.id = fi.student_id
        JOIN institutions i ON i.id = fi.institution_id
        ORDER BY fi.created_at DESC
        LIMIT 5
      `
    )
  ]);

  return {
    totals: {
      institutions: institutionsResult.rows[0].count,
      students: studentsResult.rows[0].count,
      invoices: invoicesResult.rows[0].count,
      collections: paymentsResult.rows[0].total,
      outstanding: outstandingResult.rows[0].total
    },
    recentInvoices: recentInvoicesResult.rows
  };
}
