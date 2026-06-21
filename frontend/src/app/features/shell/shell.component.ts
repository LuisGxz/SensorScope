import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { DemoService } from '../../core/demo/demo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { MonitorStore } from '../../core/state/monitor.store';
import { TPipe } from '../../core/i18n/t.pipe';
import { HelpPanelComponent } from '../demo/help-panel.component';
import { TourComponent } from '../demo/tour.component';

/** Persistent app frame: top bar with live plant status + nav, hosting the routed screens. */
@Component({
  selector: 'ss-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TPipe, TourComponent, HelpPanelComponent],
  template: `
    <div class="min-h-screen bg-pit-950">
      <header class="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 bg-pit-950/90 backdrop-blur border-b border-pit-700">
        <a routerLink="/app" class="flex items-center gap-3 shrink-0">
          <span class="w-7 h-7 rounded-lg bg-okg-500 grid place-items-center"><lucide-icon name="radio-tower" class="w-4 h-4 text-pit-950"></lucide-icon></span>
          <span class="font-semibold text-white hidden sm:block">SensorScope</span>
        </a>
        <span class="mono text-xs text-pit-200 hidden lg:flex items-center gap-2 ml-1">
          <span class="w-2 h-2 rounded-full bg-okg-500 pulse-data"></span>NORTH PLANT · {{ 'dash.live' | t }}
        </span>

        <!-- Nav -->
        <nav class="flex items-center gap-1 ml-2 sm:ml-4 text-sm font-semibold">
          <a routerLink="/app" routerLinkActive="bg-pit-800 text-white" [routerLinkActiveOptions]="{ exact: true }"
            class="h-9 px-3 rounded-lg text-pit-300 hover:text-white hover:bg-pit-800 transition-colors flex items-center gap-2">
            <lucide-icon name="grid-3x3" class="w-4 h-4"></lucide-icon><span class="hidden sm:inline">{{ 'nav.devices' | t }}</span>
          </a>
          <a routerLink="/app/alerts" routerLinkActive="bg-pit-800 text-white" data-tour="alerts"
            class="h-9 px-3 rounded-lg text-pit-300 hover:text-white hover:bg-pit-800 transition-colors flex items-center gap-2 relative">
            <lucide-icon name="bell" class="w-4 h-4"></lucide-icon><span class="hidden sm:inline">{{ 'nav.alerts' | t }}</span>
            @if (store.activeAlertCount() > 0) {
              <span class="mono text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center"
                [class]="store.summary().crit > 0 ? 'bg-crit-500 text-pit-950 crit-blink' : 'bg-amb-500 text-pit-950'">{{ store.activeAlertCount() }}</span>
            }
          </a>
        </nav>

        <!-- Status chips -->
        <div class="ml-auto items-center gap-2 mono text-xs hidden md:flex" data-tour="status">
          <span class="rounded-md bg-okg-900 text-okg-500 px-2.5 py-1.5 font-bold">● {{ store.summary().ok }}</span>
          <span class="rounded-md bg-amb-900 text-amb-500 px-2.5 py-1.5 font-bold">▲ {{ store.summary().warn }}</span>
          <span class="rounded-md bg-crit-900 text-crit-500 px-2.5 py-1.5 font-bold">■ {{ store.summary().crit }}</span>
          <span class="text-pit-300 hidden lg:inline ml-1">{{ store.summary().online }}/{{ store.summary().total }} {{ 'dash.online' | t }}</span>
        </div>

        <div class="flex items-center gap-1.5 ml-auto md:ml-1">
          @if (rt.state() !== 'connected') {
            <span class="text-[11px] mono text-amb-500 flex items-center gap-1"><lucide-icon name="loader" class="w-3 h-3 animate-spin"></lucide-icon><span class="hidden sm:inline">{{ rt.state() === 'reconnecting' ? ('dash.reconnecting' | t) : ('dash.connecting' | t) }}</span></span>
          }
          <button (click)="demo.openHelp()" data-tour="help" [title]="('demo.help' | t)"
            class="h-9 px-2.5 rounded-lg text-xs font-semibold text-okg-500 hover:bg-pit-800 transition-colors flex items-center gap-1.5">
            <lucide-icon name="compass" class="w-4 h-4"></lucide-icon><span class="hidden lg:inline">{{ 'demo.explore' | t }}</span>
          </button>
          <button (click)="i18n.toggle()" class="h-9 px-2.5 rounded-lg text-xs font-semibold hover:bg-pit-800 transition-colors flex items-center gap-1.5">
            <lucide-icon name="languages" class="w-3.5 h-3.5"></lucide-icon>{{ i18n.lang() === 'en' ? 'EN' : 'ES' }}
          </button>
          <button (click)="signOut()" [title]="('auth.signOut' | t)" class="h-9 w-9 rounded-lg grid place-items-center text-pit-300 hover:bg-pit-800 hover:text-white transition-colors">
            <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </header>

      <router-outlet />

      <ss-help-panel />
      <ss-tour />
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly store = inject(MonitorStore);
  readonly rt = inject(RealtimeService);
  readonly i18n = inject(I18nService);
  readonly demo = inject(DemoService);

  ngOnInit(): void {
    void this.store.start();
    this.demo.maybeAutoStart();
  }

  ngOnDestroy(): void {
    this.store.stop();
  }

  /** Global keys: "?" toggles the explore guide; Esc dismisses the guide/tour. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.demo.tourActive()) { this.demo.endTour(); return; }
      if (this.demo.helpOpen()) { this.demo.closeHelp(); return; }
    }
    const el = event.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;
    if (event.key === '?') {
      event.preventDefault();
      this.demo.helpOpen() ? this.demo.closeHelp() : this.demo.openHelp();
    }
  }

  signOut(): void {
    this.store.stop();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
