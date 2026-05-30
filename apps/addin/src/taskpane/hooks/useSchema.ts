import { useEffect, useState } from 'react';
import type { SchemaDefinition } from '@open-doc/shared';

export function useSchema(serverUrl: string) {
  const [schema, setSchema] = useState<SchemaDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    fetch(`${serverUrl}/api/schema`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SchemaDefinition>;
      })
      .then(setSchema)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [serverUrl]);

  return { schema, error, loading };
}
