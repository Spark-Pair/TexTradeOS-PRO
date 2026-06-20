import { formatNumbers } from "../../utils";

const grossForArticle = (article) => {
  const explicitGross = Number(article?.gross_amount || 0);

  if (Number.isFinite(explicitGross) && explicitGross > 0) {
    return explicitGross;
  }

  return Number(article?.pcs || 0) * Number(article?.rate || 0);
};

const displayDiscount = (article) => {
  const raw = String(article?.discount || "").trim();

  if (raw) return raw;

  return Number(article?.discount_amount || 0) > 0
    ? formatNumbers(article.discount_amount, 1)
    : "-";
};

export default function InvoiceTable({
  articles = [],
  invoice = null,
  totalAmount = 0,
}) {
  const totalDzn = articles.reduce(
    (sum, article) => sum + Number(article?.dzn || 0),
    0
  );

  const totalPcs = articles.reduce(
    (sum, article) => sum + Number(article?.pcs || 0),
    0
  );

  const lineGrossAmount = articles.reduce(
    (sum, article) => sum + grossForArticle(article),
    0
  );

  const lineFinalAmount = articles.reduce(
    (sum, article) => sum + Number(article?.amount || 0),
    0
  );

  const grossAmount = Number(invoice?.gross_amount || lineGrossAmount);
  const percentDiscountAmount = Number(invoice?.percent_discount_amount ?? 0);
  const rupeeDiscountAmount = Number(invoice?.rupee_discount_amount ?? 0);

  const totalDiscountAmount = Number(
    invoice?.total_discount_amount ??
      percentDiscountAmount + rupeeDiscountAmount
  );

  const netAmount = Number(
    invoice?.net_amount ?? Math.max(0, grossAmount - totalDiscountAmount)
  );

  const salesReturnAmount = Number(invoice?.sales_return_amount ?? 0);
  const receivedAmount = Number(invoice?.received_amount ?? 0);
  const payableAmount = Number(invoice?.total_amount ?? totalAmount);

  const balanceAmount = Number(
    invoice?.balance_amount ?? Math.max(0, payableAmount - receivedAmount)
  );

  const returnAmount = Number(
    invoice?.return_amount ?? Math.max(0, receivedAmount - payableAmount)
  );

  return (
    <div className="invoice-line-items">
      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>

          <thead>
            <tr>
              <th>NO</th>
              <th className="center">SIZE</th>
              <th>
                <span className="screen-label">DESCRIPTION</span>
                <span className="print-label">DESC</span>
              </th>
              <th className="numeric">DZN</th>
              <th className="numeric">PCS</th>
              <th className="numeric">RATE</th>
              <th className="numeric">DISC</th>
              <th className="numeric">GROSS</th>
              <th className="numeric">
                <span className="screen-label">AMOUNT</span>
                <span className="print-label">AMT</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {articles.map((article, index) => (
              <tr key={article?._key || article?._id || index}>
                <td className="row-number">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="center">{article?.size || "-"}</td>
                <td className="description">{article?.description || "-"}</td>
                <td className="numeric tabular">
                  {formatNumbers(article?.dzn, 1)}
                </td>
                <td className="numeric tabular">
                  {formatNumbers(article?.pcs, 0)}
                </td>
                <td className="numeric">{formatNumbers(article?.rate, 1)}</td>
                <td className="numeric muted-value">
                  {displayDiscount(article)}
                </td>
                <td className="numeric muted-value">
                  {formatNumbers(grossForArticle(article), 1)}
                </td>
                <td className="numeric amount">
                  {formatNumbers(article?.amount, 1)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={3}>Totals</td>
              <td className="numeric tabular">{formatNumbers(totalDzn, 1)}</td>
              <td className="numeric tabular">{formatNumbers(totalPcs, 0)}</td>
              <td />
              <td />
              <td className="numeric">{formatNumbers(lineGrossAmount, 1)}</td>
              <td className="numeric amount">
                {formatNumbers(lineFinalAmount, 1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="invoice-summary">
        <div className="invoice-totals-panel">
          <div className="summary-row">
            <span>Gross Amount</span>
            <strong>{formatNumbers(grossAmount, 1)}</strong>
          </div>

          <div className="summary-row">
            <span>Percent Discount</span>
            <strong>-{formatNumbers(percentDiscountAmount, 1)}</strong>
          </div>

          <div className="summary-row">
            <span>Rs Discount</span>
            <strong>-{formatNumbers(rupeeDiscountAmount, 1)}</strong>
          </div>

          <div className="summary-row invoice-emphasis-row">
            <span>Net Amount</span>
            <strong>{formatNumbers(netAmount, 1)}</strong>
          </div>

          <div className="summary-row">
            <span>Sales Return</span>
            <strong>-{formatNumbers(salesReturnAmount, 1)}</strong>
          </div>

          <div className="summary-row">
            <span>Received</span>
            <strong>{formatNumbers(receivedAmount, 1)}</strong>
          </div>

          <div className="summary-row invoice-total-row">
            <span>Payable</span>
            <strong>{formatNumbers(payableAmount, 1)}</strong>
          </div>

          <div className="summary-row invoice-total-row">
            <span>{returnAmount > 0 ? "Return To Customer" : "Balance"}</span>
            <strong>
              {formatNumbers(returnAmount > 0 ? returnAmount : balanceAmount, 1)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}