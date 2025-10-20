<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'

type DonutChartPayload = {
  series: number[]
  labels: string[]
  colors: string[]
  darkMode: boolean
}

const props = defineProps<DonutChartPayload>()

const options = {
  theme: {
    mode: props.darkMode ? 'dark' : 'light',
  },
  chart: {
    height: 500,
    background: 'transparent',
  },
  labels: props.labels.map((label, i) => `${label}: ${props.series[i]}`),
  colors: props.colors,
  fill: {
    type: 'solid',
    opacity: 0.85,
  },
  dataLabels: {
    enabled: true,
    style: {
      fontSize: '10px',
      fontWeight: 'bold',
    },
  },
  legend: {
    position: 'bottom',
    labels: {
      useSeriesColors: false,
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
</script>

<template>
  <div :class="['flex h-full w-full items-center justify-center py-4 lg:py-0', $attrs.class]">
    <VueApexCharts class="w-full" type="donut" :series="props.series" :options="options" />
  </div>
</template>

<style scoped></style>
