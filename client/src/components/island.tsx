interface IslandProps {
  hue: number
  wide?: boolean
  trees?: number
  className?: string
}

function Palm({
  scale = 1,
  flip = false,
  delay = '0s',
}: {
  scale?: number
  flip?: boolean
  delay?: string
}) {
  const leaf = 'oklch(0.68 0.15 150)'
  const shade = 'oklch(0.52 0.12 150)'

  return (
    <svg
      viewBox="0 0 12 14"
      width={36 * scale}
      height={42 * scale}
      shapeRendering="crispEdges"
      style={
        flip
          ? { transform: 'scaleX(-1)', transformOrigin: 'bottom' }
          : undefined
      }
      aria-hidden
    >
      <g
        className="animate-sway"
        style={{
          transformOrigin: '6px 13px',
          transformBox: 'view-box',
          animationDelay: delay,
        }}
      >
        <rect x="5" y="5" width="2" height="8" fill="oklch(0.55 0.08 70)" />
        <rect x="5" y="8" width="2" height="1" fill="oklch(0.45 0.07 70)" />
        <rect x="4" y="2" width="4" height="1" fill={leaf} />
        <rect x="2" y="3" width="8" height="1" fill={leaf} />
        <rect x="1" y="4" width="2" height="1" fill={shade} />
        <rect x="9" y="4" width="2" height="1" fill={shade} />
        <rect x="3" y="1" width="2" height="1" fill={shade} />
        <rect x="7" y="1" width="2" height="1" fill={shade} />
        <rect x="4" y="5" width="1" height="1" fill="oklch(0.45 0.06 70)" />
        <rect x="7" y="5" width="1" height="1" fill="oklch(0.45 0.06 70)" />
      </g>
    </svg>
  )
}

const palms = [
  { left: '24%', ground: '40%', scale: 1.15, delay: '0.2s' },
  { left: '78%', ground: '41%', scale: 1.4, flip: true, delay: '0.8s' },
  { left: '36%', ground: '34%', scale: 0.55, delay: '0.4s' },
  { left: '63%', ground: '33%', scale: 0.72, flip: true, delay: '1.1s' },
]

export function Island({ hue, wide, trees = 1, className = '' }: IslandProps) {
  const grass = `oklch(0.72 0.17 ${hue})`
  const grassShade = `oklch(0.58 0.14 ${hue})`
  const wave = 'oklch(0.72 0.07 235)'
  const foam = 'oklch(0.92 0.03 220)'
  const svgHeight = wide ? 160 : 96

  return (
    <div
      className={`pointer-events-none relative z-0 ${wide ? 'w-full' : 'w-64'} ${className}`}
      style={{ marginTop: -Math.round((32 / 96) * svgHeight) }}
      aria-hidden
    >
      <svg
        viewBox="0 0 256 96"
        shapeRendering="crispEdges"
        preserveAspectRatio={wide ? 'none' : 'xMidYMid meet'}
        className={`block w-full ${wide ? 'h-40' : 'h-24'}`}
      >
        <rect x="0" y="52" width="256" height="5" fill="oklch(0.48 0.1 240)" />
        <rect x="0" y="57" width="256" height="12" fill="oklch(0.4 0.09 245)" />
        <rect x="0" y="69" width="256" height="27" fill="oklch(0.3 0.08 250)" />
        <rect x="0" y="52" width="256" height="1" fill={wave} opacity="0.5" />

        <rect x="48" y="52" width="160" height="6" fill="oklch(0.42 0.07 55)" />
        <rect x="58" y="58" width="140" height="6" fill="oklch(0.35 0.06 55)" />
        <rect x="72" y="64" width="112" height="5" fill="oklch(0.29 0.05 55)" />
        <rect x="88" y="69" width="80" height="4" fill="oklch(0.24 0.04 55)" />
        <rect x="102" y="73" width="52" height="3" fill="oklch(0.24 0.04 55)" />

        <rect x="76" y="32" width="104" height="4" fill={grass} />
        <rect x="64" y="36" width="128" height="4" fill={grassShade} />
        <rect x="54" y="40" width="148" height="4" fill="oklch(0.8 0.09 85)" />
        <rect x="48" y="44" width="160" height="5" fill="oklch(0.74 0.08 80)" />
        <rect x="44" y="49" width="168" height="3" fill="oklch(0.62 0.07 75)" />

        <rect x="62" y="29" width="8" height="4" fill="oklch(0.55 0.02 70)" />
        <rect x="62" y="29" width="3" height="2" fill="oklch(0.66 0.02 70)" />
        <rect x="188" y="30" width="5" height="3" fill="oklch(0.55 0.02 70)" />
        <rect x="104" y="30" width="2" height="2" fill={grassShade} />
        <rect x="140" y="30" width="2" height="2" fill={grassShade} />
        <rect x="168" y="30" width="2" height="2" fill={grassShade} />

        <g className="animate-drift">
          <rect x="44" y="50" width="168" height="2" fill={foam} />
          <rect x="34" y="51" width="10" height="2" fill={foam} />
          <rect x="212" y="51" width="10" height="2" fill={foam} />
        </g>
        <g className="animate-drift" style={{ animationDelay: '1.2s' }} opacity="0.6">
          <rect x="40" y="52" width="176" height="1" fill={foam} />
          <rect x="28" y="52" width="8" height="2" fill={foam} />
          <rect x="220" y="52" width="8" height="2" fill={foam} />
        </g>
        <g className="animate-drift" opacity="0.5" fill={wave}>
          <rect x="18" y="62" width="16" height="2" />
          <rect x="226" y="62" width="12" height="2" />
        </g>
        <g
          className="animate-drift"
          style={{ animationDelay: '0.8s' }}
          opacity="0.5"
          fill={wave}
        >
          <rect x="34" y="78" width="12" height="2" />
          <rect x="200" y="80" width="18" height="2" />
        </g>
        <g
          className="animate-drift"
          style={{ animationDelay: '1.6s' }}
          opacity="0.5"
          fill={wave}
        >
          <rect x="120" y="72" width="22" height="2" />
          <rect x="60" y="86" width="10" height="2" />
        </g>
      </svg>
      {palms.slice(0, Math.min(palms.length, Math.max(1, trees))).map((palm) => (
        <div
          key={`${palm.left}-${palm.scale}`}
          className="pointer-events-none absolute"
          style={{
            left: palm.left,
            top: palm.ground,
            zIndex: Math.round(palm.scale * 10),
            transform: 'translate(-50%, -100%)',
          }}
        >
          <Palm scale={palm.scale} flip={palm.flip} delay={palm.delay} />
        </div>
      ))}
    </div>
  )
}
