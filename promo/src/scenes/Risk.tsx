import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion'
import { Bg, Card, H1, Kicker, Reveal, Sub } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

const RiskItem: React.FC<{ text: string; delay: number; tone?: string }> = ({ text, delay, tone = C.warn }) => {
  const f = useCurrentFrame()
  const s = spring({ frame: f - delay, fps: 30, config: { damping: 18, stiffness: 200 } })
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 18px',
        marginBottom: 10,
        borderRadius: 11,
        border: `1px solid ${tone}44`,
        background: `${tone}0f`,
        opacity: s,
        transform: `translateX(${(1 - s) * -20}px)`,
      }}
    >
      <span style={{ color: tone, font: `800 22px/1 ${F.sans}` }}>!</span>
      <span style={{ font: `600 25px/1.3 ${F.sans}`, color: C.text }}>{text}</span>
    </div>
  )
}

const Blacklist: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 80, padding: '0 140px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={0}>
          <Kicker color={C.warn}>风险软件清单</Kicker>
        </Reveal>
        <Reveal delay={10} y={30}>
          <H1 size={86} style={{ marginTop: 20 }}>
            合规，
            <br />
            但你不一定想要
          </H1>
        </Reveal>
        <Reveal delay={26}>
          <Sub size={30} style={{ marginTop: 18 }}>
            大风险提示 + 同类替代
            <br />
            想继续？先等 5 秒，看清它要做什么
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 780, padding: 34 }} glow={C.warn}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <span style={{ font: `800 24px/1 ${F.sans}`, color: C.warn }}>⚠</span>
          <span style={{ font: `700 34px/1 ${F.sans}`, color: C.text }}>2345好压</span>
          <span
            style={{
              marginLeft: 'auto',
              font: `600 19px/1 ${F.sans}`,
              color: C.warn,
              border: `1px solid ${C.warn}55`,
              borderRadius: 99,
              padding: '8px 14px',
            }}
          >
            命中风险清单
          </span>
        </div>

        <RiskItem text="安装时默认捆绑其他软件" delay={22} />
        <RiskItem text="常驻弹窗与推广位" delay={32} />
        <RiskItem text="卸载残留、难以彻底删除" delay={42} />

        <div
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: `1px solid ${C.line}`,
            opacity: lerp(f, 66, 84, 0, 1),
          }}
        >
          <div style={{ font: `600 20px/1 ${F.sans}`, color: C.faint, marginBottom: 12 }}>同类替代</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['7-Zip', 'Bandizip', 'Nanazip'].map((t) => (
              <span
                key={t}
                style={{
                  font: `600 23px/1 ${F.sans}`,
                  color: C.ok,
                  border: `1px solid ${C.ok}55`,
                  background: 'rgba(53,184,122,.08)',
                  borderRadius: 99,
                  padding: '11px 18px',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </AbsoluteFill>
  )
}

const Viruslist: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 80, padding: '0 140px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={0}>
          <Kicker color={C.danger}>恶意软件清单</Kicker>
        </Reveal>
        <Reveal delay={10} y={30}>
          <H1 size={86} style={{ marginTop: 20, color: C.text }}>
            这一条，
            <br />
            <span style={{ color: C.danger }}>直接拦</span>
          </H1>
        </Reveal>
        <Reveal delay={26}>
          <Sub size={30} style={{ marginTop: 18 }}>
            口令不在前端校验
            <br />
            改页面代码也绕不过去
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 780, padding: 34 }} glow={C.danger}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <span style={{ font: `800 30px/1 ${F.sans}`, color: C.danger }}>⛔</span>
          <span style={{ font: `700 34px/1 ${F.sans}`, color: C.text }}>kms激活</span>
          <span
            style={{
              marginLeft: 'auto',
              font: `600 19px/1 ${F.sans}`,
              color: C.danger,
              border: `1px solid ${C.danger}66`,
              background: 'rgba(229,72,77,.1)',
              borderRadius: 99,
              padding: '8px 14px',
            }}
          >
            已拦截
          </span>
        </div>

        <div
          style={{
            font: `500 23px/1.7 ${F.sans}`,
            color: C.sub,
            background: 'rgba(229,72,77,0.06)',
            border: `1px solid ${C.danger}33`,
            borderRadius: 12,
            padding: '16px 18px',
          }}
        >
          激活/破解工具是木马重灾区：挖矿、盗号、远控、勒索软件常伪装成"激活工具"传播。
        </div>

        <div style={{ marginTop: 20, opacity: lerp(f, 60, 80, 0, 1) }}>
          <div style={{ font: `600 20px/1 ${F.sans}`, color: C.faint, marginBottom: 10 }}>
            如确需继续，请输入口令
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                flex: 1,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                padding: '14px 16px',
                font: `500 24px/1 ${F.mono}`,
                color: (f % 40) > 20 ? C.greenLite : C.faint,
              }}
            >
              ••••••••
              <span style={{ opacity: (f % 30) > 15 ? 1 : 0 }}>|</span>
            </div>
            <div
              style={{
                border: `1px solid ${C.green}66`,
                background: 'rgba(14,138,109,.14)',
                borderRadius: 10,
                padding: '14px 22px',
                font: `700 22px/1 ${F.sans}`,
                color: C.greenLite,
              }}
            >
              校验
            </div>
          </div>
        </div>
      </Card>
    </AbsoluteFill>
  )
}

export const Risk: React.FC = () => {
  return (
    <Bg glow={C.warn} intensity={0.5}>
      <Sequence from={0} durationInFrames={240}>
        <Blacklist />
      </Sequence>
      <Sequence from={240} durationInFrames={240}>
        <Viruslist />
      </Sequence>
    </Bg>
  )
}
