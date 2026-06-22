import { Injectable, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AlertDto, AlertResolvedDto, ReadingEventDto } from '../models/models';
import { SimEngine } from '../sim/sim-engine';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Static demo: the realtime feed is driven by the in-browser simulator instead of a
 * SignalR hub. Same public surface so the store/components are unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly sim = inject(SimEngine);

  readonly state = computed<ConnectionState>(() => (this.sim.running() ? 'connected' : 'disconnected'));
  readonly reading$: Subject<ReadingEventDto> = this.sim.reading$;
  readonly alertRaised$: Subject<AlertDto> = this.sim.alertRaised$;
  readonly alertResolved$: Subject<AlertResolvedDto> = this.sim.alertResolved$;

  async connect(): Promise<void> { this.sim.start(); }
  async disconnect(): Promise<void> { /* keep the simulator running across views */ }
}
