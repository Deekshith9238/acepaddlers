import { C } from "@/data/constants";
import { richTextHtml } from "@/lib/richText";

/** Public facts band. Array order follows the columns saved in the admin editor. */
export default function FactsTable({ rows }: { rows: [string, string, number?][] }) {
  if (!rows.length) return null;
  return (
    <dl
      className="m-0 flex flex-wrap w-full min-w-0 gap-x-8 gap-y-6"
      aria-label="Trip facts"
    >
      {rows.map(([label, value, width], index) => (
        <div key={index} className="min-w-0" style={{ flex: Number.isFinite(width) ? `0 0 min(100%, ${Math.max(140, Math.min(800, width!))}px)` : "1 1 192px" }}>
          <dt className="ace-richtext mb-1 text-xs uppercase tracking-wide" style={{ color: "#5a8ea8" }}
            dangerouslySetInnerHTML={{ __html: richTextHtml(label) }} />
          <dd className="ace-richtext m-0 break-words text-base font-semibold leading-relaxed" style={{ color: C.text }}
            dangerouslySetInnerHTML={{ __html: richTextHtml(value) }} />
        </div>
      ))}
    </dl>
  );
}
