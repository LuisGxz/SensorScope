import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MonitorApi } from '../../core/api/monitor.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { MonitorStore } from '../../core/state/monitor.store';
import { TPipe } from '../../core/i18n/t.pipe';
import { iconForKind } from '../../core/icons';
import { AlertDto, AlertLevel, DeviceSummaryDto, ThresholdDirection } from '../../core/models/models';

interface RangeOpt { key: string; label: string; }
const RANGES: RangeOpt[] = [
  { key: '1h', label: '1H' }, { key: '6h', label: '6H' }, { key: '24h', label: '24H' }, { key: '7d', label: '7D' },
];

@Component({
  selector: 'ss-device-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, NgApexchartsModule, TPipe],
  template: `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <a routerLink="/app" class="inline-flex items-center gap-1.5 text-sm text-pit-300 hover:text-white transition-colors mb-4">
        <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>{{ 'nav.devices' | t }}
      </a>

      @if (notFound()) {
        <div class="rounded-xl border border-pit-700 bg-pit-900 p-10 text-center">
          <lucide-icon name="alert-circle" class="w-8 h-8 mx-auto text-pit-400"></lucide-icon>
          <p class="text-sm text-pit-300 mt-3">{{ 'detail.notFound' | t }}</p>
        </div>
      } @else if (device(); as d) {
        <div class="rounded-xl border border-pit-700 bg-pit-900 overflow-hidden" [class.crit-blink]="d.level === 'Crit'">
          <!-- header -->
          <div class="flex flex-wrap items-center gap-4 px-5 py-4 border-b border-pit-700">
            <div class="w-10 h-10 rounded-lg grid place-items-center" [class]="iconBoxClass(d.level)">
              <lucide-icon [name]="icon(d)" class="w-5 h-5" [class]="valueClass(d.level)"></lucide-icon>
            </div>
            <div class="flex-1 min-w-[200px]">
              <p class="mono text-xs text-pit-300">{{ d.code }} · {{ d.location }}</p>
              <p class="font-semibold text-white text-lg">{{ d.name }}</p>
            </div>
            <span class="mono text-3xl font-bold pulse-data" [class]="valueClass(d.level)">
              {{ d.lastValue !== null ? d.lastValue : '—' }}<span class="text-lg text-pit-300 ml-1">{{ d.unit }}</span>
            </span>
            <span class="text-xs font-bold rounded-md px-3 py-2 mono" [class]="badgeClass(d.level)">{{ badge(d.level) }}</span>
          </div>

          <div class="grid lg:grid-cols-[1fr_300px]">
            <!-- chart -->
            <div class="p-5">
              <div class="flex items-center gap-1 mb-4 text-xs mono">
                @for (r of ranges; track r.key) {
                  <button (click)="setRange(r.key)" class="rounded-md px-3 py-1.5 transition-colors"
                    [class]="r.key === range() ? 'bg-pit-700 text-white' : 'text-pit-300 hover:text-white hover:bg-pit-800'">{{ r.label }}</button>
                }
                <span class="ml-auto text-pit-400 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-okg-500 pulse-data"></span>{{ 'detail.liveSampling' | t }}
                </span>
              </div>

              @if (seriesLoading()) {
                <div class="h-64 rounded-lg bg-pit-950/40 animate-pulse grid place-items-center">
                  <lucide-icon name="loader" class="w-6 h-6 text-pit-500 animate-spin"></lucide-icon>
                </div>
              } @else if (points().length < 2) {
                <div class="h-64 rounded-lg border border-pit-700 grid place-items-center text-center">
                  <div><lucide-icon name="trending-up" class="w-7 h-7 mx-auto text-pit-500"></lucide-icon>
                  <p class="text-sm text-pit-400 mt-2">{{ 'detail.noData' | t }}</p></div>
                </div>
              } @else {
                <apx-chart
                  [series]="[{ name: d.name, data: points() }]"
                  [chart]="chart"
                  [colors]="[lineColor(d.level)]"
                  [xaxis]="xaxis"
                  [yaxis]="yaxis()"
                  [annotations]="annotations()"
                  [stroke]="stroke"
                  [grid]="grid"
                  [fill]="fill"
                  [dataLabels]="dataLabels"
                  [tooltip]="tooltip"
                ></apx-chart>
              }
            </div>

            <!-- thresholds panel -->
            <aside class="border-t lg:border-t-0 lg:border-l border-pit-700 p-5">
              <p class="text-xs font-bold uppercase tracking-wider text-pit-300 mb-4">{{ 'detail.thresholds' | t }}</p>

              @if (!editing()) {
                <div class="space-y-3 text-sm">
                  <div class="rounded-lg border p-3" [class]="d.level === 'Crit' ? 'border-crit-500/60 bg-crit-900/30' : 'border-pit-600'">
                    <div class="flex justify-between items-center"><span class="mono text-xs text-crit-500">CRIT {{ cmp(d.direction) }}</span>
                      <span class="mono font-bold text-white">{{ d.critThreshold ?? '—' }} {{ d.unit }}</span></div>
                  </div>
                  <div class="rounded-lg border p-3" [class]="d.level === 'Warn' ? 'border-amb-500/60 bg-amb-900/30' : 'border-pit-600'">
                    <div class="flex justify-between items-center"><span class="mono text-xs text-amb-500">WARN {{ cmp(d.direction) }}</span>
                      <span class="mono font-bold text-white">{{ d.warnThreshold ?? '—' }} {{ d.unit }}</span></div>
                  </div>
                  <div class="rounded-lg border p-3" [class]="d.level === 'Ok' ? 'border-okg-500/60 bg-okg-900/30' : 'border-pit-600'">
                    <div class="flex justify-between items-center"><span class="mono text-xs text-okg-500">OK {{ cmpInv(d.direction) }}</span>
                      <span class="text-xs text-pit-300">{{ 'dash.normalOperation' | t }}</span></div>
                  </div>
                </div>

                <button (click)="startEdit(d)" class="w-full mt-4 rounded-lg border border-pit-600 text-sm font-semibold py-2.5 hover:border-okg-500 hover:text-okg-500 transition-colors flex items-center justify-center gap-2">
                  <lucide-icon name="sliders-horizontal" class="w-4 h-4"></lucide-icon>{{ 'detail.editThresholds' | t }}
                </button>
                @if (activeAlert(); as a) {
                  <button (click)="acknowledge(a)" [disabled]="acking()"
                    class="w-full mt-2 rounded-lg bg-amb-500 hover:bg-amb-500/90 disabled:opacity-50 text-pit-950 text-sm font-bold py-2.5 transition-colors flex items-center justify-center gap-2">
                    @if (acking()) { <lucide-icon name="loader" class="w-4 h-4 animate-spin"></lucide-icon> }
                    @else { <lucide-icon name="check" class="w-4 h-4"></lucide-icon> }
                    {{ a.acknowledgedAt ? ('detail.acknowledged' | t) : ('detail.acknowledgeAlert' | t) }}
                  </button>
                }
              } @else {
                <!-- edit form -->
                <div class="space-y-3 text-sm">
                  <label class="block">
                    <span class="text-xs font-semibold text-pit-300">{{ 'detail.direction' | t }}</span>
                    <div class="grid grid-cols-2 gap-2 mt-1.5">
                      <button type="button" (click)="formDir.set('Above')" class="rounded-lg border py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        [class]="formDir() === 'Above' ? 'border-okg-500 text-okg-500 bg-okg-900/30' : 'border-pit-600 text-pit-300 hover:border-pit-500'">
                        <lucide-icon name="arrow-up" class="w-3.5 h-3.5"></lucide-icon>{{ 'detail.above' | t }}</button>
                      <button type="button" (click)="formDir.set('Below')" class="rounded-lg border py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        [class]="formDir() === 'Below' ? 'border-okg-500 text-okg-500 bg-okg-900/30' : 'border-pit-600 text-pit-300 hover:border-pit-500'">
                        <lucide-icon name="arrow-down" class="w-3.5 h-3.5"></lucide-icon>{{ 'detail.below' | t }}</button>
                    </div>
                  </label>
                  <label class="block">
                    <span class="text-xs font-semibold text-amb-500">WARN {{ cmp(formDir()) }}</span>
                    <input type="number" [(ngModel)]="formWarn" step="any"
                      class="w-full mt-1.5 rounded-lg border border-pit-600 bg-pit-800 px-3 py-2 mono text-sm outline-none focus:border-okg-500 transition-colors" />
                  </label>
                  <label class="block">
                    <span class="text-xs font-semibold text-crit-500">CRIT {{ cmp(formDir()) }}</span>
                    <input type="number" [(ngModel)]="formCrit" step="any"
                      class="w-full mt-1.5 rounded-lg border border-pit-600 bg-pit-800 px-3 py-2 mono text-sm outline-none focus:border-okg-500 transition-colors" />
                  </label>
                  @if (formError()) {
                    <p class="flex items-center gap-2 text-xs font-medium text-crit-500 bg-crit-900 rounded-lg px-3 py-2">
                      <lucide-icon name="alert-circle" class="w-4 h-4 shrink-0"></lucide-icon>{{ formError() }}</p>
                  }
                </div>
                <div class="flex gap-2 mt-4">
                  <button (click)="cancelEdit()" [disabled]="saving()" class="flex-1 rounded-lg border border-pit-600 text-sm font-semibold py-2.5 hover:border-pit-500 transition-colors">{{ 'common.cancel' | t }}</button>
                  <button (click)="saveThresholds(d)" [disabled]="saving()" class="flex-1 rounded-lg bg-okg-500 hover:bg-okg-500/90 disabled:opacity-50 text-pit-950 text-sm font-bold py-2.5 transition-colors flex items-center justify-center gap-2">
                    @if (saving()) { <lucide-icon name="loader" class="w-4 h-4 animate-spin"></lucide-icon> }{{ 'common.save' | t }}
                  </button>
                </div>
              }

              @if (d.lastReadingAt) {
                <p class="mono text-[11px] text-pit-400 mt-5 flex items-center gap-1.5" [class.text-crit-500]="!d.online">
                  <span class="w-1.5 h-1.5 rounded-full" [class]="d.online ? 'bg-okg-500 pulse-data' : 'bg-crit-500'"></span>
                  {{ (d.online ? ('dash.online' | t) : ('dash.offline' | t)) }} · {{ d.lastReadingAt | date: 'HH:mm:ss' }}
                </p>
              }
            </aside>
          </div>
        </div>
      }
    </main>
  `,
})
export class DeviceDetailComponent implements OnInit {
  readonly code = input.required<string>();

