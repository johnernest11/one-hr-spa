<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import { computed } from 'vue'

const props = defineProps<{
  darkMode?: boolean
  categories: string[]
  series: { name: string; data: number[] }[]
  colors?: string[]
}>()

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    // Set both height and width to 100% to ensure it fills the container
    height: '100%',
    width: '100%',
    stacked: false,
    toolbar: { show: false },
    foreColor: props.darkMode ? '#E5E7EB' : '#374151',
    background: 'transparent',
  },
  theme: {
    mode: props.darkMode ? 'dark' : 'light',
  },
  colors: props.colors || ['#6aa84f', '#cc0000'],

  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '80%', // Adjusted for slightly more spacing between groups
      borderRadius: 4,
    },
  },
  dataLabels: {
    enabled: false, // Ensures no numeric values are shown on the bars
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent'],
  },
  xaxis: {
    categories: props.categories,
    labels: {
      style: {
        colors: props.darkMode ? '#E5E7EB' : '#374151',
      },
      rotate: -45, // Keep rotation for better readability on smaller screens if categories are long
      offsetY: 0,
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: props.darkMode ? '#E5E7EB' : '#374151',
      },
    },
    // Removed y-axis title "Count"
    title: {
      text: undefined, // Set to undefined to remove the y-axis title
    },
  },
  legend: {
    position: 'bottom',
    labels: {
      colors: props.darkMode ? '#E5E7EB' : '#374151',
    },
    fontSize: '12px',
    offsetY: 0,
  },
  fill: {
    opacity: 1,
    colors: props.colors || ['#6aa84f', '#cc0000'],
  },
  tooltip: {
    y: {
      formatter: (val: number) => val.toString(),
    },
    theme: props.darkMode ? 'dark' : 'light',
  },
  grid: {
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
    borderColor: props.darkMode ? '#4a5568' : '#e2e8f0',
  },
  // Removed the responsive array to allow the chart to scale fluidly with its container
}))
</script>

<template>
  <div class="flex h-full w-full flex-col rounded-lg bg-white dark:bg-gray-800">
    <VueApexCharts type="bar" height="100%" width="100%" :options="chartOptions" :series="props.series" />
  </div>
</template>
