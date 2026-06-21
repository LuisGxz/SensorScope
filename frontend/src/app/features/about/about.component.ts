import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '../../core/i18n/i18n.service';

interface Feature { icon: string; en: [string, string]; es: [string, string]; }
interface Tier { layer: string; tech: string; }

@Component({
  selector: 'ss-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="min-h-screen bg-pit-950 text-pit-100">
      <header class="flex items-center justify-between px-6 h-14 border-b border-pit-700 bg-pit-950/90 backdrop-blur sticky top-0 z-10">
        <button (click)="back()" class="flex items-center gap-2.5">
          <span class="w-7 h-7 rounded-lg bg-okg-500 grid place-items-center"><lucide-icon name="radio-tower" class="w-4 h-4 text-pit-950"></lucide-icon></span>
          <span class="font-semibold text-white">SensorScope</span>
        </button>
        <button (click)="i18n.toggle()" class="h-9 px-2.5 rounded-lg text-xs font-semibold hover:bg-pit-800 transition-colors flex items-center gap-1.5">
          <lucide-icon name="languages" class="w-3.5 h-3.5"></lucide-icon>{{ i18n.lang() === 'en' ? 'EN' : 'ES' }}
        </button>
      </header>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-11 h-11 rounded-2xl bg-okg-500 grid place-items-center"><lucide-icon name="radio-tower" class="w-6 h-6 text-pit-950"></lucide-icon></span>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-white">SensorScope</h1>
            <p class="text-sm text-pit-400">{{ es() ? 'Monitoreo IoT industrial en tiempo real' : 'Real-time industrial IoT monitoring' }}</p>
          </div>
        </div>
        <p class="text-base text-pit-300 leading-relaxed max-w-2xl">
          {{ es()
            ? 'Una sala de control para telemetría industrial: ingesta de lecturas por dispositivo, series temporales en vivo y alertas por umbrales. Las lecturas se almacenan en una hypertable de TimescaleDB y se agregan con time_bucket; un motor de umbrales levanta, escala y resuelve alertas, y todo se difunde por SignalR. Construido como pieza de portfolio con auth, claves de ingesta, tests y una capa de demo guiada con un simulador que mantiene viva la planta.'
            : 'A control room for industrial telemetry: per-device reading ingestion, live time-series and threshold alerts. Readings land in a TimescaleDB hypertable and are aggregated with time_bucket; a threshold engine raises, escalates and resolves alerts, and everything is pushed over SignalR. Built as a portfolio piece with auth, ingestion keys, tests and a guided demo layer whose simulator keeps the plant alive.' }}
        </p>

        <h2 class="text-xs font-semibold uppercase tracking-wide text-pit-400 mt-10 mb-4">{{ es() ? 'Lo destacado' : 'Highlights' }}</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          @for (f of features; track f.icon) {
            <div class="rounded-xl border border-pit-700 bg-pit-900 p-4 flex gap-3">
              <span class="w-9 h-9 rounded-lg bg-okg-500/15 grid place-items-center shrink-0"><lucide-icon [name]="f.icon" class="w-5 h-5 text-okg-500"></lucide-icon></span>
              <div>
                <h3 class="text-sm font-semibold text-white">{{ es() ? f.es[0] : f.en[0] }}</h3>
                <p class="text-xs text-pit-400 mt-0.5 leading-snug">{{ es() ? f.es[1] : f.en[1] }}</p>
              </div>
            </div>
          }
        </div>

        <h2 class="text-xs font-semibold uppercase tracking-wide text-pit-400 mt-10 mb-4">{{ es() ? 'Arquitectura' : 'Architecture' }}</h2>
        <div class="rounded-xl border border-pit-700 bg-pit-900 divide-y divide-pit-700">
          @for (t of stack; track t.layer) {
            <div class="flex items-center gap-4 px-4 py-2.5">
              <span class="w-32 shrink-0 text-xs font-semibold text-pit-400">{{ t.layer }}</span>
              <span class="text-sm text-pit-200">{{ t.tech }}</span>
            </div>
          }
        </div>

        <p class="text-[13px] text-pit-400 mt-6 leading-relaxed">
          {{ es()
            ? 'La hypertable particiona las lecturas por tiempo para escalar a alto volumen; las consultas de series usan time_bucket por rango (30 s → 1 h). El estado de cada dispositivo (último valor, nivel, online) se desnormaliza para un dashboard instantáneo. La telemetría ambiental es simulada y efímera — la API y la base de datos son reales.'
            : 'The hypertable partitions readings by time to scale to high volume; series queries use time_bucket per range (30 s → 1 h). Each device’s state (last value, level, online) is denormalized for an instant dashboard. The ambient telemetry is simulated and ephemeral — the API and database are real.' }}
        </p>

        <div class="mt-8">
          <button (click)="back()" class="rounded-lg bg-okg-500 hover:bg-okg-500/90 text-pit-950 text-sm font-bold px-4 py-2 transition-colors">{{ es() ? 'Volver al panel' : 'Back to dashboard' }}</button>
        </div>
        <p class="text-[11px] text-pit-400 mono mt-10">SensorScope · Luis Chiquito Vera · {{ es() ? 'demo de portfolio' : 'portfolio demo' }}</p>
      </div>
    </div>
  `,
})
export class AboutComponent {
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly es = () => this.i18n.lang() === 'es';

  back(): void {
    void this.router.navigateByUrl('/app');
  }

  readonly features: Feature[] = [
    { icon: 'activity', en: ['Live telemetry', 'Readings stream in over SignalR; values, levels and sparklines update instantly.'], es: ['Telemetría en vivo', 'Las lecturas llegan por SignalR; valores, niveles y sparklines en tiempo real.'] },
    { icon: 'trending-up', en: ['Real time-series', 'TimescaleDB hypertable with time_bucket aggregation across 1H/6H/24H/7D ranges.'], es: ['Series temporales reales', 'Hypertable de TimescaleDB con agregación time_bucket en rangos 1H/6H/24H/7D.'] },
    { icon: 'bell', en: ['Threshold engine', 'Crossings raise alerts, escalate WARN→CRIT and resolve on their own.'], es: ['Motor de umbrales', 'Los cruces levantan alertas, escalan WARN→CRIT y se resuelven solos.'] },
    { icon: 'sliders-horizontal', en: ['Tunable thresholds', 'Retune WARN/CRIT and direction per device; the level recomputes immediately.'], es: ['Umbrales ajustables', 'Reajusta WARN/CRIT y dirección por dispositivo; el nivel se recalcula al instante.'] },
    { icon: 'lock', en: ['Auth & ingestion keys', 'JWT + rotating refresh for operators; SHA-256 API keys for device ingestion.'], es: ['Auth y claves de ingesta', 'JWT + refresh rotativo para operadores; claves API SHA-256 para los dispositivos.'] },
    { icon: 'compass', en: ['Guided live demo', 'A coach-mark tour, an explore panel, and a simulator that keeps the plant breathing.'], es: ['Demo guiada en vivo', 'Tour de coach-marks, panel de exploración y un simulador que mantiene viva la planta.'] },
  ];

  readonly stack: Tier[] = [
    { layer: 'Frontend', tech: 'Angular 20 (standalone + signals), Tailwind v4, ApexCharts, @microsoft/signalr' },
    { layer: 'Backend', tech: '.NET 9 Web API, SignalR hubs, Clean Architecture' },
    { layer: 'Time-series', tech: 'TimescaleDB (PostgreSQL) hypertable + time_bucket aggregation' },
    { layer: 'Ingestion', tech: 'Per-device API keys (SHA-256) + REST ingest + threshold engine' },
    { layer: 'Auth', tech: 'JWT access + rotating refresh, brute-force lockout' },
    { layer: 'Testing', tech: '29 backend unit tests (xUnit) + Playwright E2E' },
  ];
}
