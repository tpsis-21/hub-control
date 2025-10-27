export function reloadPage(): void {
  try {
    const g: any = typeof global !== 'undefined' ? (global as any) : undefined;
    if (g?.location?.reload) {
      g.location.reload();
      return;
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
    window.location.reload();
    return;
  }

  const gt: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  if (gt?.location?.reload) {
    gt.location.reload();
  }
}
