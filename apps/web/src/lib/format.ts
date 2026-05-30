/** Shared, dependency-free formatting helpers for the web UI. */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** Compact relative time, e.g. "just now", "5m ago", "3d ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Set difference of two field lists, for showing what a re-upload changed. */
export function diffFields(before: string[], after: string[]) {
  const a = new Set(before);
  const b = new Set(after);
  return {
    added: after.filter(f => !a.has(f)),
    removed: before.filter(f => !b.has(f)),
  };
}
