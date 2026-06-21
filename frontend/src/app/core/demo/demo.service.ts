import { Injectable, signal } from '@angular/core';

export interface TourStep {
  target: string | null;
  title: { en: string; es: string };
  body: { en: string; es: string };
}

const SEEN_KEY = 'ss-tour-seen';

/** Coordinates the guided-demo layer: the "How to explore" panel and the coach-mark tour. */
@Injectable({ providedIn: 'root' })
export class DemoService {
  readonly helpOpen = signal(false);
  readonly tourActive = signal(false);
  readonly stepIndex = signal(0);

  readonly steps: TourStep[] = [
    {
      target: null,
      title: { en: 'Welcome to the control room', es: 'Bienvenido a la sala de control' },
      body: {
        en: 'SensorScope is a live industrial IoT monitor — telemetry streaming, time-series charts and threshold alerts, powered by .NET SignalR + TimescaleDB. Take the 30-second tour.',
        es: 'SensorScope es un monitor IoT industrial en vivo — telemetría en streaming, gráficos de series temporales y alertas por umbrales, con .NET SignalR + TimescaleDB. Haz el tour de 30 segundos.',
      },
    },
    {
      target: '[data-tour="grid"]',
      title: { en: 'The plant, at a glance', es: 'La planta, de un vistazo' },
      body: {
        en: 'Every device streams its latest reading and a sparkline. Colour means status — green OK, amber WARN, red CRIT. Click any card to drill into its history.',
        es: 'Cada dispositivo transmite su última lectura y un sparkline. El color indica el estado — verde OK, ámbar WARN, rojo CRIT. Pulsa una tarjeta para ver su historial.',
      },
    },
    {
      target: '[data-tour="status"]',
      title: { en: 'It’s genuinely live', es: 'Es de verdad en vivo' },
      body: {
        en: 'Readings arrive over SignalR every couple of seconds — a telemetry simulator keeps the plant breathing even when you’re here alone. Watch the values and these counters move.',
        es: 'Las lecturas llegan por SignalR cada par de segundos — un simulador de telemetría mantiene viva la planta aunque entres solo. Mira moverse los valores y estos contadores.',
      },
    },
    {
      target: '[data-tour="alerts"]',
      title: { en: 'Alerts & thresholds', es: 'Alertas y umbrales' },
      body: {
        en: 'When a reading crosses a threshold the engine raises an alert here, escalating WARN→CRIT and resolving on its own. On a device you can retune thresholds and acknowledge alerts.',
        es: 'Cuando una lectura cruza un umbral, el motor levanta una alerta aquí, escala WARN→CRIT y se resuelve sola. En cada dispositivo puedes reajustar umbrales y reconocer alertas.',
      },
    },
    {
      target: '[data-tour="help"]',
      title: { en: 'Explore freely', es: 'Explora libremente' },
      body: {
        en: 'Reopen this guide anytime from here. Try opening a device, switching the chart range, or editing a threshold to trigger an alert.',
        es: 'Reabre esta guía cuando quieras desde aquí. Prueba a abrir un dispositivo, cambiar el rango del gráfico o editar un umbral para disparar una alerta.',
      },
    },
  ];

  openHelp(): void { this.helpOpen.set(true); }
  closeHelp(): void { this.helpOpen.set(false); }

  startTour(): void {
    this.helpOpen.set(false);
    this.stepIndex.set(0);
    this.tourActive.set(true);
  }

  next(): void {
    if (this.stepIndex() >= this.steps.length - 1) this.endTour();
    else this.stepIndex.update((i) => i + 1);
  }
  prev(): void { this.stepIndex.update((i) => Math.max(0, i - 1)); }

  endTour(): void {
    this.tourActive.set(false);
    this.markSeen();
  }

  maybeAutoStart(): void {
    if (!this.hasSeen()) setTimeout(() => this.startTour(), 900);
  }

  hasSeen(): boolean {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }
  private markSeen(): void {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }
}
