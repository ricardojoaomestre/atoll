import type { ReactNode } from 'react'

const brass = 'oklch(0.74 0.12 78)'
const brassShade = 'oklch(0.48 0.08 62)'
const brassHi = 'oklch(0.88 0.08 92)'
const glass = 'oklch(0.78 0.06 220)'
const ink = 'oklch(0.38 0.05 55)'
const parchment = 'oklch(0.88 0.045 88)'
const parchmentShade = 'oklch(0.78 0.05 78)'
const grass = 'oklch(0.64 0.12 145)'
const sand = 'oklch(0.8 0.07 85)'

export function Monocular() {
  return (
    <svg
      viewBox="0 0 36 18"
      width={168}
      height={84}
      shapeRendering="crispEdges"
      aria-hidden
      className="animate-glass-scan"
      style={{ transformOrigin: '6px 12px', transformBox: 'view-box' }}
    >
      <rect x="1" y="14" width="10" height="2" fill={brassShade} />
      <rect x="0" y="15" width="4" height="2" fill={brass} />
      <rect x="2" y="7" width="4" height="5" fill={brassShade} />
      <rect x="4" y="6" width="3" height="7" fill={brass} />
      <rect x="7" y="7" width="14" height="5" fill={brass} />
      <rect x="7" y="7" width="14" height="1" fill={brassHi} />
      <rect x="12" y="6" width="2" height="7" fill={brassShade} />
      <rect x="17" y="6" width="2" height="7" fill={brassShade} />
      <rect x="21" y="5" width="3" height="9" fill={brass} />
      <rect x="24" y="3" width="2" height="13" fill={brassShade} />
      <rect x="26" y="2" width="8" height="15" fill={brass} />
      <rect x="27" y="3" width="6" height="13" fill={brassShade} />
      <rect x="28" y="4" width="4" height="11" fill={glass} />
      <rect x="28" y="4" width="1" height="3" fill={brassHi} />
      <rect x="31" y="12" width="1" height="2" fill="oklch(0.55 0.05 230)" />
    </svg>
  )
}

export function Compass() {
  return (
    <svg viewBox="0 0 24 24" width={112} height={112} shapeRendering="crispEdges" aria-hidden>
      <rect x="8" y="0" width="8" height="2" fill={brassShade} />
      <rect x="4" y="2" width="16" height="2" fill={brass} />
      <rect x="2" y="4" width="20" height="2" fill={brassShade} />
      <rect x="0" y="6" width="24" height="12" fill={brass} />
      <rect x="2" y="18" width="20" height="2" fill={brassShade} />
      <rect x="4" y="20" width="16" height="2" fill={brass} />
      <rect x="8" y="22" width="8" height="2" fill={brassShade} />

      <rect x="9" y="3" width="6" height="1" fill={parchment} />
      <rect x="6" y="4" width="12" height="2" fill={parchment} />
      <rect x="4" y="6" width="16" height="12" fill={parchment} />
      <rect x="6" y="18" width="12" height="2" fill={parchmentShade} />
      <rect x="9" y="20" width="6" height="1" fill={parchmentShade} />

      <rect x="11" y="5" width="2" height="1" fill={ink} />
      <rect x="11" y="6" width="1" height="2" fill={ink} />
      <rect x="12" y="6" width="1" height="2" fill={ink} />

      <rect x="6" y="11" width="2" height="1" fill={ink} />
      <rect x="16" y="11" width="2" height="1" fill={ink} />
      <rect x="11" y="17" width="2" height="1" fill={ink} />

      <g
        className="animate-compass-needle"
        style={{ transformOrigin: '12px 12px', transformBox: 'view-box' }}
      >
        <rect x="11" y="7" width="2" height="2" fill="oklch(0.58 0.2 28)" />
        <rect x="10" y="9" width="4" height="2" fill="oklch(0.58 0.2 28)" />
        <rect x="11" y="11" width="2" height="1" fill={ink} />
        <rect x="10" y="12" width="4" height="2" fill="oklch(0.32 0.03 250)" />
        <rect x="11" y="14" width="2" height="2" fill="oklch(0.32 0.03 250)" />
      </g>
      <rect x="11" y="11" width="2" height="2" fill={brassHi} />
    </svg>
  )
}

