import React from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import timing from '../audio/timing.json'

const FPS = 30

/** 解说：按 timing.json 的绝对时间逐句插入 */
export const Narration: React.FC = () => (
  <>
    {timing.map((t) => (
      <Sequence key={t.file} from={Math.round(t.start * FPS)} durationInFrames={Math.ceil(t.dur * FPS) + 45}>
        <Audio src={staticFile('audio/narr/' + t.file.replace('.mp3', '.wav'))} volume={1} />
      </Sequence>
    ))}
  </>
)

/** 背景音乐：ducking 已在 wav 里烘好，这里只给个不抢词的电平 */
export const Bgm: React.FC = () => <Audio src={staticFile('audio/bgm.wav')} volume={1} />

type Sfx = { file: string; at: number; vol?: number }

/** 转场与强调音效；时间轴与分镜对齐 */
const SFX: Sfx[] = [
  // 转场 whoosh（大段切换）
  { file: 'whoosh', at: 8, vol: 0.45 },
  { file: 'whoosh', at: 15.33, vol: 0.3 },
  { file: 'whoosh', at: 22.67, vol: 0.32 },
  { file: 'whoosh', at: 30, vol: 0.42 },
  { file: 'whoosh', at: 40, vol: 0.38 },
  { file: 'whoosh', at: 52.67, vol: 0.32 },
  { file: 'whoosh', at: 65.33, vol: 0.32 },
  { file: 'whoosh', at: 78, vol: 0.4 },
  { file: 'whoosh', at: 88.67, vol: 0.32 },
  { file: 'whoosh', at: 99.33, vol: 0.32 },
  { file: 'whoosh', at: 110, vol: 0.4 },
  { file: 'whoosh', at: 120, vol: 0.32 },
  { file: 'whoosh', at: 130, vol: 0.4 },
  { file: 'whoosh', at: 148, vol: 0.42 },

  // 重音
  { file: 'impact', at: 30, vol: 0.5 },
  { file: 'impact', at: 78, vol: 0.4 },
  { file: 'impact', at: 110, vol: 0.42 },
  { file: 'impact', at: 148, vol: 0.4 },
  { file: 'impact', at: 160, vol: 0.55 },

  // 打字与确认
  { file: 'tick', at: 41.3, vol: 0.5 },
  { file: 'tick', at: 41.6, vol: 0.4 },
  { file: 'tick', at: 41.9, vol: 0.45 },
  { file: 'ok', at: 47.4, vol: 0.4 },
  { file: 'ok', at: 57.2, vol: 0.38 },
  { file: 'ok', at: 92.6, vol: 0.42 },
  { file: 'tick', at: 121.0, vol: 0.4 },

  // 故障感
  { file: 'glitch', at: 22.8, vol: 0.4 },
  { file: 'glitch', at: 121.6, vol: 0.35 },
]

export const Sfx: React.FC = () => (
  <>
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.round(s.at * FPS)} durationInFrames={90}>
        <Audio src={staticFile('audio/' + s.file + '.wav')} volume={s.vol ?? 0.4} />
      </Sequence>
    ))}
  </>
)
