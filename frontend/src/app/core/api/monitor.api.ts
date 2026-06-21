import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertDto, DeviceSummaryDto, SeriesResponseDto, SummaryDto, ThresholdUpdateRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MonitorApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/api`;

  summary(): Observable<SummaryDto> {
    return this.http.get<SummaryDto>(`${this.base}/summary`);
  }
  devices(): Observable<DeviceSummaryDto[]> {
    return this.http.get<DeviceSummaryDto[]>(`${this.base}/devices`);
  }
  device(idOrCode: string): Observable<DeviceSummaryDto> {
    return this.http.get<DeviceSummaryDto>(`${this.base}/devices/${idOrCode}`);
  }
  series(deviceId: string, range: string): Observable<SeriesResponseDto> {
    return this.http.get<SeriesResponseDto>(`${this.base}/devices/${deviceId}/series?range=${range}`);
  }
  updateThresholds(deviceId: string, req: ThresholdUpdateRequest): Observable<DeviceSummaryDto> {
    return this.http.put<DeviceSummaryDto>(`${this.base}/devices/${deviceId}/thresholds`, req);
  }
  alerts(filter: string): Observable<AlertDto[]> {
    return this.http.get<AlertDto[]>(`${this.base}/alerts?filter=${filter}`);
  }
  acknowledge(alertId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/alerts/${alertId}/ack`, {});
  }
}
