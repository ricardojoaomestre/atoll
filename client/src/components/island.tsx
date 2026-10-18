interface IslandProps {
  hue: number
  wide?: boolean
  className?: string
}

export function Island({ hue, wide, className = '' }: IslandProps) {
  const top = `oklch(0.72 0.14 ${hue})`
  const mid = `oklch(0.42 0.08 ${hue + 20})`
  const deep = `oklch(0.32 0.06 ${hue + 30})`

  return (
    <div
      className={`pointer-events-none mx-auto flex flex-col items-center ${className}`}
      aria-hidden
    >
      <div
        className="h-5 border-[3px] border-border"
        style={{
          width: wide ? '92%' : '78%',
          background: top,
          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.2)',
        }}
      />
      <div
        className="h-5 border-x-[3px] border-b-[3px] border-border"
        style={{ width: wide ? '78%' : '64%', background: mid }}
      />
      <div
        className="h-5 border-x-[3px] border-b-[3px] border-border"
        style={{ width: wide ? '62%' : '50%', background: deep }}
      />
      <div
        className="h-4 border-x-[3px] border-b-[3px] border-border"
        style={{
          width: wide ? '46%' : '36%',
          background: `oklch(0.24 0.04 ${hue + 40})`,
        }}
      />
    </div>
  )
}
