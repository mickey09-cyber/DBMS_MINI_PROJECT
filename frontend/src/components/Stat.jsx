import StatCard from "./ui/StatCard";

export default function Stat({ label, value, sub, tone }) {
  // Convert old tones to new tones
  const toneMap = {
    high: "critical",
    medium: "warning",
    low: "safe",
  };
  return <StatCard label={label} value={value} sub={sub} tone={toneMap[tone] || tone || "normal"} />;
}
