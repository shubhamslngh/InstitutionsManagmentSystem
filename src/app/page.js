import AppShell from "../components/AppShell.js";
import Link from "next/link";
import { ensureSchema } from "../db/ensureSchema.js";
import { getDashboardSnapshot } from "../services/dashboardService.js";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  try {
    await ensureSchema();
    return await getDashboardSnapshot();
  } catch (error) {
    return {
      error: error.message,
      totals: {
        institutions: 0,
        students: 0,
        invoices: 0,
        collections: 0,
        outstanding: 0
      },
      recentInvoices: []
    };
  }
}

export default async function HomePage() {
  const snapshot = await loadDashboard();
  const collectionRate =
    snapshot.totals.collections + snapshot.totals.outstanding > 0
      ? Math.round(
          (snapshot.totals.collections /
            (snapshot.totals.collections + snapshot.totals.outstanding)) *
            100
        )
      : 0;

  return (
    <AppShell
      description="One Next.js workspace for institution operations, admissions, fee ledgers, and collections."
      eyebrow="Overview"
      title="School and college operations in one control room"
    >
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Operations</span>
            <h2>School and college operations in one control room.</h2>
            <p>
              Track campuses, admissions, fee ledgers, and collections from a single dashboard
              built for day-to-day administration rather than separate tools.
            </p>
            <div className="nav">
              <Link className="button button-primary" href="/institutions">
                Manage Institutions
              </Link>
              <Link className="button" href="/classes">
                Open Class Desk
              </Link>
              <Link className="button" href="/students">
                Open Student Desk
              </Link>
              <Link className="button" href="/fees">
                Open Fee Desk
              </Link>
            </div>
            {snapshot.error ? (
              <div className="notice">
                Database is not connected yet. Add `.env`, run `npm run db:init`, then reload.
              </div>
            ) : null}
          </div>

          <div className="metrics">
            <div className="metric">
              <span>Institutions</span>
              <strong>{snapshot.totals.institutions}</strong>
            </div>
            <div className="metric">
              <span>Students</span>
              <strong>{snapshot.totals.students}</strong>
            </div>
            <div className="metric">
              <span>Invoices</span>
              <strong>{snapshot.totals.invoices}</strong>
            </div>
            <div className="metric">
              <span>Collections</span>
              <strong>{snapshot.totals.collections}</strong>
            </div>
            <div className="metric">
              <span>Outstanding</span>
              <strong>{snapshot.totals.outstanding}</strong>
            </div>
            <div className="metric">
              <span>Collection Rate</span>
              <strong>{collectionRate}%</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="page-grid">
        <article className="panel">
          <div className="page-head">
            <span className="eyebrow">Collections</span>
            <h2>Recent invoice movement</h2>
            <p>Recent fee records across all institutions.</p>
          </div>
          {snapshot.recentInvoices.length === 0 ? (
            <p className="empty">No invoice records yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Institution</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.first_name} {invoice.last_name}</td>
                    <td>{invoice.institution_name}</td>
                    <td>{invoice.title}</td>
                    <td><span className="badge">{invoice.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <aside className="panel">
          <div className="page-head">
            <span className="eyebrow">Workspace</span>
            <h2>Management areas</h2>
          </div>
          <div className="stack-sm">
            <Link className="dashboard-link" href="/institutions">
              <strong>Institutions</strong>
              <span>Create and review schools and colleges.</span>
            </Link>
            <Link className="dashboard-link" href="/students">
              <strong>Students</strong>
              <span>Add admissions and maintain student records.</span>
            </Link>
            <Link className="dashboard-link" href="/classes">
              <strong>Classes</strong>
              <span>Organize class groups and attach fee plans to them.</span>
            </Link>
            <Link className="dashboard-link" href="/fees">
              <strong>Fees</strong>
              <span>Manage structures, invoices, and collections.</span>
            </Link>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
