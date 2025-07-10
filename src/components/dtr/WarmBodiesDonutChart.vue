<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import { computed } from 'vue'

type DonutChartPayload = {
  series: number[]
  labels: string[]
  colors: string[]
  darkMode: boolean
}

export interface DonutFormatterOptions {
  w: {
    config: {
      series: number[]
    }
  }
  seriesIndex: number
}

const props = defineProps<DonutChartPayload>()

const options = {
  theme: {
    mode: props.darkMode ? 'dark' : 'light',
  },
  chart: {
    background: 'transparent',
  },
  labels: props.labels,
  colors: props.colors,
  fill: {
    type: 'solid',
    opacity: 0.85,
  },
  dataLabels: {
    enabled: true,
    formatter: function (_: number, opts: DonutFormatterOptions) {
      // Show the raw number for each slice instead of percent
      return opts.w.config.series[opts.seriesIndex]
    },
  },
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          name: {
            show: true,
          },
          value: {
            show: true,
            formatter: function (val: string) {
              // This will show the raw number instead of a percentage
              return parseInt(val).toString()
            },
          },
        },
      },
    },
  },
  responsive: [
    {
      breakpoint: 900,
      options: {
        chart: {
          width: 300,
          height: 300,
          offsetX: 20,
        },
        legend: {
          position: 'bottom',
          fontSize: '11px',
        },
      },
    },
  ],
}

const total = computed(() => props.series.reduce((sum, val) => sum + val, 0))
</script>

<template>
  <div class="relative h-full w-full rounded-lg bg-surface-0 py-4 dark:bg-surface-700">
    <div class="flex justify-end px-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Total: {{ total }}</div>
    <div class="flex items-center justify-center">
      <VueApexCharts class="w-full" type="donut" :series="props.series" :options="options" />
    </div>
  </div>
</template>

<style scoped></style>
