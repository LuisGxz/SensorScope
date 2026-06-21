import { Injectable, computed, inject, signal } from '@angular/core';
import { MonitorApi } from '../api/monitor.api';
import { RealtimeService } from '../realtime/realtime.service';
import { DeviceSummaryDto, ReadingEventDto } from '../models/models';

/**
 * App-wide live device state. Subscribes to the SignalR reading stream once and
 * keeps the device list (values / levels / sparklines) fresh for every screen
 * (dashboard grid, detail view, nav summary chips).
 */
@Injectable({ providedIn: 'root' })
export class MonitorStore {
  private readonly api = inject(MonitorApi);
  readonly rt = inject(RealtimeService);

  readonly devices = signal<DeviceSummaryDto[]>([]);
  readonly status = signal<'loading' | 'error' | 'ready'>('loading');

  readonly summary = computed(() => {
    const ds = this.devices();
    return {
      total: ds.length,
      ok: ds.filter((d) => d.level === 'Ok').length,
      warn: ds.filter((d) => d.level === 'Warn').length,
      crit: ds.filter((d) => d.level === 'Crit').length,
      online: ds.filter((d) => d.online).length,
    };
  });

  /** Active alerts = devices currently breaching a threshold. */
  readonly activeAlertCount = computed(() => this.summary().warn + this.summary().crit);

  constructor() {
    // Root service → lives for the app lifetime, no teardown needed.
    this.rt.reading$.subscribe((r) => this.applyReading(r));
  }

  /** Open the realtime connection and load the initial device snapshot. */
  async start(): Promise<void> {
    await this.rt.connect();
    this.load();
  }

  stop(): void {
    void this.rt.disconnect();
  }

  load(): void {
    this.status.set('loading');
    this.api.devices().subscribe({
      next: (devices) => {
        this.devices.set(devices);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  device(idOrCode: string): DeviceSummaryDto | undefined {
    const key = idOrCode.toLowerCase();
    return this.devices().find((d) => d.id === idOrCode || d.code.toLowerCase() === key);
  }

  /** Replace a device after a server mutation (e.g. threshold update). */
  patch(device: DeviceSummaryDto): void {
    this.devices.update((list) => list.map((d) => (d.id === device.id ? device : d)));
  }

  private applyReading(r: ReadingEventDto): void {
    this.devices.update((list) =>
      list.map((d) =>
        d.id === r.deviceId
          ? { ...d, lastValue: r.value, level: r.level, online: true, lastReadingAt: r.time, sparkline: [...d.sparkline.slice(-23), r.value] }
          : d,
      ),
    );
  }
}
