import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AlertDto, AlertResolvedDto, ReadingEventDto } from '../models/models';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Wraps the SignalR monitor hub: connection lifecycle + live event streams. */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private connection?: signalR.HubConnection;

  readonly state = signal<ConnectionState>('disconnected');
  readonly reading$ = new Subject<ReadingEventDto>();
  readonly alertRaised$ = new Subject<AlertDto>();
  readonly alertResolved$ = new Subject<AlertResolvedDto>();

  async connect(): Promise<void> {
    if (this.connection) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, { accessTokenFactory: () => this.auth.getAccessToken() ?? '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Critical)
      .build();

    connection.on('ReadingReceived', (r: ReadingEventDto) => this.reading$.next(r));
    connection.on('AlertRaised', (a: AlertDto) => this.alertRaised$.next(a));
    connection.on('AlertResolved', (a: AlertResolvedDto) => this.alertResolved$.next(a));

    connection.onreconnecting(() => this.state.set('reconnecting'));
    connection.onreconnected(() => this.state.set('connected'));
    connection.onclose(() => this.state.set('disconnected'));

    this.connection = connection;
    this.state.set('connecting');
    try { await connection.start(); this.state.set('connected'); }
    catch { this.state.set('disconnected'); }
  }

  async disconnect(): Promise<void> {
    const c = this.connection;
    if (!c) return;
    this.connection = undefined;
    this.state.set('disconnected');
    try { await c.stop(); } catch { /* ignore */ }
  }
}
