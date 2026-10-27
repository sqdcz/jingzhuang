import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, F } from './theme'

export const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export const lerp = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], CL)

/** 入场：位移 + 淡入 + 轻微缩放 */
export const Reveal: React.FC<{
  delay?: number
  y?: number
  x?: number
  scale?: number
  children: React.ReactNode
  style?: React.CSSProperties
}> = ({ delay = 0, y = 28, x = 0, scale = 1, children, style }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - delay, fps, config: { damping: 200, mass: 0.55, stiffness: 140 } })
  return (
    <div
      style={{
        opacity: s,
        transform: `translate(${(1 - s) * x}px, ${(1 - s) * y}px) scale(${1 + (1 - s) * (scale - 1)})`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** 离场淡出（给镜头收尾用） */
export const useFadeOut = (startAt: number, dur = 12) => {
  const f = useCurrentFrame()
  return 1 - lerp(f, startAt, startAt + dur, 0, 1)
}

type BgProps = {
  glow?: string
  grid?: boolean
  intensity?: number
  children?: React.ReactNode
}

/** 暗底：可漂移的径向光晕 + 细网格 */
export const Bg: React.FC<BgProps> = ({ glow = C.green, grid = true, intensity = 1, children }) => {
  const f = useCurrentFrame()
  const drift = Math.sin(f / 90) * 60
  const drift2 = Math.cos(f / 120) * 40
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 0%, ${C.bg2} 0%, ${C.bg} 62%)`, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 46% at ${50 + drift / 12}% ${18 + drift2 / 40}%, ${glow}44 0%, transparent 70%)`,
          opacity: 0.55 * intensity,
          filter: 'blur(6px)',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at ${78 - drift / 16}% ${82 + drift2 / 50}%, ${glow}2e 0%, transparent 72%)`,
          opacity: 0.5 * intensity,
        }}
      />
      {grid ? (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            opacity: 0.5,
            maskImage: 'radial-gradient(78% 78% at 50% 45%, #000 20%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(78% 78% at 50% 45%, #000 20%, transparent 80%)',
          }}
        />
      ) : null}
      {children}
    </AbsoluteFill>
  )
}

/** 小标签（章节号 / 类别） */
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.greenLite,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      font: `600 22px/1 ${F.sans}`,
      letterSpacing: 3,
      color,
      ...style,
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: 99, background: color, boxShadow: `0 0 14px ${color}` }} />
    {children}
  </div>
)

export const Card: React.FC<{
  children: React.ReactNode
  style?: React.CSSProperties
  glow?: string
  pad?: number
}> = ({ children, style, glow, pad = 34 }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 22,
      padding: pad,
      boxShadow: glow ? `0 0 0 1px ${glow}22, 0 24px 70px ${glow}1f` : '0 24px 60px rgba(0,0,0,.35)',
      backdropFilter: 'blur(2px)',
      ...style,
    }}
  >
    {children}
  </div>
)

/** 一道迅猛的横向擦除，镜头切换用 */
export const Wipe: React.FC<{ at: number; from?: 'left' | 'right'; color?: string }> = ({
  at,
  from = 'left',
  color = C.greenLite,
}) => {
  const f = useCurrentFrame()
  const p = lerp(f, at, at + 9, 0, 1)
  if (p <= 0 || p >= 1) return null
  const dir = from === 'left' ? 1 : -1
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: `${p * 140}%`,
          left: dir > 0 ? `${-40 + p * 100}%` : undefined,
          right: dir > 0 ? undefined : `${-40 + p * 100}%`,
          background: `linear-gradient(90deg, transparent, ${color}22 40%, ${color}88 62%, ${color}22 84%, transparent)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  )
}

/** 大标题 */
export const H1: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 118,
  style,
}) => (
  <div
    style={{
      font: `800 ${size}px/1.18 ${F.sans}`,
      letterSpacing: -1,
      color: C.text,
      textShadow: '0 12px 48px rgba(0,0,0,.55)',
      ...style,
    }}
  >
    {children}
  </div>
)

export const Sub: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 34,
  style,
}) => (
  <div style={{ font: `400 ${size}px/1.6 ${F.sans}`, color: C.sub, letterSpacing: 0.5, ...style }}>{children}</div>
)

/** 盾牌图标（与 App 图标同构：盾 + 向下箭头） */
export const Shield: React.FC<{ size?: number; glow?: number; progress?: number }> = ({
  size = 200,
  glow = 1,
  progress = 1,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={C.greenLite} />
        <stop offset="100%" stopColor={C.green} />
      </linearGradient>
      <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#sglow)" opacity={glow}>
      <path
        d="M50 8 L86 21 V50 C86 70 70 84 50 92 C30 84 14 70 14 50 V21 Z"
        fill="none"
        stroke="url(#sg)"
        strokeWidth={5}
        strokeLinejoin="round"
        strokeDasharray={260}
        strokeDashoffset={260 * (1 - progress)}
      />
    </g>
    <g opacity={progress}>
      <path d="M50 30 V58" stroke={C.text} strokeWidth={7} strokeLinecap="round" />
      <path d="M37 47 L50 60 L63 47" fill="none" stroke={C.text} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="33" y="66" width="34" height={7} rx={3.5} fill={C.text} opacity={0.9} />
    </g>
  </svg>
)
