import { Render } from "@measured/puck";
import { builderConfig } from "./config";

/** Lazy-loaded so Puck's runtime stays out of the public main bundle. */
export default function BuilderRender({ data }: { data: unknown }) {
  return <Render config={builderConfig} data={data as never} />;
}
