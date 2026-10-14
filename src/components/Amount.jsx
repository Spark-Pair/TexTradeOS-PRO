import { formatNumbers } from "../utils";

export default function Amount({
  value,
  decimals = 2,
  className = "",
  suffix = "",
}) {
  const isNegative = Number(value) < 0;

  return (
    <span className={`${className} ${isNegative ? "!text-red-600" : ""}`.trim()}>
      {formatNumbers(value, decimals)}
      {suffix}
    </span>
  );
}
