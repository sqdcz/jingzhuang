import React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Bg, Card, H1, Kicker, Reveal, Sub } from '../lib'
import { C, F } from '../theme'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const lerp = (f: number, a: number, b: number, x: number, y: number) => interpolate(f, [a, b], [x, y], CL)

/* ---------- 01 仿冒站 ---------- */
const FakeSite: React.FC = () => {
  const f = useCurrentFrame()
  const rows = [
    { url: 'weixin.qq.com', ok: true, delay: 26 },
    { url: 'weixin-qq.com.cn', ok: false, delay: 44 },
    { url: 'weixin-qq-cn.com', ok: false, delay: 58 },
  ]
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 70, padding: '0 130px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={4}>
          <Kicker color={C.danger}>01 / 仿冒官网</Kicker>
        </Reveal>
        <Reveal delay={12} y={34}>
          <H1 size={78} style={{ marginTop: 22 }}>
            差一个点，
            <br />
            装的就是别人的程序
          </H1>
        </Reveal>
        <Reveal delay={40}>
          <Sub size={30} style={{ marginTop: 22 }}>
            搜索结果里排第一的，往往是买来的广告位
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 760, padding: 30 }} glow={C.danger}>
        <div style={{ font: `500 20px/1 ${F.sans}`, color: C.faint, marginBottom: 18, letterSpacing: 1 }}>
          地址栏
        </div>
        {rows.map((r) => {
          const s = spring({ frame: f - r.delay, fps: 30, config: { damping: 18, stiffness: 200 } })
          return (
            <div
              key={r.url}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                marginBottom: 12,
                borderRadius: 14,
                border: `1px solid ${r.ok ? C.ok + '55' : C.danger + '4d'}`,
                background: r.ok ? 'rgba(53,184,122,0.07)' : 'rgba(229,72,77,0.07)',
                opacity: s,
                transform: `translateX(${(1 - s) * 26}px)`,
              }}
            >
              <span style={{ font: `800 26px/1 ${F.sans}`, color: r.ok ? C.ok : C.danger }}>{r.ok ? '✓' : '✕'}</span>
              <span
                style={{
                  font: `500 30px/1 ${F.mono}`,
                  color: r.ok ? C.text : C.sub,
                  textDecoration: r.ok ? 'none' : 'line-through',
                  textDecorationColor: C.danger + '99',
                }}
              >
                {r.url}
              </span>
              {r.ok ? (
                <span style={{ marginLeft: 'auto', font: `600 19px/1 ${F.sans}`, color: C.ok }}>官方</span>
              ) : (
                <span style={{ marginLeft: 'auto', font: `600 19px/1 ${F.sans}`, color: C.danger }}>仿冒</span>
              )}
            </div>
          )
        })}
        <div
          style={{
            marginTop: 14,
            font: `500 21px/1.5 ${F.sans}`,
            color: C.sub,
            opacity: lerp(f, 76, 92, 0, 1),
          }}
        >
          HTTPS 证书同样能签发 —— 有锁 ≠ 是官网
        </div>
      </Card>
    </AbsoluteFill>
  )
}

