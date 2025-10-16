<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'

const props = defineProps<{
  birthday?: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

interface Piece {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  vr: number
  rot: number
  color: string
}
let rafId: number | null = null
let pieces: Piece[] = []
let ctx: CanvasRenderingContext2D | null = null
let W = 0,
  H = 0

// check if today is the birthday
const isBirthday = computed(() => props.birthday ?? false)

const rand = (min: number, max: number): number => Math.random() * (max - min) + min

const resize = (): void => {
  if (!canvas.value) return
  const c = canvas.value
  const dpr = window.devicePixelRatio || 1

  // Ensure we match *real* visible area, including zoom
  const rect = c.getBoundingClientRect()
  W = rect.width * dpr
  H = rect.height * dpr

  c.width = W
  c.height = H

  ctx = c.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  createPieces(Math.floor((W * H) / 15000))
}

const createPieces = (count: number): void => {
  pieces = []
  const colors = ['#FF5C8A', '#7BE495', '#FFD166', '#83C5FD', '#FFB72B', '#CDB4DB']

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: rand(0, W),
      y: rand(-H, 0),
      w: rand(6, 12),
      h: rand(8, 14),
      vx: rand(-0.6, 0.6),
      vy: rand(1, 4),
      rot: rand(0, 360),
      vr: rand(-6, 6),
      color: colors[Math.floor(rand(0, colors.length))],
    })
  }
}

const draw = (): void => {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)

  for (const p of pieces) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate((p.rot * Math.PI) / 180)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    ctx.restore()

    // Movement updates
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr * 0.2
    p.vy += 0.02

    if (p.y > H + 20) {
      p.y = rand(-60, -10)
      p.x = rand(20, W - 20)
      p.vy = rand(1, 3)
    }
    if (p.x < -50) p.x = W + 50
    if (p.x > W + 50) p.x = -50
  }

  rafId = requestAnimationFrame(draw)
}

onMounted(async () => {
  if (!isBirthday.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  await nextTick()
  resize()
  draw()

  // Listen for both resize & zoom level changes (via resize observer)
  window.addEventListener('resize', resize)

  // Fallback: also re-check every few seconds for zoom changes
  setInterval(() => {
    if (canvas.value && canvas.value.width !== window.innerWidth * devicePixelRatio) {
      resize()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
})
</script>
<template>
  <canvas ref="canvas" class="confetti-canvas"></canvas>
</template>

<style scoped>
.confetti-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}
</style>
