import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { ApiError } from '../../core/models/models';

interface Demo { label: string; email: string; }
const DEMO: Demo[] = [
  { label: 'Operator', email: 'operator@sensorscope.app' },
  { label: 'Viewer', email: 'viewer@sensorscope.app' },
];

@Component({
  selector: 'ss-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, TPipe],
  template: `
    <div class="min-h-screen flex flex-col bg-pit-950">
      <header class="flex items-center justify-between px-6 py-4">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-okg-500 grid place-items-center"><lucide-icon name="radio-tower" class="w-4 h-4 text-pit-950"></lucide-icon></span>
          <span class="font-semibold text-white">SensorScope</span>
        </div>
        <button (click)="i18n.toggle()" class="h-9 px-3 rounded-lg border border-pit-700 bg-pit-900 text-xs font-semibold hover:border-pit-500 transition-colors flex items-center gap-1.5">
          <lucide-icon name="languages" class="w-3.5 h-3.5"></lucide-icon>{{ i18n.lang() === 'en' ? 'EN' : 'ES' }}
        </button>
      </header>

      <main class="flex-1 grid place-items-center px-4 py-8">
        <div class="w-full max-w-md">
          <div class="rounded-2xl border border-pit-700 bg-pit-900 p-7 shadow-xl">
            <p class="mono text-xs text-okg-500 uppercase tracking-widest mb-2">North Plant</p>
            <h1 class="text-2xl font-semibold tracking-tight">{{ 'auth.welcome' | t }}</h1>
            <p class="text-sm text-pit-300 mt-1 mb-7">{{ 'auth.subtitle' | t }}</p>

            <form (ngSubmit)="submit()" class="space-y-4">
              <label class="block">
                <span class="text-xs font-semibold text-pit-300">{{ 'common.email' | t }}</span>
                <div class="relative mt-1.5">
                  <lucide-icon name="mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pit-400"></lucide-icon>
                  <input name="email" type="email" autocomplete="email" required [(ngModel)]="email" [disabled]="loading()"
                    class="w-full rounded-lg border border-pit-700 bg-pit-800 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-okg-500 transition-colors"
                    placeholder="operator@sensorscope.app" />
                </div>
              </label>
              <label class="block">
                <span class="text-xs font-semibold text-pit-300">{{ 'common.password' | t }}</span>
                <div class="relative mt-1.5">
                  <lucide-icon name="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pit-400"></lucide-icon>
                  <input name="password" type="password" autocomplete="current-password" required [(ngModel)]="password" [disabled]="loading()"
                    class="w-full rounded-lg border border-pit-700 bg-pit-800 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-okg-500 transition-colors"
                    placeholder="••••••••" />
                </div>
              </label>

              @if (error()) {
                <p class="flex items-center gap-2 text-xs font-medium text-crit-500 bg-crit-900 rounded-lg px-3 py-2">
                  <lucide-icon name="alert-circle" class="w-4 h-4 shrink-0"></lucide-icon>{{ error() }}
                </p>
              }

              <button type="submit" [disabled]="loading() || !email() || !password()"
                class="w-full rounded-lg bg-okg-500 hover:bg-okg-500/90 disabled:opacity-50 text-pit-950 text-sm font-bold py-2.5 transition-colors flex items-center justify-center gap-2">
                @if (loading()) { <lucide-icon name="loader" class="w-4 h-4 animate-spin"></lucide-icon>{{ 'auth.signingIn' | t }} }
                @else { {{ 'auth.signIn' | t }} }
              </button>
            </form>

            <div class="mt-7 pt-6 border-t border-pit-700">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold text-pit-300">{{ 'auth.demoAccounts' | t }}</p>
                <span class="text-[10px] mono text-okg-500 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-okg-500 pulse-data"></span>{{ 'auth.demoHint' | t }}</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                @for (acc of demo; track acc.email) {
                  <button type="button" (click)="useDemo(acc)" [disabled]="loading()"
                    class="text-left rounded-lg border border-pit-700 bg-pit-800 px-3 py-2 hover:border-okg-500 transition-colors">
                    <span class="block text-xs font-bold">{{ acc.label }}</span>
                    <span class="block text-[10px] mono text-pit-400 truncate">{{ acc.email }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
          <p class="text-center text-[11px] text-pit-400 mt-5 mono">SensorScope · industrial IoT monitoring · Luis Chiquito Vera</p>
        </div>
      </main>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly demo = DEMO;
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  useDemo(acc: Demo): void {
    this.email.set(acc.email);
    this.password.set('Operator123!');
    this.submit();
  }

  submit(): void {
    if (this.loading() || !this.email() || !this.password()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email(), this.password()).subscribe({
      next: () => this.router.navigateByUrl('/app'),
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.msg(err)); },
    });
  }

  private msg(err: HttpErrorResponse): string {
    if (err.status === 0) return this.i18n.t('error.network');
    const code = (err.error as ApiError | undefined)?.code;
    const key = code ? `error.${code}` : 'error.generic';
    const tr = this.i18n.t(key);
    return tr === key ? (err.error as ApiError)?.message ?? this.i18n.t('error.generic') : tr;
  }
}
