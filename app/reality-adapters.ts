import type { RawRealitySignal, RealityEventType, RealitySignalAdapter } from "./domain.ts";
import staticFeed from "./data/reality-signals.json" with { type: "json" };

type ManualSignalInput = { text: string; observedAt?: string; externalReference?: string };
type MockScenarioInput = { eventType: RealityEventType };
type StaticFeedInput = { signalIds?: string[] } | undefined;

const cloneSignals = (items: unknown[]): RawRealitySignal[] => (structuredClone(items) as RawRealitySignal[]).map((signal) => ({ ...signal, provenance: "demo-mock" as const }));

export const manualRealitySignalAdapter: RealitySignalAdapter<ManualSignalInput> = {
  id: "manual-reality-signal-adapter",
  sourceType: "manual-demo",
  adapt(input) {
    const text = input.text.trim();
    if (!text) return [];
    const observedAt = input.observedAt ?? new Date().toISOString();
    return [{
      id: `signal-manual-${observedAt.replace(/\D/g, "").slice(0, 14)}`,
      source: "Travorien manual report",
      sourceType: "manual-demo",
      observedAt,
      payload: { kind: "MANUAL_TEXT" },
      rawText: text,
      externalReference: input.externalReference,
      provenance: "demo-mock",
    }];
  },
};

export const staticDemoFeedAdapter: RealitySignalAdapter<StaticFeedInput> = {
  id: "static-demo-feed-adapter",
  sourceType: "static-demo-feed",
  adapt(input) {
    const signals = cloneSignals(staticFeed as unknown[]);
    if (!input?.signalIds?.length) return signals;
    const selected = new Set(input.signalIds);
    return signals.filter((signal) => selected.has(signal.id));
  },
};

export const mockRealitySignalAdapter: RealitySignalAdapter<MockScenarioInput> = {
  id: "mock-reality-signal-adapter",
  sourceType: "demo-mock",
  adapt(input) {
    const signal = cloneSignals(staticFeed as unknown[]).find((item) => {
      const payload = item.payload as { eventType?: unknown };
      return payload?.eventType === input.eventType;
    });
    return signal ? [{ ...signal, sourceType: "demo-mock", source: "Travorien scenario button" }] : [];
  },
};

export const realitySignalAdapters = [mockRealitySignalAdapter, manualRealitySignalAdapter, staticDemoFeedAdapter];
