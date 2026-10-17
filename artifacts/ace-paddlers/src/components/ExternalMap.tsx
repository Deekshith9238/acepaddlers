import { useState, type IframeHTMLAttributes } from "react";

/** Contact with the map provider starts only after the visitor requests it. */
export default function ExternalMap(props: IframeHTMLAttributes<HTMLIFrameElement>) {
  const [loaded, setLoaded] = useState(false);
  return loaded ? <iframe {...props} /> : <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-6 text-center" style={props.style}>
    <p className="text-sm">Loading this map connects to an external map provider, which may use cookies.</p>
    <button type="button" onClick={() => setLoaded(true)} className="rounded-full border px-5 py-2 font-semibold">Load interactive map</button>
  </div>;
}
