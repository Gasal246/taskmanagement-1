"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Pause, Play, Trash2 } from "lucide-react";
import type { ActivityCommentAttachment } from "@/lib/activityCommentAttachments";
import AudioWaveform, { quietWave } from "./AudioWaveform";

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export default function AudioCommentAttachment({ attachment, onRemove, disabled }: {
  attachment: ActivityCommentAttachment;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState(quietWave);
  // Decode the actual file, so preview and posted messages show the same waveform.
  useEffect(() => {
    const controller = new AbortController();
    let context: AudioContext | undefined;
    setPeaks(quietWave); setPosition(0); setDuration(0); setPlaying(false); setFailed(false); setLoading(false);
    void (async () => {
      try {
        const response = await fetch(attachment.url, { signal: controller.signal });
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        if (controller.signal.aborted) return;
        const samples = buffer.getChannelData(0);
        const values = Array.from({ length: 40 }, (_, index) => {
          const start = Math.floor(index * samples.length / 40);
          const end = Math.floor((index + 1) * samples.length / 40);
          let peak = 0;
          for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
          return peak;
        });
        const max = Math.max(...values, 0.01);
        setPeaks(values.map(value => Math.max(0.08, value / max)));
        setDuration(buffer.duration);
      } catch { /* Native playback remains available if waveform decoding fails. */ }
      finally { if (context && context.state !== "closed") void context.close().catch(() => {}); }
    })();
    return () => { controller.abort(); if (context && context.state !== "closed") void context.close().catch(() => {}); };
  }, [attachment.url]);

  const toggle = async () => {
    const player = audio.current;
    if (!player) return;
    if (!player.paused) { player.pause(); return; }
    setFailed(false); setLoading(true);
    try { await player.play(); } catch { setFailed(true); } finally { setLoading(false); }
  };
  return <div className="w-full min-w-0 rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-3" aria-label="Voice message">
    <div className="flex min-w-0 items-center gap-2">
      <button type="button" onClick={() => void toggle()} disabled={loading} aria-label={playing ? "Pause voice message" : "Play voice message"} title={playing ? "Pause" : "Play"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-white transition hover:bg-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-60">
        {loading ? <Loader2 size={17} className="animate-spin" /> : playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative">
          <AudioWaveform peaks={peaks} progress={duration ? position / duration : 0} />
          <input type="range" min={0} max={duration || 1} step={0.01} value={Math.min(position, duration || 1)} disabled={!duration} aria-label="Seek voice message" aria-valuetext={`${timeLabel(position)} of ${timeLabel(duration)}`} onChange={event => {
            if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }
          }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:opacity-100" />
        </div>
        <div className="flex justify-between text-[10px] tabular-nums text-slate-400"><span>{timeLabel(position)}</span><span>{timeLabel(duration)}</span></div>
      </div>
      {onRemove ? <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove voice message" title="Discard voice message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-950 hover:text-rose-300 disabled:opacity-50"><Trash2 size={16} /></button> :
        <a href={attachment.url} download={attachment.name} aria-label="Download voice message" title="Download voice message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-cyan-900/50 hover:text-cyan-200"><Download size={16} /></a>}
    </div>
    <audio key={attachment.url} ref={audio} preload="metadata" src={attachment.url} className="hidden" onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setLoading(false); }} onLoadedMetadata={event => {
      setFailed(false);
      if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
    }} />
    {failed && <p role="alert" className="mt-2 text-xs text-rose-300">Audio could not be played. Check your connection and try again.</p>}
  </div>;
}
