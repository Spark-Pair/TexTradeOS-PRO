import { formatNumbers } from "../../utils";

const hasValue = (value) => value !== "" && value != null && Number.isFinite(Number(value));

const displayDiscount = (article) => {
  const raw = String(article?.discount || "").trim();
  if (raw) return raw;
  return Number(article?.discount_amount || 0) > 0
    ? formatNumbers(article.discount_amount, 2)
    : "-";
};

export default function InvoiceTable({ articles = [], totalAmount = 0 }) {
  const hasDzn = articles.some((article) => hasValue(article?.dzn));
  const hasPcs = articles.some((article) => hasValue(article?.pcs));
  const totalDzn = articles.reduce((sum, article) => sum + Number(article?.dzn || 0), 0);
  const totalPcs = articles.reduce((sum, article) => sum + Number(article?.pcs || 0), 0);

  return (
    <div className="invoice-line-items">
      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>Size</th>
              <th>Description</th>
              <th className="numeric">Dzn</th>
              <th className="numeric">PCs</th>
              <th className="numeric">Rate</th>
              <th className="numeric">Discount</th>
              <th className="numeric">Amount</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article, index) => (
              <tr key={article?._key || article?._id || index}>
                <td className="row-number">{String(index + 1).padStart(2, "0")}</td>
                <td>{article?.size || "-"}</td>
                <td className="description">{article?.description || "-"}</td>
                <td className="numeric">{formatNumbers(article?.dzn, 2)}</td>
                <td className="numeric">{formatNumbers(article?.pcs, 0)}</td>
                <td className="numeric">{formatNumbers(article?.rate, 2)}</td>
                <td className="numeric muted-value">{displayDiscount(article)}</td>
                <td className="numeric amount">{formatNumbers(article?.amount, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-summary">
        <div className="quantity-summary">
          {hasDzn && (
            <div>
              <span>Total Dozens</span>
              <strong>{formatNumbers(totalDzn, 2)}</strong>
            </div>
          )}
          {hasPcs && (
            <div>
              <span>Total Pieces</span>
              <strong>{formatNumbers(totalPcs, 0)}</strong>
            </div>
          )}
        </div>
        <div className="grand-total-panel">
          <span>Amount Due</span>
          <strong>{formatNumbers(totalAmount, 2)}</strong>
        </div>
      </div>
    </div>
  );
}
