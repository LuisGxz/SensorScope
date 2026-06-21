import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MonitorApi } from '../../core/api/monitor.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { MonitorStore } from '../../core/state/monitor.store';
import { TPipe } from '../../core/i18n/t.pipe';
import { AlertDto, AlertLevel } from '../../core/models/models';

interface FilterOpt { key: string; labelKey: string; }
const FILTERS: FilterOpt[] = [
  { key: 'all', labelKey: 'dash.all' },
  { key: 'active', labelKey: 'dash.active' },
  { key: 'crit', labelKey: 'role.crit' },
  { key: 'warn', labelKey: 'role.warn' },
  { key: 'resolved', labelKey: 'dash.resolved' },
];

@Component({
  selector: 'ss-alerts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, LucideAngularModule, TPipe],
  template: `
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-lg font-semibold text-white flex items-center gap-2">
          <lucide-icon name="bell" class="w-5 h-5 text-pit-300"></lucide-icon>{{ 'nav.alerts' | t }}
        </h1>
        <span class="mono text-xs text-pit-400">{{ alerts().length }} {{ 'alerts.shown' | t }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 mb-4 text-xs mono">
        @for (f of filters; track f.key) {
          <button (click)="setFilter(f.key)" class="rounded-md px-3 py-2 transition-colors"
            [class]="f.key === filter() ? 'bg-pit-700 text-white' : filterColor(f.key)">{{ f.labelKey | t }}</button>
        }
      </div>

      @switch (status()) {
        @case ('loading') {
          <div class="space-y-3">
            @for (s of [1,2,3,4]; track s) { <div class="h-20 rounded-xl border border-pit-700 bg-pit-900 animate-pulse"></div> }
          </div>
        }
        @case ('error') {
          <div class="rounded-xl border border-pit-700 bg-pit-900 p-10 text-center">
            <lucide-icon name="alert-circle" class="w-8 h-8 mx-auto text-crit-500"></lucide-icon>
            <p class="text-sm text-pit-300 mt-3">{{ 'error.network' | t }}</p>
            <button (click)="load()" class="mt-4 rounded-lg border border-pit-700 text-sm font-semibold px-4 py-2 hover:border-okg-500 transition-colors">{{ 'common.retry' | t }}</button>
          </div>
        }
        @case ('ready') {
          @if (alerts().length === 0) {
            <div class="rounded-xl border border-pit-700 bg-pit-900 p-12 text-center">
              <span class="w-12 h-12 rounded-full bg-okg-900 grid place-items-center mx-auto"><lucide-icon name="check-circle-2" class="w-6 h-6 text-okg-500"></lucide-icon></span>
              <p class="text-sm font-semibold text-white mt-4">{{ 'dash.noAlerts' | t }}</p>
              <p class="text-xs text-pit-400 mt-1">{{ 'alerts.emptyHint' | t }}</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (a of alerts(); track a.id) {
                <div class="rounded-xl bg-pit-900 border p-4 flex items-start gap-4 transition-opacity"
                  [class]="a.active ? (a.level === 'Crit' ? 'border-crit-500/70' : 'border-amb-500/50') : 'border-pit-700 opacity-60'">
                  <span class="mono text-[10px] font-bold rounded px-2 py-1 mt-0.5 shrink-0" [class]="badgeClass(a.level)">{{ badge(a.level) }}</span>
                  <div class="flex-1 min-w-0">
                    <a [routerLink]="['/app/device', a.deviceCode]" class="text-sm font-semibold text-white hover:text-okg-500 transition-colors block">{{ a.message }}</a>
                    <p class="text-xs text-pit-300 mt-0.5 truncate">
                      {{ a.deviceName }}
                      @if (a.acknowledgedBy) { · {{ 'alerts.ackedBy' | t }} {{ a.acknowledgedBy }} }
                      @else if (!a.active) { · {{ 'alerts.resolvedBySystem' | t }} }
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="mono text-xs text-pit-200">{{ a.raisedAt | date: 'HH:mm:ss' }}</p>
                    <p class="mono text-[11px] text-pit-400">{{ ago(a.raisedAt) }}</p>
                  </div>
                  @if (a.active && !a.acknowledgedAt) {
                    <button (click)="acknowledge(a)" [disabled]="acking().has(a.id)"
                      class="shrink-0 rounded-lg border border-pit-600 text-xs font-semibold px-3 py-2 hover:border-okg-500 hover:text-okg-500 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                      @if (acking().has(a.id)) { <lucide-icon name="loader" class="w-3.5 h-3.5 animate-spin"></lucide-icon> }
                      @else { <lucide-icon name="check" class="w-3.5 h-3.5"></lucide-icon> }{{ 'dash.ack' | t }}
                    </button>
                  } @else if (a.acknowledgedAt && a.active) {
                    <span class="shrink-0 text-[11px] mono text-okg-500 flex items-center gap-1 mt-1"><lucide-icon name="check" class="w-3.5 h-3.5"></lucide-icon>{{ 'alerts.acked' | t }}</span>
                  }
                </div>
              }
            </div>
          }
        }
      }
    </main>
  `,
})
export class AlertsComponent implements OnInit {
  private readonly api = inject(MonitorApi);
  private readonly store = inject(MonitorStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  readonly filters = FILTERS;
  readonly filter = signal('all');
  readonly status = signal<'loading' | 'error' | 'ready'>('loading');
  readonly alerts = signal<AlertDto[]>([]);
  readonly acking = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.load();
    // Refetch on any live alert transition so the feed stays current.
    this.store.rt.alertRaised$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(true));
    this.store.rt.alertResolved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(true));
  }

  setFilter(key: string): void {
    if (key === this.filter()) return;
    this.filter.set(key);
    this.load();
  }

  load(silent = false): void {
    if (!silent) this.status.set('loading');
    this.api.alerts(this.filter()).subscribe({
      next: (alerts) => { this.alerts.set(alerts); this.status.set('ready'); },
      error: () => { if (!silent) this.status.set('error'); },
    });
  }

  acknowledge(a: AlertDto): void {
    if (this.acking().has(a.id)) return;
    this.acking.update((s) => new Set(s).add(a.id));
    this.api.acknowledge(a.id).subscribe({
      next: () => { this.releaseAck(a.id); this.load(true); },
      error: () => this.releaseAck(a.id),
    });
  }
  private releaseAck(id: string): void {
    this.acking.update((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  ago(iso: string): string {
    const secs = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
    return `${Math.floor(secs / 86400)}d`;
  }

  badge(level: AlertLevel): string { return level === 'Crit' ? '■ CRIT' : level === 'Warn' ? '▲ WARN' : '● OK'; }
  badgeClass(level: AlertLevel): string {
    return level === 'Crit' ? 'bg-crit-900 text-crit-500' : level === 'Warn' ? 'bg-amb-900 text-amb-500' : 'bg-okg-900 text-okg-500';
  }
  filterColor(key: string): string {
    if (key === 'crit') return 'text-crit-500 hover:bg-crit-900';
    if (key === 'warn') return 'text-amb-500 hover:bg-amb-900';
    return 'text-pit-300 hover:text-white hover:bg-pit-800';
  }
}
