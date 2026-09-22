import { useCallback, useEffect, useRef, useState } from "react";
import { useListAdminTours, useUpdateTour, type Tour } from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Read one tour and save a *slice* of it.
 *
 * The tabs each own a handful of columns, so they PATCH only what they own —
 * two people editing Location and Prices at the same time must not overwrite
 * each other. The server accepts a partial body; the generated client type
 * still describes the whole tour, hence the cast at the call.
 */
export function useTourSection(tourId: string, keys: readonly string[]) {
  const { data, refetch } = useListAdminTours();
  const update = useUpdateTour();
  const tour = (Array.isArray(data) ? (data as Tour[]) : []).find((t) => t.id === tourId);

  const [values, setValues] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unsaved edits. Saving *another* card on the same tab refetches the tour,
  // and re-seeding then would silently throw these away.
  const dirty = useRef(false);

  useEffect(() => {
    if (!tour || dirty.current) return;
    const next: Record<string, any> = {};
    for (const k of keys) next[k] = (tour as any)[k];
    setValues(next);
    // `keys` is a literal array declared inline by each tab; its contents are
    // what matter, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, keys.join(",")]);

  const set = useCallback((patch: Record<string, any>) => {
    dirty.current = true;
    setValues((v) => ({ ...v, ...patch }));
    setSaved(false);
    setError(null);
  }, []);

  const save = useCallback(
    (extra?: Record<string, any>) => {
      setError(null);
      update.mutate(
        { id: tourId, data: { ...values, ...extra } as any },
        {
          onSuccess: () => {
            dirty.current = false;
            setSaved(true);
            refetch();
          },
          onError: () => setError("Save failed."),
        },
      );
    },
    [tourId, values, update, refetch],
  );

  return { tour, values, set, save, saving: update.isPending, saved, error };
}
