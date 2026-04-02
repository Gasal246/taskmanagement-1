"use client";

import ReactPlayer from "react-player";

type DocsVideoPlayerProps = {
  videoId: string;
  autoPlay?: boolean;
};

export default function DocsVideoPlayer({
  videoId,
  autoPlay = false,
}: DocsVideoPlayerProps) {
  return (
    <ReactPlayer
      src={`https://www.youtube.com/watch?v=${videoId}`}
      playing={autoPlay}
      controls
      playsInline
      width="100%"
      height="100%"
      style={{ width: "100%", height: "100%" }}
      config={{
        youtube: {
          playerVars: {
            autoplay: autoPlay ? 1 : 0,
            modestbranding: 1,
            rel: 0,
          },
        },
      }}
    />
  );
}
