import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';

/** A tiny ApexCharts line sparkline for the device cards. */
@Component({
  selector: 'ss-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgApexchartsModule],
  template: `
    <apx-chart
      [series]="series()"
      [chart]="chart"
      [colors]="[color()]"
      [stroke]="stroke"
      [tooltip]="tooltip"
      [fill]="fill"
    ></apx-chart>
  `,
})
export class SparklineComponent {
  readonly values = input<number[]>([]);
  readonly color = input<string>('#2ED573');

  readonly series = computed(() => [{ data: this.values() }]);

  readonly chart = {
    type: 'area' as const,
    height: 40,
    sparkline: { enabled: true },
    animations: { enabled: false },
  };
  readonly stroke = { curve: 'smooth' as const, width: 2 };
  readonly tooltip = { enabled: false };
  readonly fill = { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0 } };
}
