import type { ColumnKind } from "@/types/report";

const HEIGHT = 160;

const shortLabel = (label: string) => {
  const [year, month, day] = label.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return day ? `${Number(day)} ${MONTHS[Number(month) - 1]}` : `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
};

export const formatValue = (value: number, kind: ColumnKind) =>
  kind === "money"
    ? `₹${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : kind === "percent"
      ? `${value}%`
      : value.toLocaleString("en-IN");

/** A plain SVG bar chart: one bar per period, the value in the bar's title. */
const BarChart = ({ series, title }: { series: { label: string; value: number; kind: ColumnKind }[]; title: string }) => {
  if (!series.length) return null;
  const max = Math.max(...series.map((point) => point.value), series[0].kind === "percent" ? 100 : 1);
  const step = Math.max(1, Math.ceil(series.length / 8));
  const width = 100 / series.length;

  return (
    <figure className="rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm">
      <figcaption className="text-sm font-semibold text-tertiary">{title}</figcaption>
      <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="mt-4 h-40 w-full" role="img" aria-label={title}>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line key={fraction} x1="0" x2="100" y1={HEIGHT * fraction} y2={HEIGHT * fraction} stroke="currentColor" className="text-tertiary/8" strokeWidth="0.3" />
        ))}
        {series.map((point, index) => {
          const height = (point.value / max) * (HEIGHT - 4);
          return (
            <rect
              key={point.label}
              x={index * width + width * 0.15}
              y={HEIGHT - height}
              width={width * 0.7}
              height={height}
              rx="0.6"
              className="fill-primary/80 transition-opacity hover:fill-primary"
            >
              <title>{`${shortLabel(point.label)}: ${formatValue(point.value, point.kind)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-tertiary/50">
        {series
          .filter((_, index) => index % step === 0)
          .map((point) => (
            <span key={point.label}>{shortLabel(point.label)}</span>
          ))}
      </div>
    </figure>
  );
};

export default BarChart;
