import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  AlertDto, AlertLevel, AlertResolvedDto, DeviceKind, DeviceSummaryDto,
  ReadingEventDto, SeriesResponseDto, SummaryDto, ThresholdDirection, ThresholdUpdateRequest,
} from '../models/models';

interface Spec {
  code: string; name: string; location: string; kind: DeviceKind; unit: string;
  dir: ThresholdDirection; warn: number; crit: number; current: number;
  center: number; amp: number; // simulation shape
}

// Mirrors the backend "North Plant" seed. `center`/`amp` shape the random-walk so the
// "hot" devices oscillate across their thresholds (alerts raise/resolve) on their own.
const SPECS: Spec[] = [
  { code: 'PS-101', name: 'Line pressure — Intake A', location: 'Intake A', kind: 'Pressure', unit: 'bar', dir: 'Below', warn: 3.5, crit: 3.0, current: 4.21, center: 4.2, amp: 0.35 },
  { code: 'TH-204', name: 'Bearing temp — Compressor B', location: 'Machine room 2', kind: 'Temperature', unit: '°C', dir: 'Above', warn: 75, crit: 85, current: 78.4, center: 75, amp: 8 },
  { code: 'VB-310', name: 'Vibration — Turbine 3', location: 'Turbine hall', kind: 'Vibration', unit: 'mm/s', dir: 'Above', warn: 8, crit: 10, current: 12.8, center: 9, amp: 3 },
  { code: 'FL-115', name: 'Flow rate — Cooling loop', location: 'Cooling loop', kind: 'Flow', unit: 'L/min', dir: 'Below', warn: 150, crit: 100, current: 231, center: 235, amp: 20 },
  { code: 'PW-401', name: 'Power draw — Cell 4', location: 'Cell 4', kind: 'Power', unit: 'kW', dir: 'Above', warn: 70, crit: 85, current: 48.2, center: 50, amp: 9 },
  { code: 'HM-220', name: 'Humidity — Clean room', location: 'Clean room', kind: 'Humidity', unit: '%RH', dir: 'Above', warn: 60, crit: 70, current: 41.5, center: 43, amp: 6 },
  { code: 'CO-330', name: 'CO₂ — Warehouse east', location: 'Warehouse east', kind: 'AirQuality', unit: 'ppm', dir: 'Above', warn: 600, crit: 800, current: 618, center: 650, amp: 190 },
  { code: 'TK-508', name: 'Tank level — Reservoir 2', location: 'Reservoir 2', kind: 'Level', unit: '%', dir: 'Below', warn: 20, crit: 10, current: 86, center: 80, amp: 10 },
];

interface DevState extends DeviceSummaryDto { spec: Spec; phase: number; activeAlertId: string | null; }

function rid(): string { return Math.random().toString(36).slice(2, 10); }
function evaluate(dir: ThresholdDirection, warn: number, crit: number, v: number): AlertLevel {
  if (dir === 'Above') return v >= crit ? 'Crit' : v >= warn ? 'Warn' : 'Ok';
  return v <= crit ? 'Crit' : v <= warn ? 'Warn' : 'Ok';
}
function round(v: number, d = 2): number { const f = 10 ** d; return Math.round(v * f) / f; }

