/** Mirrors of the backend DTOs (SensorScope.Application.*). */

export type AlertLevel = 'Ok' | 'Warn' | 'Crit';
export type ThresholdDirection = 'Above' | 'Below';
export type DeviceKind =
  | 'Temperature' | 'Pressure' | 'Vibration' | 'Flow' | 'Power' | 'Humidity' | 'AirQuality' | 'Level';

export interface UserDto { id: string; email: string; displayName: string; }
export interface AuthTokens {
  accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string;
}
export interface AuthResponse { user: UserDto; tokens: AuthTokens; }
export interface MeResponse { user: UserDto; }

export interface DeviceSummaryDto {
  id: string;
  code: string;
  name: string;
  location: string;
  kind: DeviceKind;
  unit: string;
  level: AlertLevel;
  lastValue: number | null;
  online: boolean;
  lastReadingAt: string | null;
  direction: ThresholdDirection;
  warnThreshold: number | null;
  critThreshold: number | null;
  sparkline: number[];
}

export interface SeriesPoint { time: string; avg: number; min: number; max: number; }
export interface SeriesResponseDto { deviceId: string; range: string; bucket: string; points: SeriesPoint[]; }

export interface AlertDto {
  id: string;
  deviceCode: string;
  deviceName: string;
  level: AlertLevel;
  message: string;
  value: number;
  threshold: number;
  raisedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  active: boolean;
}

export interface SummaryDto { total: number; ok: number; warn: number; crit: number; online: number; }

export interface ThresholdUpdateRequest {
  direction: ThresholdDirection;
  warnThreshold: number | null;
  critThreshold: number | null;
}

// ── Realtime (SignalR) ──
export interface ReadingEventDto { deviceId: string; code: string; time: string; value: number; level: AlertLevel; }
export interface AlertResolvedDto { alertId: string; deviceId: string; }

export interface ApiError { code: string; message: string; errors?: Record<string, string[]> | null; }
