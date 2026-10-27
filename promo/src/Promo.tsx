import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { Hook } from './scenes/Hook'
import { Pain } from './scenes/Pain'
import { Intro } from './scenes/Intro'
import { Chain } from './scenes/Chain'
import { Verify } from './scenes/Verify'
import { Risk } from './scenes/Risk'
import { Trust } from './scenes/Trust'
import { Close } from './scenes/Close'
import { Fx, Push, Streak } from './Fx'
import { Bgm, Narration, Sfx } from './Sound'

/**
 * 净装宣传片 · 165s / 30fps / 4950 帧
 *
 *  0    –  240  钩子：假下载按钮 → 「是官网吗？」
 *  240  –  900  三类坑：仿冒站 / 捆绑 / 破解木马
 *  900  – 1200  亮相：品牌与定位
 * 1200  – 2340  三级来源链路
 * 2340  – 3300  三重校验
 * 3300  – 3900  风险与恶意软件拦截
 * 3900  – 4440  自证清白（源码 / 不碰系统 / 不配 AI 也能用）
 * 4440  – 4950  隐私 / 获取渠道 / 收尾
 */
export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#060a09' }}>
      <Sequence from={0} durationInFrames={240}>
        <Push dur={240}>
          <Hook />
        </Push>
      </Sequence>
      <Sequence from={240} durationInFrames={660}>
        <Push dur={660} to={1.03}>
          <Pain />
        </Push>
      </Sequence>
      <Sequence from={900} durationInFrames={300}>
        <Push dur={300} to={1.05}>
          <Intro />
        </Push>
      </Sequence>
      <Sequence from={1200} durationInFrames={1140}>
        <Push dur={1140} to={1.025}>
          <Chain />
        </Push>
      </Sequence>
      <Sequence from={2340} durationInFrames={960}>
        <Push dur={960} to={1.03}>
          <Verify />
        </Push>
      </Sequence>
      <Sequence from={3300} durationInFrames={600}>
        <Push dur={600} to={1.035}>
          <Risk />
        </Push>
      </Sequence>
      <Sequence from={3900} durationInFrames={540}>
        <Push dur={540} to={1.03}>
          <Trust />
        </Push>
      </Sequence>
      <Sequence from={4440} durationInFrames={510}>
        <Push dur={510} to={1.04}>
          <Close />
        </Push>
      </Sequence>

      {/* 全局质感层 */}
      <Fx count={44} opacity={0.9} />

      {/* 大段落切换时的光带扫过 */}
      {[240, 900, 1200, 2340, 3300, 3900, 4440].map((at) => (
        <Sequence key={at} from={Math.max(0, at - 6)} durationInFrames={34}>
          <Streak at={6} />
        </Sequence>
      ))}

      {/* 音轨：BGM（已烘 ducking）+ 解说 + 音效 */}
      <Bgm />
      <Narration />
      <Sfx />
    </AbsoluteFill>
  )
}
