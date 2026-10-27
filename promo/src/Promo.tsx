import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { Hook } from './scenes/Hook'
import { Pain } from './scenes/Pain'
import { Intro } from './scenes/Intro'
import { Chain } from './scenes/Chain'
import { Verify } from './scenes/Verify'
import { Risk } from './scenes/Risk'
import { Close } from './scenes/Close'

/**
 * 净装宣传片（120s / 30fps / 3600 帧）
 * 0     – 210  钩子：假下载按钮 → 「是官网吗？」
 * 210   – 750  三类坑：仿冒站 / 捆绑 / 破解木马
 * 750   – 990  亮相：品牌与定位
 * 990   – 1890 三级来源链路
 * 1890  – 2670 三重校验
 * 2670  – 3150 风险与恶意软件拦截
 * 3150  – 3600 隐私 / 获取渠道 / 收尾
 */
export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#060a09' }}>
      <Sequence from={0} durationInFrames={210}>
        <Hook />
      </Sequence>
      <Sequence from={210} durationInFrames={540}>
        <Pain />
      </Sequence>
      <Sequence from={750} durationInFrames={240}>
        <Intro />
      </Sequence>
      <Sequence from={990} durationInFrames={900}>
        <Chain />
      </Sequence>
      <Sequence from={1890} durationInFrames={780}>
        <Verify />
      </Sequence>
      <Sequence from={2670} durationInFrames={480}>
        <Risk />
      </Sequence>
      <Sequence from={3150} durationInFrames={450}>
        <Close />
      </Sequence>
    </AbsoluteFill>
  )
}
