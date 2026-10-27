import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion'
import { Bg, Card, H1, Kicker, Reveal, Sub } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

const Ring: React.FC<{ p: number; color?: string; size?: number; children?: React.ReactNode }> = ({
  p,
  color = C.ok,
  size = 168,
  children,
}) => {
  const r = 62
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="80" cy="80" r={r} fill="none" stroke={C.line} strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - p)}
          style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: `800 34px/1 ${F.mono}`,
          color,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* 1) 数字签名 */
const Signature: React.FC = () => {
  const f = useCurrentFrame()
  const p = lerp(f, 10, 62, 0, 1)
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 80, padding: '0 140px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={0}>
          <Kicker>校验 · 一</Kicker>
        </Reveal>
        <Reveal delay={8} y={30}>
          <H1 size={82} style={{ marginTop: 20 }}>
            数字签名
          </H1>
        </Reveal>
        <Reveal delay={18}>
          <Sub size={30} style={{ marginTop: 16 }}>
            读 Authenticode 签名与证书发布者
            <br />
            再看它是不是它自称的那个人
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 760, padding: 34 }} glow={C.ok}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
          <Ring p={p}>{Math.round(p * 100)}%</Ring>
          <div style={{ flex: 1 }}>
            <div style={{ font: `600 21px/1 ${F.sans}`, color: C.faint }}>签名状态</div>
            <div style={{ font: `700 30px/1.3 ${F.sans}`, color: C.ok, marginTop: 8 }}>
              Valid（有效）
            </div>
            <div style={{ font: `600 21px/1 ${F.sans}`, color: C.faint, marginTop: 20 }}>证书发布者</div>
            <div style={{ font: `500 22px/1.45 ${F.mono}`, color: C.text, marginTop: 8, wordBreak: 'break-all' }}>
              CN=Tencent Technology (Shenzhen)…
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: `1px solid ${C.line}`,
            font: `700 25px/1 ${F.sans}`,
            color: C.ok,
            opacity: lerp(f, 86, 104, 0, 1),
          }}
        >
          ✓ 发布者与预期一致
        </div>
      </Card>
    </AbsoluteFill>
  )
}

/* 2) SHA-256 逐字节比对 */
const Hash: React.FC = () => {
  const f = useCurrentFrame()
  const off = 'a3f91c7e5b0d2f84c6a1e93d7b4f08c2'
  const loc = 'a3f91c7e5b0d2f84c6a1e93d7b4f08c2'
  const n = Math.floor(lerp(f, 16, 92, 0, 32))
  const allSame = n >= 32

  const row = (label: string, s: string, color: string, from: number) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ font: `600 19px/1 ${F.sans}`, color: C.faint, marginBottom: 10 }}>{label}</div>
      <div style={{ font: `500 26px/1.5 ${F.mono}`, letterSpacing: 1.5, wordBreak: 'break-all' }}>
        {s.split('').map((ch, i) => {
          const on = i < n
          const step = from + i * 1.4
          const flash = f > step && f < step + 5
          return (
            <span
              key={i}
              style={{
                color: on ? (flash ? C.text : color) : C.faint,
                opacity: on ? 1 : 0.28,
                background: flash ? `${color}33` : 'transparent',
                borderRadius: 3,
              }}
            >
              {ch}
            </span>
          )
        })}
      </div>
    </div>
  )

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 80, padding: '0 140px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={0}>
          <Kicker>校验 · 二</Kicker>
        </Reveal>
        <Reveal delay={8} y={30}>
          <H1 size={82} style={{ marginTop: 20 }}>
            哈希逐字节比对
          </H1>
        </Reveal>
        <Reveal delay={18}>
          <Sub size={30} style={{ marginTop: 16 }}>
            官方清单声明一个 SHA-256
            <br />
            下载完自己算一遍，差一位就拦下
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 800, padding: 34 }} glow={allSame ? C.ok : C.green}>
        {row('官方声明的 SHA-256', off, C.greenLite, 20)}
        {row('本地计算的 SHA-256', loc, C.ok, 20)}
        <div
          style={{
            marginTop: 8,
            font: `800 30px/1 ${F.sans}`,
            color: allSame ? C.ok : C.faint,
            opacity: lerp(f, 96, 112, 0, 1),
          }}
        >
          {allSame ? '✓ 完全一致' : '比对中…'}
        </div>
      </Card>
    </AbsoluteFill>
  )
}

/* 3) VirusTotal */
const CloudScan: React.FC = () => {
  const f = useCurrentFrame()
  const total = 70
  const count = Math.floor(lerp(f, 14, 74, 0, total))
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 80, padding: '0 140px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={0}>
          <Kicker>校验 · 三</Kicker>
        </Reveal>
        <Reveal delay={8} y={30}>
          <H1 size={82} style={{ marginTop: 20 }}>
            云查杀（可选）
          </H1>
        </Reveal>
        <Reveal delay={18}>
          <Sub size={30} style={{ marginTop: 16 }}>
            接 VirusTotal，70+ 引擎一起看
            <br />
            只发文件哈希，不发文件本身
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 760, padding: 36 }} glow={C.ok}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ font: `800 96px/1 ${F.mono}`, color: C.ok }}>0</span>
          <span style={{ font: `600 30px/1 ${F.sans}`, color: C.sub }}>/ {total} 引擎报毒</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 26, flexWrap: 'wrap' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 26,
                borderRadius: 3,
                background: i < count ? C.ok : C.line,
                opacity: i < count ? 0.85 : 1,
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 22, font: `500 22px/1.5 ${F.sans}`, color: C.sub }}>
          需要你自己填 API Key；不配置就不查询
        </div>
      </Card>
    </AbsoluteFill>
  )
}

export const Verify: React.FC = () => {
  return (
    <Bg glow={C.green} intensity={0.55}>
      <Sequence from={0} durationInFrames={320}>
        <Signature />
      </Sequence>
      <Sequence from={320} durationInFrames={320}>
        <Hash />
      </Sequence>
      <Sequence from={640} durationInFrames={320}>
        <CloudScan />
      </Sequence>
    </Bg>
  )
}
