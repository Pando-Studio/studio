import React from 'react';
import { Composition } from 'remotion';
import { SlideshowComposition } from './composition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SlideshowComp = SlideshowComposition as React.FC<any>;

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="SlideshowVideo"
        component={SlideshowComp}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