  private readonly api = inject(MonitorApi);
  private readonly store = inject(MonitorStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  readonly ranges = RANGES;
  readonly range = signal('1h');
  readonly seriesLoading = signal(true);
  readonly notFound = signal(false);
  readonly points = signal<{ x: number; y: number }[]>([]);
  readonly activeAlert = signal<AlertDto | null>(null);
  readonly acking = signal(false);

  // Edit form
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly formDir = signal<ThresholdDirection>('Above');
  readonly formWarn = signal<number | null>(null);
  readonly formCrit = signal<number | null>(null);

  /** Live device — recomputed from the store so the header value/level stay fresh. */
  readonly device = computed<DeviceSummaryDto | undefined>(() => this.store.device(this.code()));

  // ── Chart config ──
  readonly chart = {
    type: 'area' as const,
    height: 264,
    fontFamily: 'IBM Plex Mono, monospace',
    background: 'transparent',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, easing: 'linear' as const, dynamicAnimation: { speed: 400 } },
  };
  readonly stroke = { curve: 'smooth' as const, width: 2.5 };
  readonly grid = { borderColor: '#1C2733', strokeDashArray: 3, padding: { left: 8, right: 8 } };
  readonly fill = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] } };
  readonly dataLabels = { enabled: false };
  readonly xaxis = {
    type: 'datetime' as const,
    labels: { style: { colors: '#4C6275', fontSize: '10px' }, datetimeUTC: false },
    axisBorder: { color: '#1C2733' }, axisTicks: { color: '#1C2733' },
  };
  readonly tooltip = { theme: 'dark', x: { format: 'HH:mm:ss' } };

  /** Y range padded to always show the WARN line for headroom context. */
  readonly yaxis = computed(() => {
    const base = { labels: { style: { colors: '#4C6275', fontSize: '10px' }, formatter: (v: number) => v?.toFixed(1) } };
    const ys = this.points().map((p) => p.y);
    if (ys.length === 0) return base;
    const d = this.device();
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (d?.warnThreshold != null) { lo = Math.min(lo, d.warnThreshold); hi = Math.max(hi, d.warnThreshold); }
    const pad = (hi - lo) * 0.12 || 1;
    return { ...base, min: lo - pad, max: hi + pad };
  });

  readonly annotations = computed(() => {
    const d = this.device();
    const lines: object[] = [];
    if (d?.warnThreshold != null) {
      lines.push({ y: d.warnThreshold, borderColor: '#F0B232', strokeDashArray: 4,
        label: { text: `WARN ${d.warnThreshold}`, style: { background: '#33260B', color: '#F0B232', fontSize: '9px', fontFamily: 'IBM Plex Mono' }, position: 'left', textAnchor: 'start' } });
    }
    if (d?.critThreshold != null) {
      lines.push({ y: d.critThreshold, borderColor: '#FF4757', strokeDashArray: 4,
        label: { text: `CRIT ${d.critThreshold}`, style: { background: '#36121A', color: '#FF4757', fontSize: '9px', fontFamily: 'IBM Plex Mono' }, position: 'left', textAnchor: 'start' } });
    }
    return { yaxis: lines };
  });

  ngOnInit(): void {
    const existing = this.store.device(this.code());
    if (!existing) {
      // Cold load (deep link before the store snapshot arrives): fetch the device directly.
      this.api.device(this.code()).subscribe({
        next: (d) => { this.store.patch(d); this.afterDevice(); },
        error: () => this.notFound.set(true),
      });
    } else {
      this.afterDevice();
    }

    // Live tail: append fresh readings for this device to the chart.
    this.store.rt.reading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      const d = this.device();
      if (!d || r.deviceId !== d.id) return;
      const x = Date.parse(r.time);
      this.points.update((pts) => (pts.length && pts[pts.length - 1].x >= x ? pts : [...pts, { x, y: r.value }].slice(-600)));
    });
  }

  private afterDevice(): void {
    this.loadSeries();
    this.loadActiveAlert();
  }

  setRange(key: string): void {
    if (key === this.range()) return;
    this.range.set(key);
    this.loadSeries();
  }

  private loadSeries(): void {
    const d = this.device();
    if (!d) return;
    this.seriesLoading.set(true);
    this.api.series(d.id, this.range()).subscribe({
      next: (res) => {
        this.points.set(res.points.map((p) => ({ x: Date.parse(p.time), y: Math.round(p.avg * 100) / 100 })));
        this.seriesLoading.set(false);
      },
      error: () => this.seriesLoading.set(false),
    });
  }

  private loadActiveAlert(): void {
    const d = this.device();
    if (!d) return;
    this.api.alerts('active').subscribe({
      next: (alerts) => this.activeAlert.set(alerts.find((a) => a.deviceCode === d.code) ?? null),
      error: () => {},
    });
  }

  acknowledge(a: AlertDto): void {
    if (a.acknowledgedAt || this.acking()) return;
    this.acking.set(true);
    this.api.acknowledge(a.id).subscribe({
      next: () => { this.acking.set(false); this.loadActiveAlert(); },
      error: () => this.acking.set(false),
    });
  }

  // ── Threshold editing ──
  startEdit(d: DeviceSummaryDto): void {
    this.formDir.set(d.direction);
    this.formWarn.set(d.warnThreshold);
    this.formCrit.set(d.critThreshold);
    this.formError.set(null);
    this.editing.set(true);
  }
  cancelEdit(): void { this.editing.set(false); }

  saveThresholds(d: DeviceSummaryDto): void {
    const warn = this.formWarn();
    const crit = this.formCrit();
    if (warn == null || crit == null) { this.formError.set(this.i18n.t('detail.thresholdRequired')); return; }
    // Above: crit must be the higher bar; Below: crit must be the lower bar.
    const ordered = this.formDir() === 'Above' ? crit > warn : crit < warn;
    if (!ordered) { this.formError.set(this.i18n.t('detail.thresholdOrder')); return; }

    this.saving.set(true);
    this.formError.set(null);
    this.api.updateThresholds(d.id, { direction: this.formDir(), warnThreshold: warn, critThreshold: crit }).subscribe({
      next: (updated) => { this.store.patch(updated); this.saving.set(false); this.editing.set(false); },
      error: () => { this.saving.set(false); this.formError.set(this.i18n.t('error.generic')); },
    });
  }

  // ── View helpers ──
  icon(d: DeviceSummaryDto): string { return iconForKind(d.kind); }
  badge(level: AlertLevel): string { return level === 'Crit' ? '■ CRIT' : level === 'Warn' ? '▲ WARN' : '● OK'; }
  cmp(dir: ThresholdDirection): string { return dir === 'Above' ? '≥' : '≤'; }
  cmpInv(dir: ThresholdDirection): string { return dir === 'Above' ? '<' : '>'; }
  lineColor(level: AlertLevel): string { return level === 'Crit' ? '#FF4757' : level === 'Warn' ? '#F0B232' : '#2ED573'; }
  valueClass(level: AlertLevel): string { return level === 'Crit' ? 'text-crit-500' : level === 'Warn' ? 'text-amb-500' : 'text-white'; }
  badgeClass(level: AlertLevel): string {
    return level === 'Crit' ? 'bg-crit-900 text-crit-500' : level === 'Warn' ? 'bg-amb-900 text-amb-500' : 'bg-okg-900 text-okg-500';
  }
  iconBoxClass(level: AlertLevel): string {
    return level === 'Crit' ? 'bg-crit-900' : level === 'Warn' ? 'bg-amb-900' : 'bg-pit-800';
  }
}
