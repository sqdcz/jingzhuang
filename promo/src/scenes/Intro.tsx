import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { Bg, H1, Reveal, Shield, Sub } from '../lib'
import { CharReveal } from '../Fx'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

const Chip: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => (
  <Reveal delay={delay} y={18}>
    <span
      style={{
        display: 'inline-block',
        font: `600 26px/1 ${F.sans}`,
        color: C.greenLite,
        border: `1px solid ${C.greenLite}44`,
        background: 'rgba(61,199,159,0.07)',
        borderRadius: 99,
        padding: '13px 24px',
      }}
    >
      {children}
    </span>
  </Reveal>
)

export const Intro: React.FC = () => {
  const f = useCurrentFrame()
  const draw = lerp(f, 4, 40, 0, 1)

  return (
    <Bg glow={C.green} intensity={0.95}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Reveal delay={0} y={0} scale={0.84}>
            <div style={{ marginBottom: 24 }}>
              <Shield size={186} progress={draw} />
            </div>
          </Reveal>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <CharReveal text="净装" size={168} delay={24} stagger={7} spacing={12} />
          </div>

          <Reveal delay={42}>
            <Sub size={42} style={{ marginTop: 12, color: C.text }}>
              软件来源查询 <span style={{ color: C.greenLite, margin: '0 12px' }}>·</span> 安装包安全校验
            </Sub>
          </Reveal>

          <div style={{ marginTop: 46, display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Chip delay={58}>免费</Chip>
            <Chip delay={66}>开源 MIT</Chip>
            <Chip delay={74}>本地运行</Chip>
          </div>

          <div
            style={{
              marginTop: 38,
              font: `500 26px/1.6 ${F.sans}`,
              color: C.faint,
              opacity: lerp(f, 96, 116, 0, 1),
            }}
          >
            不设账号 · 无遥测 · 不收集个人信息
          </div>
        </div>
      </AbsoluteFill>
    </Bg>
  )
}