const sky = 'oklch(0.82 0.06 230)'
const haze = 'oklch(0.86 0.04 220)'
const seaFar = 'oklch(0.74 0.08 205)'
const seaMid = 'oklch(0.64 0.1 220)'
const seaNear = 'oklch(0.52 0.11 235)'
const crest = 'oklch(0.96 0.02 210)'
const leaf = 'oklch(0.62 0.14 150)'
const trunk = 'oklch(0.48 0.06 70)'

function driftValues(distance: number, reverse: boolean) {
  const sign = reverse ? 1 : -1
  const values = []
  for (let step = 0; step <= distance; step += 1) values.push(`${sign * step} 0`)
  for (let step = distance - 1; step > 0; step -= 1) values.push(`${sign * step} 0`)
  return values.join(';')
}

function Drift({
  distance,
  duration,
  reverse = false,
  children,
}: {
  distance: number
  duration: string
  reverse?: boolean
  children: ReactNode
}) {
  return (
    <g>
      {children}
      <animateTransform
        attributeName="transform"
        type="translate"
        values={driftValues(distance, reverse)}
        dur={duration}
        repeatCount="indefinite"
        calcMode="discrete"
      />
    </g>
  )
}

function Ripples({
  y,
  step,
  width,
  height,
  offset = 0,
  distance,
  duration,
  reverse = false,
}: {
  y: number
  step: number
  width: number
  height: number
  offset?: number
  distance: number
  duration: string
  reverse?: boolean
}) {
  const spans = []
  for (let x = offset - step; x < 80 + step; x += step) {
    spans.push(
      <rect key={`${y}-${x}`} x={x} y={y} width={width} height={height} fill={crest} />,
    )
  }
  return (
    <Drift distance={distance} duration={duration} reverse={reverse}>
      {spans}
    </Drift>
  )
}

function Swell({
  y,
  offset = 0,
  reverse = false,
}: {
  y: number
  offset?: number
  reverse?: boolean
}) {
  const spans = []
  for (let x = offset - 14; x < 94; x += 14) {
    spans.push(
      <rect key={`${y}-a-${x}`} x={x + 4} y={y} width={4} height={2} fill={crest} />,
      <rect key={`${y}-b-${x}`} x={x + 2} y={y + 2} width={2} height={1} fill={crest} />,
      <rect key={`${y}-c-${x}`} x={x + 8} y={y + 2} width={2} height={1} fill={crest} />,
    )
  }
  return (
    <Drift distance={4} duration="2.4s" reverse={reverse}>
      {spans}
    </Drift>
  )
}

export function SeaChart() {
  return (
    <svg
      viewBox="0 0 80 36"
      className="sea-chart mb-4 block h-auto w-full"
      overflow="hidden"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect width="80" height="8" fill={sky} />
      <rect y="7" width="80" height="2" fill={haze} />

      <rect y="8" width="80" height="8" fill={seaFar} />
      <rect y="16" width="80" height="8" fill={seaMid} />
      <rect y="24" width="80" height="12" fill={seaNear} />

      <Ripples y={11} step={9} width={2} height={1} distance={1} duration="4.8s" />
      <Ripples y={14} step={11} width={2} height={1} offset={4} distance={1} duration="4.2s" reverse />
      <Ripples y={19} step={12} width={3} height={1} offset={2} distance={2} duration="3.6s" />
      <Ripples y={22} step={10} width={4} height={1} offset={6} distance={2} duration="3.2s" reverse />
      <Swell y={28} />
      <Swell y={32} offset={7} reverse />

      <rect x="46" y="5" width="1" height="2" fill={trunk} />
      <rect x="45" y="5" width="3" height="1" fill={leaf} />
      <rect x="45" y="7" width="3" height="1" fill={grass} />
      <rect x="44" y="8" width="5" height="1" fill={sand} />
      <rect x="43" y="9" width="7" height="1" fill={crest} />
    </svg>
  )
}
