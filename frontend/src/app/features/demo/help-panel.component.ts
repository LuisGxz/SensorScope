import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DemoService } from '../../core/demo/demo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';

/** Slide-over "How to explore" guide: what's real, the demo accounts, and what to try. */
@Component({
  selector: 'ss-help-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule, TPipe],
  template: `
    @if (demo.helpOpen()) {
      <div class="fixed inset-0 z-[90] flex justify-end">
        <div class="absolute inset-0 bg-pit-950/60 backdrop-blur-[1px]" (click)="demo.closeHelp()"></div>

        <aside class="relative w-full sm:w-[400px] h-full bg-pit-900 border-l border-pit-700 shadow-2xl flex flex-col animate-[slidein_.22s_ease-out]">
          <header class="flex items-center gap-2.5 px-5 py-4 border-b border-pit-700">
            <span class="w-8 h-8 rounded-lg bg-okg-500 grid place-items-center"><lucide-icon name="compass" class="w-4 h-4 text-pit-950"></lucide-icon></span>
            <h2 class="font-semibold text-white">{{ 'demo.help' | t }}</h2>
            <button (click)="demo.closeHelp()" class="ml-auto w-8 h-8 rounded-lg grid place-items-center text-pit-400 hover:bg-pit-800 hover:text-white transition-colors"><lucide-icon name="x" class="w-4 h-4"></lucide-icon></button>
          </header>

          <div class="flex-1 overflow-y-auto p-5 space-y-6">
            <p class="text-sm text-pit-300 leading-relaxed">{{ 'demo.intro' | t }}</p>

            <button (click)="demo.startTour()"
              class="w-full rounded-lg bg-okg-500 hover:bg-okg-500/90 text-pit-950 text-sm font-bold py-2.5 transition-colors flex items-center justify-center gap-2">
              <lucide-icon name="play" class="w-4 h-4"></lucide-icon>{{ 'demo.startTour' | t }}
            </button>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-pit-400 mb-3">{{ 'demo.whatsReal' | t }}</h3>
              <ul class="space-y-2 text-sm">
                @for (k of realKeys; track k) {
                  <li class="flex items-start gap-2.5">
                    <lucide-icon name="check-circle-2" class="w-4 h-4 text-okg-500 shrink-0 mt-0.5"></lucide-icon>
                    <span class="text-pit-200">{{ k | t }}</span>
                  </li>
                }
              </ul>
            </section>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-pit-400 mb-3">{{ 'demo.tryThis' | t }}</h3>
              <ul class="space-y-2 text-sm">
                @for (k of tryKeys; track k) {
                  <li class="flex items-start gap-2.5">
                    <lucide-icon name="sliders-horizontal" class="w-4 h-4 text-amb-500 shrink-0 mt-0.5"></lucide-icon>
                    <span class="text-pit-200">{{ k | t }}</span>
                  </li>
                }
              </ul>
            </section>

            <section class="rounded-xl bg-okg-500/10 border border-okg-500/30 p-4">
              <p class="text-sm text-pit-100 font-medium flex items-start gap-2">
                <lucide-icon name="radio-tower" class="w-4 h-4 mt-0.5 shrink-0 text-okg-500"></lucide-icon>
                <span>{{ 'demo.accounts' | t }}</span>
              </p>
              <ul class="mt-3 space-y-1.5">
                @for (acc of accounts; track acc.email) {
                  <li class="flex items-center gap-2 text-xs">
                    <span class="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-pit-700 text-pit-200">{{ acc.role }}</span>
                    <span class="mono text-pit-400">{{ acc.email }}</span>
                  </li>
                }
                <li class="text-[11px] text-pit-400 pt-1">{{ es() ? 'Contraseña' : 'Password' }}: <span class="mono text-pit-200">Operator123!</span></li>
              </ul>
            </section>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-pit-400 mb-3">{{ 'demo.shortcuts' | t }}</h3>
              <ul class="space-y-2 text-sm">
                <li class="flex items-center gap-2"><span class="kbd">?</span><span class="text-pit-400">{{ 'demo.help' | t }}</span></li>
                <li class="flex items-center gap-2"><span class="kbd">Esc</span><span class="text-pit-400">{{ es() ? 'Cerrar panel / tour' : 'Close panel / tour' }}</span></li>
              </ul>
            </section>

            <a routerLink="/about" (click)="demo.closeHelp()"
              class="flex items-center gap-2 text-sm font-semibold text-okg-500 hover:text-okg-500/80 transition-colors pt-2">
              <lucide-icon name="compass" class="w-4 h-4"></lucide-icon>{{ 'demo.aboutProject' | t }}
              <lucide-icon name="chevron-left" class="w-4 h-4 rotate-180 ml-auto"></lucide-icon>
            </a>
          </div>
        </aside>
      </div>
    }
  `,
})
export class HelpPanelComponent {
  readonly demo = inject(DemoService);
  private readonly i18n = inject(I18nService);
  readonly es = () => this.i18n.lang() === 'es';

  readonly realKeys = ['demo.real1', 'demo.real2', 'demo.real3', 'demo.real4'];
  readonly tryKeys = ['demo.try1', 'demo.try2', 'demo.try3'];
  readonly accounts = [
    { role: 'Operator', email: 'operator@sensorscope.app' },
    { role: 'Viewer', email: 'viewer@sensorscope.app' },
  ];
}
