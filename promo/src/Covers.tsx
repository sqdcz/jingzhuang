import React from 'react'
import { AbsoluteFill } from 'remotion'
import { Bg, H1, Shield } from './lib'
import { C, F } from './theme'

/** 16:9 封面（1920×1080）：左文右图 */
export const Cover16x9: React.FC = () => (
  <Bg glow={C.green} intensity={1} grid>
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 130px', gap: 40 }}>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            font: `700 28px/1 ${F.sans}`,
            letterSpacing: 2,
            color: C.bg,
            background: C.greenLite,
            borderRadius: 8,
            padding: '12px 18px',
          }}
        >
          开源 · 免费 · 本地运行
        </div>

        <H1 size={122} style={{ marginTop: 34, lineHeight: 1.16 }}>
          你点的「下载」
          <br />
          <span style={{ color: C.greenLite }}>真的是官网吗？</span>
        </H1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 46 }}>
          <div style={{ width: 54, height: 3, background: C.greenLite }} />
          <div style={{ font: `800 62px/1 ${F.sans}`, color: C.text, letterSpacing: 6 }}>净装</div>
          <div style={{ font: `500 30px/1.4 ${F.sans}`, color: C.sub }}>
            软件来源查询 · 安装包安全校验
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: 560, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.greenLite}33 0%, transparent 66%)`,
            filter: 'blur(4px)',
          }}
        />
        <Shield size={430} progress={1} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 130,
          bottom: 68,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          font: `500 26px/1 ${F.sans}`,
          color: C.faint,
          letterSpacing: 1,
        }}
      >
        <span>微软商店</span>
        <span style={{ color: C.greenLite, opacity: 0.6 }}>·</span>
        <span>GitHub</span>
        <span style={{ color: C.greenLite, opacity: 0.6 }}>·</span>
        <span>开源 MIT</span>
      </div>
    </AbsoluteFill>
  </Bg>
)

/** 4:3 封面（1440×1080）：上图下文 */
export const Cover4x3: React.FC = () => (
  <Bg glow={C.green} intensity={1} grid>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '100px 110px 0' }}>
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <div
          style={{
            position: 'absolute',
            inset: -90,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.greenLite}2e 0%, transparent 65%)`,
          }}
        />
        <Shield size={286} progress={1} />
      </div>

      <H1 size={116} style={{ textAlign: 'center', marginTop: 8, lineHeight: 1.16 }}>
        你点的「下载」
        <br />
        <span style={{ color: C.greenLite }}>真的是官网吗？</span>
      </H1>

      <div
        style={{
          marginTop: 42,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          border: `1px solid ${C.line}`,
          background: 'rgba(255,255,255,.04)',
          borderRadius: 99,
          padding: '16px 34px',
        }}
      >
        <span style={{ font: `800 38px/1 ${F.sans}`, color: C.text, letterSpacing: 5 }}>净装</span>
        <span style={{ width: 1, height: 26, background: C.line }} />
        <span style={{ font: `500 25px/1 ${F.sans}`, color: C.sub }}>官方来源 · 三重校验 · 免费开源</span>
      </div>
    </AbsoluteFill>

    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 62,
        textAlign: 'center',
        font: `500 25px/1 ${F.sans}`,
        color: C.faint,
        letterSpacing: 1,
      }}
    >
      微软商店 <span style={{ color: C.greenLite, opacity: 0.6, margin: '0 10px' }}>·</span> GitHub
      <span style={{ color: C.greenLite, opacity: 0.6, margin: '0 10px' }}>·</span> 开源 MIT
    </div>
  </Bg>
)
