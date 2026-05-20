interface LogoProps {
  className?: string
  color?: string
}

export function LogoMark({ className = "h-8 w-7", color = "currentColor" }: LogoProps) {
  return (
    <svg viewBox="0 0 28 36" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Diamond gem silhouette */}
      <polygon
        points="14,1 26,11 14,35 2,11"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Crown facet line */}
      <polyline
        points="2,11 14,17 26,11"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.5"
      />
      {/* Left crown facets */}
      <line x1="8" y1="1" x2="14" y2="17" stroke={color} strokeWidth="0.8" opacity="0.3" />
      <line x1="20" y1="1" x2="14" y2="17" stroke={color} strokeWidth="0.8" opacity="0.3" />
      {/* Top edge points */}
      <line x1="8" y1="1" x2="14" y2="1" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0" />
    </svg>
  )
}

export function LogoWordmark({ className = "text-zinc-900" }: { className?: string }) {
  return (
    <span
      className={`font-light tracking-[0.22em] uppercase text-sm select-none ${className}`}
      style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
    >
      French&nbsp;Nails
    </span>
  )
}

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-7 w-6" />
      <LogoWordmark />
    </div>
  )
}
