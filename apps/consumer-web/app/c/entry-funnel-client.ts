'use client';

/** TOOL-PHASE-1: browser emit for L0–L2 entry traces (no payment fields). */

export type FunnelSurface =
  | 'nearby'
  | 'store'
  | 'circle'
  | 'search'
  | 'one_code'
  | 'entry'
  | 'share'
  | 'other';

export type FunnelEventInput = {
  eventCode: string;
  surface: FunnelSurface;
  actorRole?: 'anonymous' | 'consumer' | 'employee' | 'boss';
  moduleKey?: string;
  targetPlatform?: 'meituan' | 'douyin' | 'saabei' | 'external';
  targetUrl?: string;
  targetStoreId?: string;
  circleId?: string;
  source?: string;
  scene?: string;
  shareCode?: string | null;
  dwellMs?: number;
  scrollPct?: number;
  shareState?: string;
  payload?: Record<string, unknown>;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const SESSION_KEY = 'od_funnel_sid';

export function funnelSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

function attributionFromLocation(): { source?: string; scene?: string; shareCode?: string } {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  return {
    source: q.get('source') ?? undefined,
    scene: q.get('scene') ?? undefined,
    shareCode: q.get('shareCode') ?? undefined,
  };
}

/** Fire-and-forget batch ingest; never throws to callers. */
export async function trackFunnelEvents(
  tenantSlug: string,
  events: FunnelEventInput[],
): Promise<void> {
  if (!tenantSlug || events.length === 0) return;
  const attr = attributionFromLocation();
  const sessionId = funnelSessionId();
  const body = {
    events: events.map((event) => ({
      ...event,
      actorRole: event.actorRole ?? 'anonymous',
      device: 'h5' as const,
      sessionId,
      source: event.source ?? attr.source,
      scene: event.scene ?? attr.scene,
      shareCode: event.shareCode ?? attr.shareCode ?? undefined,
    })),
  };
  try {
    const url = `${apiBase()}/api/v1/consumer/funnel/events?tenant=${encodeURIComponent(tenantSlug)}`;
    const payload = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    /* traces must not block UX */
  }
}

export function trackFunnelEvent(tenantSlug: string, event: FunnelEventInput): Promise<void> {
  return trackFunnelEvents(tenantSlug, [event]);
}

/** Visit on mount + dwell (+ optional scroll_depth) on page hide. */
export function bindPageFunnel(options: {
  tenantSlug: string;
  surface: FunnelSurface;
  moduleKey?: string;
  targetStoreId?: string;
  shareCode?: string | null;
  source?: string;
  scene?: string;
}): () => void {
  const started = Date.now();
  let maxScroll = 0;
  let sent = false;
  void trackFunnelEvent(options.tenantSlug, {
    eventCode: 'visit',
    surface: options.surface,
    moduleKey: options.moduleKey,
    targetStoreId: options.targetStoreId,
    shareCode: options.shareCode,
    source: options.source,
    scene: options.scene,
  });
  const onScroll = () => {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    maxScroll = Math.max(maxScroll, Math.round((window.scrollY / max) * 100));
  };
  const flush = () => {
    if (sent) return;
    sent = true;
    const dwellMs = Date.now() - started;
    void trackFunnelEvents(options.tenantSlug, [
      {
        eventCode: 'dwell',
        surface: options.surface,
        moduleKey: options.moduleKey,
        targetStoreId: options.targetStoreId,
        shareCode: options.shareCode,
        source: options.source,
        scene: options.scene,
        dwellMs,
      },
      {
        eventCode: 'scroll_depth',
        surface: options.surface,
        moduleKey: options.moduleKey,
        targetStoreId: options.targetStoreId,
        shareCode: options.shareCode,
        source: options.source,
        scene: options.scene,
        scrollPct: maxScroll,
      },
    ]);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}

export function mapPlatform(
  value: string | null | undefined,
): 'meituan' | 'douyin' | 'saabei' | 'external' | undefined {
  if (!value) return undefined;
  if (value === 'meituan' || value === 'douyin' || value === 'saabei' || value === 'external')
    return value;
  return 'external';
}

const SEEN_KEY = 'od_funnel_modules_seen';

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    /* ignore quota */
  }
}

/**
 * L2: fire module_impression once per module key per browser session when ≥50% visible.
 */
export function observeModuleImpressions(options: {
  tenantSlug: string;
  surface: FunnelSurface;
  root?: ParentNode | null;
  targetStoreId?: string;
  shareCode?: string | null;
  source?: string;
  scene?: string;
}): () => void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined')
    return () => undefined;
  const root = options.root ?? document;
  const seen = readSeen();
  const observer = new IntersectionObserver(
    (entries) => {
      const batch: FunnelEventInput[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const el = entry.target as HTMLElement;
        const moduleKey = (el.getAttribute('data-module') || '').trim().slice(0, 80);
        if (!moduleKey) continue;
        const dedupe = `${options.tenantSlug}:${options.surface}:${moduleKey}:${options.targetStoreId ?? ''}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        batch.push({
          eventCode: 'module_impression',
          surface: options.surface,
          moduleKey,
          targetStoreId: options.targetStoreId,
          shareCode: options.shareCode,
          source: options.source,
          scene: options.scene ?? 'module_visible',
        });
        observer.unobserve(el);
      }
      if (batch.length) {
        writeSeen(seen);
        void trackFunnelEvents(options.tenantSlug, batch);
      }
    },
    { threshold: [0.5] },
  );

  const watch = () => {
    const nodes = root.querySelectorAll?.('[data-module]');
    if (!nodes) return;
    for (const node of nodes) {
      const moduleKey = (node.getAttribute('data-module') || '').trim();
      if (!moduleKey) continue;
      const dedupe = `${options.tenantSlug}:${options.surface}:${moduleKey}:${options.targetStoreId ?? ''}`;
      if (seen.has(dedupe)) continue;
      observer.observe(node);
    }
  };
  watch();
  const mo =
    typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => watch())
      : null;
  if (mo && root instanceof Node) mo.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mo?.disconnect();
  };
}
