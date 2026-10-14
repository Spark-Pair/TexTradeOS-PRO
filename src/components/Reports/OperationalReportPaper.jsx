import Amount from "../Amount";

const money = (value) => <Amount value={value} decimals={2} />;
const date = (value) =>
  value && value !== "-"
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : "-";

export default function OperationalReportPaper({ data, business, meta }) {
  const stock = data.type === "stock";
  const rows = data.rows || [];
  const total = rows.reduce(
    (sum, row) => sum + Number(meta.amount(row) || 0),
    0,
  );
  const dates = rows
    .map((row) => meta.date(row))
    .filter(Boolean)
    .map((value) => String(value).slice(0, 10))
    .sort();
  const from = data.dateFrom || dates[0] || "-";
  const to = data.dateTo || dates.at(-1) || "-";
  const generated = date(new Date().toISOString().slice(0, 10));
  const businessDetails = [
    business.phone && `Tel: ${business.phone}`,
    business.address,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <>
      <style>{PAPER_CSS}</style>
      <article className="report-paper">
        <header className="report-paper-head">
          <div className="report-paper-brand">
            <h1>{business.name || "TexTradeOS PRO"}</h1>
            {business.urdu_name && (
              <p className="report-paper-urdu" dir="rtl" lang="ur">
                {business.urdu_name}
              </p>
            )}
            {businessDetails && (
              <p className="report-paper-contact">{businessDetails}</p>
            )}
          </div>
          <div className="report-paper-meta">
            <h2>{meta.title}</h2>
            <div>
              <b>GENERATED</b>
              <strong>{generated}</strong>
            </div>
            <div>
              <b>PERIOD</b>
              <strong>
                {stock ? "Current stock" : `${date(from)} — ${date(to)}`}
              </strong>
            </div>
          </div>
        </header>

        <section className="report-paper-summary">
          <span>REPORT SUMMARY</span>
          <div>
            <p>
              <b>{rows.length.toLocaleString()}</b>
              <small>{stock ? "Articles" : "Records"}</small>
            </p>
            {stock && (
              <p>
                <b>
                  {rows
                    .reduce((sum, row) => sum + Number(row.stock_pcs || 0), 0)
                    .toLocaleString()}
                </b>
                <small>Stock pieces</small>
              </p>
            )}
            <p>
              <b>{money(total)}</b>
              <small>{stock ? "Stock cost value" : "Grand total"}</small>
            </p>
          </div>
        </section>

        <table className="report-paper-ledger">
          <thead>
            <tr>
              {stock ? (
                <>
                  <th>Article</th>
                  <th>Description</th>
                  <th>Supplier</th>
                  <th>Stock pcs</th>
                  <th>Purchase rate</th>
                  <th>Sale rate</th>
                  <th>Stock cost</th>
                </>
              ) : (
                <>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Name / Category</th>
                  <th>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={
                    row._id || row.id || `${meta.ref(row) || "record"}-${index}`
                  }
                >
                  {stock ? (
                    <>
                      <td>
                        <b>{row.article_no || "-"}</b>
                      </td>
                      <td>{row.description || "-"}</td>
                      <td>{meta.party(row)}</td>
                      <td className="report-paper-number">
                        {Number(row.stock_pcs || 0).toLocaleString()}
                      </td>
                      <td className="report-paper-number">
                        {money(row.purchase_rate)}
                      </td>
                      <td className="report-paper-number">
                        {money(row.sale_rate)}
                      </td>
                      <td className="report-paper-number">
                        <b>{money(meta.amount(row))}</b>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{date(meta.date(row))}</td>
                      <td>
                        <b>{meta.ref(row) || "-"}</b>
                      </td>
                      <td>{meta.party(row)}</td>
                      <td className="report-paper-number">
                        <b>{money(meta.amount(row))}</b>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={stock ? 7 : 4} className="report-paper-empty">
                  No records found for this period.
                </td>
              </tr>
            )}
          </tbody>
          {!stock && rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="3">Grand Total</td>
                <td className="report-paper-number">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <footer className="report-paper-footer">
          <div>
            <b>TexTradeOS PRO by SparkPair</b>
            <span>Computer generated report</span>
          </div>
          <div>
            <b>Prepared on {generated}</b>
            <span>Please verify the entries before taking action.</span>
          </div>
        </footer>
      </article>
    </>
  );
}

const PAPER_CSS = `
.report-paper{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto;padding:7mm;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:1.4;font-variant-numeric:tabular-nums}
.report-paper-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:1.4px solid #111827;padding:0 5px 11px}
.report-paper-brand{min-width:0}.report-paper-brand h1{margin:0;font-size:25px;font-weight:700;letter-spacing:-.35px;line-height:1.1}.report-paper-urdu{margin:2px 0 0;font-size:15px;font-weight:600}.report-paper-contact{margin:5px 0 0;color:#475569;font-size:9.5px}
.report-paper-meta{width:245px;flex:none}.report-paper-meta h2{margin:0 0 7px;border-bottom:1px solid #111827;padding:0 0 5px;text-align:right;font-size:13px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}.report-paper-meta>div{display:grid;grid-template-columns:90px 1fr;gap:8px;padding:2px 0;font-size:9.5px}.report-paper-meta b{font-size:8.7px;font-weight:600;letter-spacing:.04em}.report-paper-meta strong{text-align:right;font-size:9.5px;font-weight:600}
.report-paper-summary{border-bottom:1.2px solid #111827;padding:10px 5px}.report-paper-summary>span{display:block;color:#475569;font-size:8.8px;font-weight:700;letter-spacing:.08em}.report-paper-summary>div{display:flex;flex-wrap:wrap;gap:36px;margin-top:5px}.report-paper-summary p{display:grid;gap:1px;margin:0}.report-paper-summary p b{font-size:14px;font-weight:700}.report-paper-summary p small{color:#475569;font-size:8.8px}
.report-paper-ledger{width:100%;margin-top:9px;border:1px solid #111827;border-radius:7px;border-spacing:0;border-collapse:separate;overflow:hidden;table-layout:fixed}.report-paper-ledger th{padding:7px 6px;background:#dfe4ea;border-bottom:1px solid #111827;text-align:left;font-size:8.8px;font-weight:700;text-transform:uppercase;letter-spacing:.02em}.report-paper-ledger th:last-child,.report-paper-ledger th:nth-last-child(2),.report-paper-number{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.report-paper-ledger td{padding:6.5px 6px;border-bottom:1px solid #aeb7c3;vertical-align:top;font-size:9.7px}.report-paper-ledger tbody tr:last-child td{border-bottom:0}.report-paper-ledger td b{font-weight:600}.report-paper-ledger tfoot td{border-top:1px solid #111827;border-bottom:0;background:#dfe4ea;padding:7px 6px;font-size:10px;font-weight:700}.report-paper-ledger .report-paper-empty{text-align:center;padding:30px;color:#64748b}.report-paper-footer{display:flex;justify-content:space-between;gap:20px;margin-top:12px;padding:8px 5px 0;border-top:1px solid #111827;font-size:8.8px}.report-paper-footer>div{display:flex;flex-direction:column;gap:2px}.report-paper-footer>div:last-child{text-align:right}.report-paper-footer b{font-size:9px;font-weight:600}.report-paper-footer span{color:#475569;font-size:8.5px}
@media print{.report-paper{width:100%;min-height:0;margin:0;padding:5mm}.report-paper-ledger thead{display:table-header-group}.report-paper-ledger tr{break-inside:avoid;page-break-inside:avoid}.report-paper-head,.report-paper-summary,.report-paper-footer{break-inside:avoid;page-break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
