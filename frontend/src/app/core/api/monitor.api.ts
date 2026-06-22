import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AlertDto, DeviceSummaryDto, SeriesResponseDto, SummaryDto, ThresholdUpdateRequest } from '../models/models';
import { SimEngine } from '../sim/sim-engine';

/** Static demo: served by the in-browser simulator instead of the .NET API. */
@Injectable({ providedIn: 'root' })
export class MonitorApi {
  private readonly sim = inject(SimEngine);

  summary(): Observable<SummaryDto> { this.sim.start(); return of(this.sim.summary()); }
  devices(): Observable<DeviceSummaryDto[]> { this.sim.start(); return of(this.sim.list()); }
  device(idOrCode: string): Observable<DeviceSummaryDto> {
    const d = this.sim.one(idOrCode);
    return d ? of(d) : throwError(() => ({ code: 'not_found', message: 'Device not found' }));
  }
  series(deviceId: string, range: string): Observable<SeriesResponseDto> { return of(this.sim.series(deviceId, range)); }
  updateThresholds(deviceId: string, req: ThresholdUpdateRequest): Observable<DeviceSummaryDto> {
    const d = this.sim.updateThresholds(deviceId, req);
    return d ? of(d) : throwError(() => ({ code: 'not_found', message: 'Device not found' }));
  }
  alerts(filter: string): Observable<AlertDto[]> { return of(this.sim.alertList(filter)); }
  acknowledge(alertId: string): Observable<void> { this.sim.acknowledge(alertId); return of(void 0); }
}
