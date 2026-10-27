import React from 'react'
import { Composition } from 'remotion'
import { Promo } from './Promo'
import { Cover16x9, Cover4x3 } from './Covers'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Promo" component={Promo} durationInFrames={3600} fps={30} width={1920} height={1080} />
      <Composition id="Cover16x9" component={Cover16x9} durationInFrames={1} fps={30} width={1920} height={1080} />
      <Composition id="Cover4x3" component={Cover4x3} durationInFrames={1} fps={30} width={1440} height={1080} />
    </>
  )
}
