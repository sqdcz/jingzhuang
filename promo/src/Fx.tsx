import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, F } from './theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** 确定性伪随机（同一帧永远同一结果，保证渲染可复现） */
const rand = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** 漂浮粒子 + 扫描线 + 暗角：给暗底加"质感" */
export const Fx: React.FC<{ count?: number; opacity?: number }> = ({ count = 46, opacity = 1 }) => {
  const f = useCurrentFrame()
  const { width, height } = useVideoConfig()

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {/* 粒子 */}
      {Array.from({ length: count }).map((_, i) => {
        const baseX = rand(i, 1) * width
        const baseY = rand(i, 2) * height
        const spd = 0.12 + rand(i, 3) * 0.5
        const y = (baseY - f * spd) % height
        const xx = baseX + Math.sin((f / 90) * (0.6 + rand(i, 4))) * 26
        const r = 1.2 + rand(i, 5) * 2.6
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(f / (28 + rand(i, 6) * 40) + i))
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xx,
              top: y < 0 ? y + height : y,
              width: r,
              height: r,
              borderRadius: 99,
              background: i % 5 === 0 ? C.greenLite : C.text,
              opacity: 0.10 + tw * 0.22,
              boxShadow: `0 0 ${r * 3}px ${C.greenLite}`,
            }}
          />
        )
      })}

      {/* 扫描线 */}
      <AbsoluteFill
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)',
          opacity: 0.5,
          mixBlendMode: 'overlay',
        }}
      />

      {/* 暗角 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(78% 70% at 50% 48%, transparent 46%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </AbsoluteFill>
  )
}

/** 镜头缓慢推近，让画面"活着" */
export const Push: React.FC<{ children: React.ReactNode; from?: number; to?: number; dur: number }> = ({
  children,
  from = 1.0,
  to = 1.045,
  dur,
}) => {
  const f = useCurrentFrame()
  const s = interpolate(f, [0, dur], [from, to], CL)
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>
}

/** 一道斜向光带扫过 */
export const Streak: React.FC<{ at: number; dur?: number; angle?: number }> = ({ at, dur = 26, angle = 18 }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [at, at + dur], [-40, 140], CL)
  if (f < at || f > at + dur) return null
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: '-40%',
          left: `${p}%`,
          width: '26%',
          height: '180%',
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, transparent, ${C.greenLite}22 40%, ${C.text}33 50%, ${C.greenLite}22 60%, transparent)`,
          filter: 'blur(6px)',
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  )
}

/** 故障（RGB 分离 + 抖动），只在指定帧区间出现 */
export const GlitchText: React.FC<{ children: React.ReactNode; at: number; frames?: number }> = ({
  children,
  at,
  frames = 6,
}) => {
  const f = useCurrentFrame()
  const on = f >= at && f < at + frames
  if (!on) return <>{children}</>

  const amp = 8 + (f % 3) * 5
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, color: '#ff3355', opacity: 0.72, transform: `translateX(${-amp}px)` }}>
        {children}
      </div>
      <div style={{ position: 'absolute', inset: 0, color: '#33ffee', opacity: 0.72, transform: `translateX(${amp}px)` }}>
        {children}
      </div>
      <div style={{ position: 'relative', transform: `translateY(${(f % 2) * 2}px)` }}>{children}</div>
    </div>
  )
}

/** 逐字入场（比整块淡入更有"制作感"） */
export const CharReveal: React.FC<{
  text: string
  size?: number
  delay?: number
  stagger?: number
  color?: string
  weight?: number
  spacing?: number
}> = ({ text, size = 120, delay = 0, stagger = 2, color = C.text, weight = 800, spacing = 0 }) => {
  const f = useCurrentFrame()
  const chars = [...text]
  return (
    <div style={{ font: `${weight} ${size}px/1.16 ${F.sans}`, letterSpacing: spacing, color, display: 'flex' }}>
      {chars.map((ch, i) => {
        const p = interpolate(f, [delay + i * stagger, delay + i * stagger + 12], [0, 1], CL)
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * size * 0.32}px) rotate(${(1 - p) * -6}deg)`,
              filter: p < 0.96 ? `blur(${(1 - p) * 5}px)` : 'none',
            }}
          >
            {ch}
          </span>
        )
      })}
    </div>
  )
}
