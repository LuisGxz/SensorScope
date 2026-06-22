import { Injectable, computed, signal } from '@angular/core';
import { Observable, of, tap, throwError } from 'rxjs';
import { AuthResponse, MeResponse, UserDto } from '../models/models';

const ACCESS_KEY = 'ss-access';
const REFRESH_KEY = 'ss-refresh';
const USER_KEY = 'ss-user';

// Static demo: auth is validated in the browser against the seeded operator accounts.
const ACCOUNTS: Record<string, { password: string; user: UserDto }> = {
  'operator@sensorscope.io': { password: 'Operator123!', user: { id: 'u1', email: 'operator@sensorscope.io', displayName: 'Ana Ríos' } },
  'viewer@sensorscope.io': { password: 'Operator123!', user: { id: 'u2', email: 'viewer@sensorscope.io', displayName: 'Sam Vega' } },
};

function localTokens() {
  const day = 86_400_000;
  return { accessToken: 'local', accessTokenExpiresAt: new Date(Date.now() + day).toISOString(), refreshToken: 'local', refreshTokenExpiresAt: new Date(Date.now() + 7 * day).toISOString() };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<UserDto | null>(null);
  private accessToken: string | null = this.read(ACCESS_KEY);
  private refreshToken: string | null = this.read(REFRESH_KEY);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  hasTokens(): boolean { return !!this.accessToken; }
  getAccessToken(): string | null { return this.accessToken; }
  getRefreshToken(): string | null { return this.refreshToken; }

  login(email: string, password: string): Observable<AuthResponse> {
    const acct = ACCOUNTS[email.trim().toLowerCase()];
    if (!acct || acct.password !== password)
      return throwError(() => ({ code: 'invalid_credentials', message: 'Invalid email or password.' }));
    return of({ user: acct.user, tokens: localTokens() } as AuthResponse).pipe(tap((r) => this.apply(r)));
  }
  refresh(): Observable<AuthResponse> {
    const u = this.storedUser();
    if (!u) return throwError(() => ({ code: 'unauthorized', message: 'No session' }));
    return of({ user: u, tokens: localTokens() } as AuthResponse).pipe(tap((r) => this.apply(r)));
  }
  loadMe(): Observable<MeResponse> {
    const u = this.storedUser();
    if (u) this._user.set(u);
    return of({ user: u } as MeResponse);
  }
  logout(): void { this.clear(); }
  clear(): void {
    this.accessToken = null; this.refreshToken = null; this._user.set(null);
    this.remove(ACCESS_KEY); this.remove(REFRESH_KEY); this.remove(USER_KEY);
  }

  private apply(r: AuthResponse): void {
    this.accessToken = r.tokens.accessToken; this.refreshToken = r.tokens.refreshToken;
    this.write(ACCESS_KEY, r.tokens.accessToken); this.write(REFRESH_KEY, r.tokens.refreshToken);
    this.write(USER_KEY, JSON.stringify(r.user)); this._user.set(r.user);
  }
  private storedUser(): UserDto | null { try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
  private read(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
  private write(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  private remove(k: string): void { try { localStorage.removeItem(k); } catch { /* ignore */ } }
}
