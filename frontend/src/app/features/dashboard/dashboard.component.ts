import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';
import { MonitorStore } from '../../core/state/monitor.store';
import { TPipe } from '../../core/i18n/t.pipe';
import { iconForKind } from '../../core/icons';
import { AlertLevel, DeviceKind } from '../../core/models/models';
import { SparklineComponent } from '../../shared/sparkline.component';

@Component({
  selector: 'ss-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, LucideAngularModule, TPipe, SparklineComponent],
  template: `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      @switch (store.status()) {
        @case ('loading') {
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (s of [1,2,3,4,5,6,7,8]; track s) { <div class="h-40 rounded-xl border border-pit-700 bg-pit-900 animate-pulse"></div> }
          </div>
        }
        @case ('error') {
          <div class="rounded-xl border border-pit-700 bg-pit-900 p-10 text-center">
            <lucide-icon name="alert-circle" class="w-8 h-8 mx-auto text-crit-500"></lucide-icon>
            <p class="text-sm text-pit-300 mt-3">{{ 'error.network' | t }}</p>
            <button (click)="store.load()" class="mt-4 rounded-lg border border-pit-700 text-sm font-semibold px-4 py-2 hover:border-okg-500 transition-colors">{{ 'common.retry' | t }}</button>
          </div>
        }
        @case ('ready') {
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="grid">
            @for (d of store.devices(); track d.id) {
              <a [routerLink]="['/app/device', d.code]"
                class="rounded-xl bg-pit-900 border p-4 transition-colors block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-okg-500/60"
                [class]="cardClass(d.level)">
                <div class="flex items-center justify-between mb-3">
                  <span class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg grid place-items-center" [class]="iconBoxClass(d.level)">
                      <lucide-icon [name]="icon(d.kind)" class="w-4 h-4" [class]="valueClass(d.level)"></lucide-icon>
                    </span>
                    <span class="mono text-[11px] text-pit-300">{{ d.code }}</span>
                  </span>
                  <span class="mono text-[10px] font-bold rounded px-2 py-1" [class]="badgeClass(d.level)">{{ badge(d.level) }}</span>
                </div>
                <p class="text-xs text-pit-200 mb-2 truncate" [title]="d.name">{{ d.name }}</p>
                <p class="mono text-2xl font-bold pulse-data" [class]="valueClass(d.level)">
                  {{ d.lastValue !== null ? d.lastValue : '—' }}<span class="text-sm text-pit-300 ml-1">{{ d.unit }}</span>
                </p>
                <div class="mt-1 -mb-1 h-10">
                  @if (d.sparkline.length > 1) { <ss-sparkline [values]="d.sparkline" [color]="lineColor(d.level)"></ss-sparkline> }
                </div>
                <p class="mono text-[10px] mt-1" [class]="d.online ? 'text-pit-400' : 'text-crit-500'">
                  {{ d.online ? (('dash.online' | t)) : (('dash.offline' | t)) }}
                  @if (d.lastReadingAt) { · {{ d.lastReadingAt | date: 'HH:mm:ss' }} }
                </p>
              </a>
            }
          </div>
        }
      }
    </main>
  `,
})
export class DashboardComponent {
  readonly store = inject(MonitorStore);
  readonly i18n = inject(I18nService);

  icon(kind: DeviceKind): string { return iconForKind(kind); }
  badge(level: AlertLevel): string { return level === 'Crit' ? '■ CRIT' : level === 'Warn' ? '▲ WARN' : '● OK'; }
  lineColor(level: AlertLevel): string { return level === 'Crit' ? '#FF4757' : level === 'Warn' ? '#F0B232' : '#2ED573'; }
  valueClass(level: AlertLevel): string { return level === 'Crit' ? 'text-crit-500' : level === 'Warn' ? 'text-amb-500' : 'text-white'; }
  badgeClass(level: AlertLevel): string {
    return level === 'Crit' ? 'bg-crit-900 text-crit-500' : level === 'Warn' ? 'bg-amb-900 text-amb-500' : 'bg-okg-900 text-okg-500';
  }
  iconBoxClass(level: AlertLevel): string {
    return level === 'Crit' ? 'bg-crit-900' : level === 'Warn' ? 'bg-amb-900' : 'bg-pit-800';
  }
  cardClass(level: AlertLevel): string {
    return level === 'Crit' ? 'border-crit-500 crit-blink' : level === 'Warn' ? 'border-amb-500/60 hover:bg-pit-800' : 'border-pit-700 hover:bg-pit-800';
  }
}
