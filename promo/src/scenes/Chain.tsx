import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame } from 'remotion'
import { Bg, Card, Kicker, Reveal } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

/* ---------------- 三级来源链路 ---------------- */

const RAIL = [
  { n: '01', name: '内置名单', tag: '零成本' },
  { n: '02', name: '官方索引', tag: '零成本' },
  { n: '03', name: 'AI 辅助', tag: '可选' },
]

const Rail: React.FC<{ active: number; f: number }> = ({ active, f }) => (
  <div style={{ width: 372, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {RAIL.map((r, i) => {
      const on = i === active
      const done = i < active
      return (
        <div
          key={r.n}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '22px 22px',
            borderRadius: 16,
            border: `1px solid ${on ? C.greenLite + '66' : C.line}`,
            background: on ? 'rgba(61,199,159,0.08)' : 'rgba(255,255,255,0.02)',
            boxShadow: on ? `0 0 40px rgba(61,199,159,.18)` : 'none',
            opacity: on ? 1 : done ? 0.72 : 0.34,
            transform: `translateX(${on ? 6 : 0}px)`,
          }}
        >
          <span
            style={{
              font: `800 26px/1 ${F.mono}`,
              color: on ? C.greenLite : done ? C.ok : C.faint,
              width: 40,
            }}
          >
            {done ? '✓' : r.n}
          </span>
          <span style={{ font: `600 30px/1.2 ${F.sans}`, color: C.text }}>{r.name}</span>
          <span
            style={{
              marginLeft: 'auto',
              font: `600 18px/1 ${F.sans}`,
              color: on ? C.greenLite : C.faint,
              border: `1px solid ${on ? C.greenLite + '55' : C.line}`,
              borderRadius: 99,
              padding: '6px 12px',
            }}
          >
            {r.tag}
          </span>
        </div>
      )
    })}
    <div style={{ marginTop: 'auto', font: `500 22px/1.6 ${F.sans}`, color: C.faint, paddingLeft: 6 }}>
      逐级下探：
      <br />
      能用官方渠道，就不花 AI 的钱
    </div>
  </div>
)

type StepProps = {
  active: number
  query: string
  rows: { k: string; v: string; ok?: boolean; mono?: boolean }[]
  verdict?: React.ReactNode
  note?: string
}

const ChainStep: React.FC<StepProps> = ({ active, query, rows, verdict, note }) => {
  const f = useCurrentFrame()
  const typed = Math.min(query.length, Math.floor(lerp(f, 12, 40, 0, query.length)))
  const showRows = f > 46
  const showVerdict = f > 108

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', gap: 54, padding: '0 110px' }}>
      <Rail active={active} f={f} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22, justifyContent: 'center' }}>
        <Reveal delay={0} y={16}>
          <Kicker>第 {active + 1} 级 · {RAIL[active].name}</Kicker>
        </Reveal>

        {/* 搜索框 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '26px 30px',
            borderRadius: 18,
            border: `1px solid ${C.greenLite}44`,
            background: 'rgba(255,255,255,0.04)',
            boxShadow: `0 0 50px rgba(61,199,159,.12)`,
          }}
        >
          <span style={{ font: `600 26px/1 ${F.sans}`, color: C.faint }}>⌕</span>
          <span style={{ font: `500 40px/1 ${F.sans}`, color: C.text, minHeight: 40 }}>
            {query.slice(0, typed)}
            <span style={{ opacity: f % 16 > 8 ? 1 : 0, color: C.greenLite }}>|</span>
          </span>
          <span
            style={{
              marginLeft: 'auto',
              font: `600 20px/1 ${F.sans}`,
              color: C.faint,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            Enter
          </span>
        </div>

        {/* 结果行 */}
        <div style={{ opacity: showRows ? 1 : 0 }}>
          <Card pad={26} glow={C.green}>
            {rows.map((r, i) => {
              const s = spring({ frame: f - 48 - i * 7, fps: 30, config: { damping: 18, stiffness: 190 } })
              return (
                <div
                  key={r.k}
                  style={{
                    display: 'flex',
                    gap: 20,
                    alignItems: 'baseline',
                    padding: '11px 0',
                    opacity: s,
                    transform: `translateY(${(1 - s) * 14}px)`,
                  }}
                >
                  <span style={{ width: 132, font: `500 21px/1.4 ${F.sans}`, color: C.faint }}>{r.k}</span>
                  <span
                    style={{
                      font: r.mono ? `500 23px/1.4 ${F.mono}` : `600 25px/1.4 ${F.sans}`,
                      color: r.ok === false ? C.danger : r.ok === true ? C.ok : C.text,
                      wordBreak: 'break-all',
                    }}
                  >
                    {r.v}
                  </span>
                </div>
              )
            })}
          </Card>
        </div>

        <div style={{ opacity: showVerdict ? 1 : 0, marginTop: 4 }}>
          {verdict}
          {note ? (
            <div style={{ marginTop: 12, font: `500 23px/1.6 ${F.sans}`, color: C.sub }}>{note}</div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const Badge: React.FC<{ children: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' }> = ({
  children,
  tone = 'ok',
}) => {
  const color = tone === 'ok' ? C.ok : tone === 'warn' ? C.warn : C.danger
  return (
    <span
      style={{
        display: 'inline-block',
        font: `700 24px/1 ${F.sans}`,
        color,
        border: `1px solid ${color}66`,
        background: `${color}14`,
        borderRadius: 10,
        padding: '13px 18px',
      }}
    >
      {children}
    </span>
  )
}

export const Chain: React.FC = () => {
  return (
    <Bg glow={C.green} intensity={0.62}>
      <Sequence from={0} durationInFrames={380}>
        <ChainStep
          active={0}
          query="微信"
          rows={[
            { k: '命中', v: '内置白名单', ok: true },
            { k: '官方地址', v: 'weixin.qq.com', mono: true },
            { k: '响应', v: '即时 · 不发起任何外部请求' },
          ]}
          verdict={<Badge>已确认：官方下载地址</Badge>}
          note="常见软件不必动用 AI，秒出结果"
        />
      </Sequence>

      <Sequence from={380} durationInFrames={380}>
        <ChainStep
          active={1}
          query="curl"
          rows={[
            { k: '来源', v: 'Windows 程序包管理器官方索引', ok: true },
            { k: '官方地址', v: 'curl.se/windows/dl-8.x/curl-8.x-win64-mingw.zip', mono: true },
            { k: '官方 SHA-256', v: 'a3f91c7e…4f08c2', mono: true },
            { k: '本地实测', v: '逐字节一致 ✓', ok: true },
          ]}
          verdict={<Badge>哈希与官方声明完全一致 —— 强证据</Badge>}
          note="读的是微软审核维护的清单，不是搜索结果"
        />
      </Sequence>

      <Sequence from={760} durationInFrames={380}>
        <ChainStep
          active={2}
          query="某个小众工具"
          rows={[
            { k: '候选 1', v: '官方域名 · 证书匹配 · 通过', ok: true },
            { k: '候选 2', v: '镜像站 · 无签名 · 剔除', ok: false },
            { k: '候选 3', v: '官方 GitHub Releases · 通过', ok: true },
          ]}
          verdict={<Badge tone="warn">可选功能：需你自备 AI 接口与密钥</Badge>}
          note="AI 只负责给候选，核实由程序自己做"
        />
      </Sequence>
    </Bg>
  )
}
