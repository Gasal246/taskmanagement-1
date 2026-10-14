"use client";

import { useEffect, useState } from "react";

export const quietWave = Array.from({ length: 40 }, () => 0.08);

/** Shared bars for the live microphone and the decoded recording. */
export default function AudioWaveform({ stream, peaks = quietWave, progress = 0 }: {
  stream?: MediaStream | null;
  peaks?: number[];
  progress?: number;
}) {
  const [live, setLive] = useState(quietWave);
  useEffect(() => {
    if (!stream) return;
    let context: AudioContext | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    try {
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      void context.resume().catch(() => {});
      const values = new Uint8Array(analyser.fftSize);
      interval = setInterval(() => {
        analyser.getByteTimeDomainData(values);
        const amplitude = Math.sqrt(values.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / values.length);
        setLive(previous => [...previous.slice(1), Math.min(1, Math.max(0.08, amplitude * 5))]);
      }, 80);
    } catch { /* Recording still works when audio analysis is unavailable. */ }
    return () => { clearInterval(interval); if (context) void context.close().catch(() => {}); };
  }, [stream]);
  const bars = stream ? live : peaks;
  return <svg aria-hidden="true" viewBox="0 0 160 32" preserveAspectRatio="none" className="h-8 w-full" data-audio-waveform>
    {bars.map((height, index) => <rect key={index} x={index * 4} y={16 - height * 14} width="2.5" height={Math.max(2, height * 28)} rx="1.25" className={stream ? "fill-rose-400" : index / bars.length < progress ? "fill-cyan-300" : "fill-slate-600"} />)}
  </svg>;
}
