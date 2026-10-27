import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion'
import { Bg, Card, H1, Kicker, Reveal, Sub } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

const BEAT = 135   // 4 拍 × 135 帧 = 540

const Row: React.FC<{ text: string; delay: number; ok?: boolean }> = ({ text, delay, ok = true }) => {
  const f = useCurrentFrame()
  const s = spring({ frame: f - delay, fps: 30, config: { damping: 18, stiffness: 190 } })
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '17px 22px',
        marginBottom: 12,
        borderRadius: 13,
        border: `1px solid ${ok ? C.ok + '3d' : C.line}`,
        background: ok ? 'rgba(53,184,122,.06)' : 'transparent',
        opacity: s,
        transform: `translateY(${(1 - s) * 16}px)`,
      }}
    >
      <span style={{ font: `800 26px/1 ${F.sans}`, color: ok ? C.ok : C.faint }}>{ok ? '✓' : '·'}</span>
      <span style={{ font: `600 29px/1.3 ${F.sans}`, color: C.text }}>{text}</span>
    </div>
  )
}

/* 第一拍：先把疑问摆出来 */
const Doubt: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0}>
        <Kicker color={C.warn}>可能你会问</Kicker>
      </Reveal>
      <Reveal delay={10} y={40}>
        <H1 size={96} style={{ marginTop: 26, textAlign: 'center' }}>
          这工具自己，
          <br />
          <span style={{ color: C.warn }}>会不会又是一个全家桶？</span>
        </H1>
      </Reveal>
      <div style={{ marginTop: 40, opacity: lerp(f, 54, 76, 0, 1) }}>
        <Sub size={30}>这个问题问得对 —— 所以下面三条，你可以自己验</Sub>
      </div>
    </AbsoluteFill>
  )
}

/* 第二拍：源码与协议 */
const OpenSource: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0}>
        <Kicker>第一条</Kicker>
      </Reveal>
      <Reveal delay={8} y={34}>
        <H1 size={88} style={{ marginTop: 22 }}>
          源码全部公开，自己审
        </H1>
      </Reveal>

      <div style={{ display: 'flex', gap: 18, marginTop: 40 }}>
        {[
          { k: '协议', v: 'MIT' },
          { k: '仓库', v: 'sqdcz/jingzhuang' },
          { k: '依赖', v: '零运行时依赖' },
        ].map((it, i) => (
          <Reveal key={it.k} delay={26 + i * 9} y={22}>
            <div
              style={{
                minWidth: 250,
                border: `1px solid ${C.line}`,
                background: 'rgba(255,255,255,.03)',
                borderRadius: 16,
                padding: '22px 26px',
              }}
            >
              <div style={{ font: `500 20px/1 ${F.sans}`, color: C.faint }}>{it.k}</div>
              <div style={{ font: `700 30px/1.3 ${F.mono}`, color: C.greenLite, marginTop: 12 }}>{it.v}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div style={{ marginTop: 30, opacity: lerp(f, 66, 86, 0, 1) }}>
        <Sub size={27}>改一行代码、多一个请求，都藏不住</Sub>
      </div>
    </AbsoluteFill>
  )
}

/* 第三拍：不碰系统 */
const NoTouch: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0}>
        <Kicker>第二条</Kicker>
      </Reveal>
      <Reveal delay={8} y={34}>
        <H1 size={86} style={{ marginTop: 20 }}>
          不碰你的系统
        </H1>
      </Reveal>

      <div style={{ width: 760, marginTop: 34 }}>
        <Row text="不装驱动，不注册 NT 服务" delay={24} />
        <Row text="不改系统设置，不写注册表开机项" delay={34} />
        <Row text="除了应用自身目录，不碰别的文件" delay={44} />
        <Row text="不静默安装任何东西" delay={54} />
      </div>
    </AbsoluteFill>
  )
}

/* 第四拍：不配 AI 也能用 */
const FreeWithoutAI: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0}>
        <Kicker>第三条</Kicker>
      </Reveal>
      <Reveal delay={8} y={34}>
        <H1 size={86} style={{ marginTop: 20 }}>
          不配 AI，也照样能用
        </H1>
      </Reveal>

      <Card style={{ width: 820, marginTop: 36, padding: 30 }} glow={C.ok}>
        {[
          { t: '内置名单', d: '零成本 · 无需联网', on: true },
          { t: '官方索引', d: '零成本 · 无需密钥', on: true },
          { t: 'AI 辅助', d: '可选 · 需要你自己的密钥', on: false },
        ].map((it, i) => {
          const s = spring({ frame: f - 22 - i * 10, fps: 30, config: { damping: 18, stiffness: 190 } })
          return (
            <div
              key={it.t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '15px 18px',
                marginBottom: 10,
                borderRadius: 12,
                border: `1px solid ${it.on ? C.ok + '3d' : C.line}`,
                background: it.on ? 'rgba(53,184,122,.06)' : 'transparent',
                opacity: s,
              }}
            >
              <span style={{ font: `700 20px/1 ${F.mono}`, color: it.on ? C.ok : C.faint }}>
                {it.on ? 'FREE' : 'OPT'}
              </span>
              <span style={{ font: `600 28px/1.3 ${F.sans}`, color: C.text }}>{it.t}</span>
              <span style={{ marginLeft: 'auto', font: `500 21px/1 ${F.sans}`, color: C.sub }}>{it.d}</span>
            </div>
          )
        })}
      </Card>
    </AbsoluteFill>
  )
}

/** 130–148s：自证清白（回应"你自己是不是全家桶"） */
export const Trust: React.FC = () => {
  return (
    <Bg glow={C.warn} intensity={0.45}>
      <Sequence from={0} durationInFrames={BEAT}>
        <Doubt />
      </Sequence>
      <Sequence from={BEAT} durationInFrames={BEAT}>
        <OpenSource />
      </Sequence>
      <Sequence from={BEAT * 2} durationInFrames={BEAT}>
        <NoTouch />
      </Sequence>
      <Sequence from={BEAT * 3} durationInFrames={BEAT}>
        <FreeWithoutAI />
      </Sequence>
    </Bg>
  )
}