/** In-browser telemetry simulator — replaces the .NET API + SignalR hub for the static demo. */
@Injectable({ providedIn: 'root' })
export class SimEngine {
  private devices = new Map<string, DevState>();
  private alerts: AlertDto[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;

  readonly reading$ = new Subject<ReadingEventDto>();
  readonly alertRaised$ = new Subject<AlertDto>();
  readonly alertResolved$ = new Subject<AlertResolvedDto>();
  readonly running = signal(false);

  start(): void {
    if (this.timer) return;
    if (this.devices.size === 0) this.seed();
    this.running.set(true);
    this.timer = setInterval(() => this.step(), 2000);
  }
  stop(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.running.set(false); }

  private seed(): void {
    const now = Date.now();
    for (const spec of SPECS) {
      const spark: number[] = [];
      for (let i = 15; i >= 0; i--) spark.push(round(this.shape(spec, -i * 0.6)));
      const lastValue = spark[spark.length - 1];
      this.devices.set(spec.code, {
        id: spec.code, code: spec.code, name: spec.name, location: spec.location, kind: spec.kind, unit: spec.unit,
        level: evaluate(spec.dir, spec.warn, spec.crit, lastValue), lastValue, online: true,
        lastReadingAt: new Date(now).toISOString(), direction: spec.dir, warnThreshold: spec.warn, critThreshold: spec.crit,
        sparkline: spark, spec, phase: 0, activeAlertId: null,
      });
    }
    // Seed initial alerts so the feed isn't empty (matches the backend seed intent).
    this.raise('VB-310', 'Crit', 12.8, 10, 'Vibration 12.8 mm/s — exceeded CRIT (10.0)', 3);
    this.raise('TH-204', 'Warn', 78.4, 75, 'Bearing temp 78.4°C — above WARN (75.0)', 11);
    this.raise('CO-330', 'Warn', 618, 600, 'CO₂ 618 ppm — above WARN (600)', 24);
    this.raise('PS-101', 'Warn', 3.2, 3.5, 'Pressure 3.2 bar — below WARN (3.5)', 50, true);
    this.raise('PW-401', 'Warn', 72.5, 70, 'Power draw 72.5 kW — above WARN (70.0)', 120, true, true);
  }

  private shape(spec: Spec, phase: number): number {
    return spec.center + Math.sin(phase) * spec.amp + (Math.random() - 0.5) * spec.amp * 0.4;
  }

  private step(): void {
    this.tick++;
    const now = new Date();
    for (const dev of this.devices.values()) {
      dev.phase += 0.28;
      const value = round(this.shape(dev.spec, dev.phase));
      const level = evaluate(dev.direction, dev.warnThreshold!, dev.critThreshold!, value);
      const prev = dev.level;
      dev.lastValue = value; dev.level = level; dev.online = true; dev.lastReadingAt = now.toISOString();
      dev.sparkline = [...dev.sparkline.slice(-15), value];
      this.reading$.next({ deviceId: dev.id, code: dev.code, time: now.toISOString(), value, level });
      if (level !== prev) this.transition(dev, level, value);
    }
  }

  private transition(dev: DevState, to: AlertLevel, value: number): void {
    if (to === 'Ok') { this.resolveActive(dev); return; }
    // raise or escalate
    if (dev.activeAlertId) {
      const cur = this.alerts.find((a) => a.id === dev.activeAlertId);
      if (cur && cur.level === to) return; // same level, nothing to do
      this.resolveActive(dev); // escalation: resolve old, raise new
    }
    const thr = to === 'Crit' ? dev.critThreshold! : dev.warnThreshold!;
    const word = dev.direction === 'Above' ? 'above' : 'below';
    const msg = `${dev.name.split(' — ')[0]} ${value}${dev.unit} — ${word} ${to.toUpperCase()} (${thr})`;
    this.raiseLive(dev, to, value, thr, msg);
  }

  private raiseLive(dev: DevState, level: AlertLevel, value: number, threshold: number, message: string): void {
    const a: AlertDto = {
      id: rid(), deviceCode: dev.code, deviceName: dev.name, level, message, value, threshold,
      raisedAt: new Date().toISOString(), resolvedAt: null, acknowledgedAt: null, acknowledgedBy: null, active: true,
    };
    this.alerts.unshift(a); dev.activeAlertId = a.id; this.alertRaised$.next(a);
  }
  private resolveActive(dev: DevState): void {
    if (!dev.activeAlertId) return;
    const a = this.alerts.find((x) => x.id === dev.activeAlertId);
    if (a) { a.active = false; a.resolvedAt = new Date().toISOString(); this.alertResolved$.next({ alertId: a.id, deviceId: dev.id }); }
    dev.activeAlertId = null;
  }

  private raise(code: string, level: AlertLevel, value: number, threshold: number, message: string, minsAgo: number, resolved = false, acked = false): void {
    const dev = this.devices.get(code);
    const a: AlertDto = {
      id: rid(), deviceCode: code, deviceName: dev?.name ?? code, level, message, value, threshold,
      raisedAt: new Date(Date.now() - minsAgo * 60_000).toISOString(),
      resolvedAt: resolved ? new Date(Date.now() - (minsAgo - 5) * 60_000).toISOString() : null,
      acknowledgedAt: acked ? new Date(Date.now() - (minsAgo - 2) * 60_000).toISOString() : null,
      acknowledgedBy: acked ? 'operator@sensorscope.io' : null, active: !resolved,
    };
    this.alerts.push(a);
    if (!resolved && dev) dev.activeAlertId = a.id;
  }

  // ── API surface (mirrors MonitorApi) ──
  summary(): SummaryDto {
    const d = [...this.devices.values()];
    return { total: d.length, ok: d.filter((x) => x.level === 'Ok').length, warn: d.filter((x) => x.level === 'Warn').length, crit: d.filter((x) => x.level === 'Crit').length, online: d.filter((x) => x.online).length };
  }
  list(): DeviceSummaryDto[] { return [...this.devices.values()].map(strip); }
  one(idOrCode: string): DeviceSummaryDto | undefined { const d = this.devices.get(idOrCode) ?? [...this.devices.values()].find((x) => x.id === idOrCode); return d ? strip(d) : undefined; }

  series(deviceId: string, range: string): SeriesResponseDto {
    const dev = this.devices.get(deviceId) ?? [...this.devices.values()].find((x) => x.id === deviceId);
    const cfg: Record<string, [number, number, string]> = { '1h': [3_600_000, 60, '1m'], '6h': [21_600_000, 72, '5m'], '24h': [86_400_000, 96, '15m'], '7d': [604_800_000, 84, '2h'] };
    const [span, count, bucket] = cfg[range] ?? cfg['1h'];
    const now = Date.now(); const step = span / count;
    const points = [];
    for (let i = count; i >= 0; i--) {
      const t = now - i * step; const phase = -i * 0.5;
      const avg = dev ? this.shape(dev.spec, phase) : 0;
      points.push({ time: new Date(t).toISOString(), avg: round(avg), min: round(avg - (dev?.spec.amp ?? 1) * 0.25), max: round(avg + (dev?.spec.amp ?? 1) * 0.25) });
    }
    return { deviceId, range, bucket, points };
  }

  updateThresholds(deviceId: string, req: ThresholdUpdateRequest): DeviceSummaryDto | undefined {
    const dev = this.devices.get(deviceId) ?? [...this.devices.values()].find((x) => x.id === deviceId);
    if (!dev) return undefined;
    dev.direction = req.direction; dev.warnThreshold = req.warnThreshold; dev.critThreshold = req.critThreshold;
    if (dev.lastValue !== null) dev.level = evaluate(dev.direction, dev.warnThreshold!, dev.critThreshold!, dev.lastValue);
    return strip(dev);
  }

  alertList(filter: string): AlertDto[] {
    let a = [...this.alerts];
    if (filter === 'active') a = a.filter((x) => x.active);
    else if (filter === 'resolved') a = a.filter((x) => !x.active);
    else if (filter === 'crit') a = a.filter((x) => x.level === 'Crit');
    else if (filter === 'warn') a = a.filter((x) => x.level === 'Warn');
    return a.sort((x, y) => +new Date(y.raisedAt) - +new Date(x.raisedAt));
  }
  acknowledge(alertId: string): void {
    const a = this.alerts.find((x) => x.id === alertId);
    if (a && !a.acknowledgedAt) { a.acknowledgedAt = new Date().toISOString(); a.acknowledgedBy = 'operator@sensorscope.io'; }
  }
}

function strip(d: DevState): DeviceSummaryDto {
  return {
    id: d.id, code: d.code, name: d.name, location: d.location, kind: d.kind, unit: d.unit,
    level: d.level, lastValue: d.lastValue, online: d.online, lastReadingAt: d.lastReadingAt,
    direction: d.direction, warnThreshold: d.warnThreshold, critThreshold: d.critThreshold,
    sparkline: [...d.sparkline],
  };
}