/* ---------- 02 捆绑全家桶 ---------- */
const Bundleware: React.FC = () => {
  const f = useCurrentFrame()
  const items = [
    { name: 'XX 浏览器', delay: 34 },
    { name: 'XX 安全卫士', delay: 52 },
    { name: 'XX 影视大全', delay: 70 },
  ]
  const shown = items.filter((it) => f > it.delay).length

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 70, padding: '0 130px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={4}>
          <Kicker color={C.warn}>02 / 捆绑安装</Kicker>
        </Reveal>
        <Reveal delay={12} y={34}>
          <H1 size={78} style={{ marginTop: 22 }}>
            「下一步」里，
            <br />
            藏着 3 个你没选的东西
          </H1>
        </Reveal>
        <Reveal delay={40}>
          <Sub size={30} style={{ marginTop: 22 }}>
            它们默认勾选，且藏在灰色小字里
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 700, padding: 34 }} glow={C.warn}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <span style={{ font: `600 22px/1 ${F.sans}`, color: C.sub }}>自定义安装</span>
          <span style={{ font: `800 44px/1 ${F.mono}`, color: shown >= 3 ? C.danger : C.warn }}>
            +{shown}
          </span>
        </div>
        {items.map((it, i) => {
          const s = spring({ frame: f - it.delay, fps: 30, config: { damping: 12, stiffness: 240 } })
          const checked = f > it.delay
          return (
            <div
              key={it.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 20px',
                marginBottom: 12,
                borderRadius: 12,
                border: `1px solid ${checked ? C.danger + '55' : C.line}`,
                background: checked ? 'rgba(229,72,77,0.06)' : 'transparent',
                opacity: i === 0 ? 0.35 + s * 0.65 : s,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: `2px solid ${checked ? C.danger : C.faint}`,
                  background: checked ? C.danger : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${checked ? 1.06 : 1})`,
                }}
              >
                {checked ? <span style={{ color: '#fff', font: `800 20px/1 ${F.sans}` }}>✓</span> : null}
              </div>
              <span style={{ font: `500 28px/1 ${F.sans}`, color: checked ? C.text : C.faint }}>{it.name}</span>
              <span style={{ marginLeft: 'auto', font: `500 18px/1 ${F.sans}`, color: C.faint }}>推荐安装</span>
            </div>
          )
        })}
        <div
          style={{
            marginTop: 16,
            font: `500 21px/1.5 ${F.sans}`,
            color: C.warn,
            opacity: lerp(f, 92, 108, 0, 1),
          }}
        >
          装完多了三个图标，卸起来还得一个个找
        </div>
      </Card>
    </AbsoluteFill>
  )
}

/* ---------- 03 破解与木马 ---------- */
const Malware: React.FC = () => {
  const f = useCurrentFrame()
  const hex = 'a3f91c7e5b0d2f84c6a1e93d7b4f08c2'
  const visible = Math.floor(lerp(f, 8, 60, 0, hex.length))

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 70, padding: '0 130px' }}>
      <div style={{ flex: 1 }}>
        <Reveal delay={4}>
          <Kicker color={C.danger}>03 / 破解补丁</Kicker>
        </Reveal>
        <Reveal delay={12} y={34}>
          <H1 size={78} style={{ marginTop: 22 }}>
            破解补丁，
            <br />
            是木马最爱的外壳
          </H1>
        </Reveal>
        <Reveal delay={40}>
          <Sub size={30} style={{ marginTop: 22 }}>
            一个"免激活"，背后可能是盗号、挖矿、远控
          </Sub>
        </Reveal>
      </div>

      <Card style={{ width: 700, padding: 36 }} glow={C.danger}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
          <span style={{ font: `800 52px/1 ${F.sans}`, color: C.danger }}>☠</span>
          <div>
            <div style={{ font: `700 30px/1.2 ${F.sans}`, color: C.text }}>kms激活.exe</div>
            <div style={{ font: `500 20px/1 ${F.sans}`, color: C.faint, marginTop: 6 }}>来源：未知 · 无有效签名</div>
          </div>
        </div>
        <div
          style={{
            font: `500 21px/1.9 ${F.mono}`,
            color: C.faint,
            background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: '16px 18px',
            wordBreak: 'break-all',
            minHeight: 96,
          }}
        >
          <span style={{ color: C.danger }}>SHA-256 </span>
          {hex.slice(0, visible)}
          <span style={{ opacity: (f % 20) > 10 ? 1 : 0 }}>▌</span>
        </div>
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 10,
            opacity: lerp(f, 84, 100, 0, 1),
          }}
        >
          {['盗号', '挖矿', '远控'].map((t) => (
            <span
              key={t}
              style={{
                font: `600 20px/1 ${F.sans}`,
                color: C.danger,
                border: `1px solid ${C.danger}55`,
                background: 'rgba(229,72,77,.08)',
                borderRadius: 99,
                padding: '9px 16px',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </Card>
    </AbsoluteFill>
  )
}

export const Pain: React.FC = () => {
  return (
    <Bg glow={C.warn} intensity={0.5}>
      <Sequence from={0} durationInFrames={180}>
        <FakeSite />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <Bundleware />
      </Sequence>
      <Sequence from={360} durationInFrames={180}>
        <Malware />
      </Sequence>
    </Bg>
  )
}
