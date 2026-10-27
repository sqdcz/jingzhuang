import React from 'react'
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { Bg, H1, Reveal, Shield, Sub } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

const Privacy: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Reveal delay={0}>
      <div style={{ font: `600 24px/1 ${F.sans}`, letterSpacing: 6, color: C.greenLite }}>隐私</div>
    </Reveal>
    <Reveal delay={8} y={34}>
      <H1 size={92} style={{ marginTop: 22 }}>
        你的数据，一步都没离开这台电脑
      </H1>
    </Reveal>
    <div style={{ display: 'flex', gap: 20, marginTop: 44 }}>
      {['不设账号', '无遥测统计', '无广告组件'].map((t, i) => (
        <Reveal key={t} delay={30 + i * 8} y={24}>
          <div
            style={{
              font: `600 28px/1 ${F.sans}`,
              color: C.text,
              border: `1px solid ${C.line}`,
              background: 'rgba(255,255,255,.03)',
              borderRadius: 14,
              padding: '20px 28px',
            }}
          >
            <span style={{ color: C.ok, marginRight: 10 }}>✓</span>
            {t}
          </div>
        </Reveal>
      ))}
    </div>
    <Reveal delay={64}>
      <Sub size={26} style={{ marginTop: 30 }}>
        只在你自己发起检索或下载时，才会有网络请求
      </Sub>
    </Reveal>
  </AbsoluteFill>
)

const Download: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0}>
        <div style={{ font: `600 24px/1 ${F.sans}`, letterSpacing: 6, color: C.greenLite }}>获取</div>
      </Reveal>
      <Reveal delay={10} y={30}>
        <H1 size={84} style={{ marginTop: 20 }}>
          两个渠道，同一个版本
        </H1>
      </Reveal>

      <div style={{ display: 'flex', gap: 24, marginTop: 44 }}>
        <Reveal delay={26} y={26}>
          <div
            style={{
              width: 460,
              border: `1px solid ${C.green}55`,
              background: 'rgba(14,138,109,.10)',
              borderRadius: 18,
              padding: '28px 30px',
            }}
          >
            <div style={{ font: `600 21px/1 ${F.sans}`, color: C.greenLite }}>微软商店</div>
            <div style={{ font: `800 40px/1.25 ${F.sans}`, color: C.text, marginTop: 12 }}>搜索「净装」</div>
            <div style={{ font: `500 21px/1.5 ${F.sans}`, color: C.sub, marginTop: 10 }}>
              自动更新 · 官方签名 · 免安装包
            </div>
          </div>
        </Reveal>

        <Reveal delay={36} y={26}>
          <div
            style={{
              width: 460,
              border: `1px solid ${C.line}`,
              background: 'rgba(255,255,255,.03)',
              borderRadius: 18,
              padding: '28px 30px',
            }}
          >
            <div style={{ font: `600 21px/1 ${F.sans}`, color: C.sub }}>GitHub</div>
            <div style={{ font: `800 34px/1.25 ${F.mono}`, color: C.text, marginTop: 14 }}>
              sqdcz/jingzhuang
            </div>
            <div style={{ font: `500 21px/1.5 ${F.sans}`, color: C.sub, marginTop: 10 }}>
              完整版 · 源码公开 · MIT 许可
            </div>
          </div>
        </Reveal>
      </div>

      <div style={{ marginTop: 34, opacity: lerp(f, 60, 80, 0, 1) }}>
        <Sub size={24}>完全免费，没有任何内购或订阅</Sub>
      </div>
    </AbsoluteFill>
  )
}

const Outro: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Reveal delay={0} y={0} scale={0.9}>
        <Shield size={132} progress={1} />
      </Reveal>
      <Reveal delay={10} y={26}>
        <H1 size={124} style={{ marginTop: 14, letterSpacing: 10 }}>
          净装
        </H1>
      </Reveal>
      <Reveal delay={24}>
        <div style={{ font: `700 42px/1.4 ${F.sans}`, color: C.greenLite, marginTop: 10, letterSpacing: 3 }}>
          找官网 · 验安全 · 干净装
        </div>
      </Reveal>
      <div
        style={{
          marginTop: 26,
          font: `500 24px/1.6 ${F.sans}`,
          color: C.faint,
          opacity: lerp(f, 46, 66, 0, 1),
        }}
      >
        微软商店 / GitHub 均可获取 · 开源 MIT
      </div>
    </AbsoluteFill>
  )
}

export const Close: React.FC = () => {
  return (
    <Bg glow={C.green} intensity={0.8}>
      <Sequence from={0} durationInFrames={180}>
        <Privacy />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <Download />
      </Sequence>
      <Sequence from={360} durationInFrames={150}>
        <Outro />
      </Sequence>
    </Bg>
  )
}
