import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Bg, Wipe } from '../lib'
import { CharReveal, GlitchText } from '../Fx'
import { C, F } from '../theme'

const LABELS = [
  '立即下载',
  '高速下载',
  '安全下载',
  '官方下载',
  '极速下载',
  '免费下载',
  '绿色版',
  '电脑版',
  '最新版',
  '一键安装',
  '点此下载',
  '下载安装',
]

const Button: React.FC<{ label: string; i: number }> = ({ label, i }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const delay = i * 2.2
  const s = spring({ frame: f - delay, fps, config: { damping: 14, mass: 0.5, stiffness: 220 } })
  const stamped = f > 52 + i * 1.6
  const dim = interpolate(f, [86, 118], [1, 0.34], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const shake = stamped ? Math.sin((f - 52 - i * 1.6) * 1.9) * 3 : 0

  return (
    <div
      style={{
        opacity: s * dim,
        transform: `translateY(${(1 - s) * 26}px) scale(${0.86 + s * 0.14}) translateX(${shake}px)`,
        position: 'relative',
      }}
    >
      <div
        style={{
          border: `1px solid ${stamped ? C.danger + '66' : C.line}`,
          background: stamped ? 'rgba(229,72,77,0.06)' : 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          padding: '16px 8px',
          textAlign: 'center',
          font: `600 25px/1 ${F.sans}`,
          color: stamped ? C.danger : C.text,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      {stamped ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `800 40px/1 ${F.sans}`,
            color: C.danger,
            opacity: interpolate(f, [52 + i * 1.6, 58 + i * 1.6], [0, 0.9], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            textShadow: '0 0 22px rgba(229,72,77,.8)',
          }}
        >
          ✕
        </div>
      ) : null}
    </div>
  )
}

export const Hook: React.FC = () => {
  const f = useCurrentFrame()

  const flash = interpolate(f, [226, 232, 240], [0, 0.85, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <Bg glow={C.danger} intensity={0.55}>
      {/* 假下载按钮矩阵 */}
      <AbsoluteFill style={{ padding: '150px 120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, width: '100%' }}>
          {LABELS.map((l, i) => (
            <Button key={l} label={l} i={i} />
          ))}
        </div>
      </AbsoluteFill>

      {/* 主文案 */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <CharReveal text="你点的那个「下载」" size={96} delay={96} stagger={3} color={C.text} />
          <div style={{ marginTop: 12 }}>
            <GlitchText at={170} frames={7}>
              <CharReveal text="是官网吗？" size={158} delay={148} stagger={4} color={C.danger} />
            </GlitchText>
          </div>
          <div
            style={{
              height: 6,
              marginTop: 10,
              background: C.danger,
              width: `${interpolate(f, [168, 200], [0, 62], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
              boxShadow: `0 0 30px ${C.danger}`,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>
      </AbsoluteFill>

      <Wipe at={228} color={C.danger} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </Bg>
  )
}
