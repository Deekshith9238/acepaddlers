import { Render } from "@measured/puck";
import { builderConfig } from "./config";

/** Lazy-loaded so Puck's runtime stays out of the public main bundle. */
export default function BuilderRender({ data }: { data: unknown }) {
  return (
    <div className="ap-builder">
      <Render config={builderConfig} data={data as never} />
    </div>
  );
}
