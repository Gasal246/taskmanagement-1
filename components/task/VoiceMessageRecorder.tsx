"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import AudioWaveform from "./AudioWaveform";
import { Button } from "@/components/ui/button";
import { ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES, ACTIVITY_VOICE_MAX_SECONDS } from "@/lib/activityCommentAttachments";

const formats = [
  { mime: "audio/webm;codecs=opus", extension: "webm" },
  { mime: "audio/mp4", extension: "m4a" },
  { mime: "audio/ogg;codecs=opus", extension: "ogg" },
  { mime: "audio/webm", extension: "webm" },
];

export default function VoiceMessageRecorder({ disabled, onReady, onBusyChange }: {
  disabled?: boolean;
  onReady: (file: File) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [state, setState] = useState<"idle" | "requesting" | "recording" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);
  const discard = useRef(false);
  const generation = useRef(0);
  const callbacks = useRef({ onReady, onBusyChange });
  callbacks.current = { onReady, onBusyChange };
  const release = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  };
  useEffect(() => () => {
    generation.current++;
    active.current = false;
    discard.current = true;
    if (recorder.current?.state !== "inactive") recorder.current?.stop();
    release();
    callbacks.current.onBusyChange(false);
  }, []);

  const stop = (cancel = false) => {
    discard.current = cancel;
    if (recorder.current?.state === "recording") {
      setState("stopping");
      recorder.current.stop();
      release();
    } else if (cancel) {
      // Permission may still be pending. Ignore and close its eventual stream.
      generation.current++;
      active.current = false;
      release();
      setState("idle");
      callbacks.current.onBusyChange(false);
    }
  };

  const start = async () => {
    if (active.current || disabled) return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is unavailable here. Use a supported browser over HTTPS, or attach an audio file."); return;
    }
    const format = formats.find(value => MediaRecorder.isTypeSupported(value.mime));
    if (!format) { setError("This browser cannot record a supported audio format. You can attach an audio file instead."); return; }
    const attempt = ++generation.current;
    active.current = true;
    discard.current = false;
    callbacks.current.onBusyChange(true);
    setState("requesting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const recording = new MediaRecorder(media, { mimeType: format.mime, audioBitsPerSecond: 64000 });
      recorder.current = recording;
      const chunks: Blob[] = [];
      let size = 0;
      recording.ondataavailable = event => {
        if (attempt !== generation.current || !event.data.size) return;
        size += event.data.size;
        if (size >= ACTIVITY_COMMENT_ATTACHMENT_MAX_BYTES) {
          discard.current = true;
          setError("The recording is too large. Please record a shorter message.");
          stop(true);
          return;
        }
        chunks.push(event.data);
      };
      recording.onerror = () => {
        if (attempt !== generation.current) return;
        setError("Recording was interrupted. Please try again.");
        stop(true);
      };
      recording.onstop = () => {
        if (attempt !== generation.current) return;
        release();
        active.current = false;
        recorder.current = null;
        callbacks.current.onBusyChange(false);
        setState("idle");
        if (discard.current) return;
        const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
        if (!blob.size) { setError("No audio was recorded. Please try again."); return; }
        callbacks.current.onReady(new File([blob], `voice-message-${Date.now()}.${format.extension}`, { type: blob.type }));
      };
      recording.start(1000);
      setSeconds(0);
      setState("recording");
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(Math.min(elapsed, ACTIVITY_VOICE_MAX_SECONDS));
        if (elapsed >= ACTIVITY_VOICE_MAX_SECONDS) stop();
      }, 250);
    } catch (failure) {
      if (attempt !== generation.current) return;
      release();
      active.current = false;
      setState("idle");
      callbacks.current.onBusyChange(false);
      const name = failure instanceof DOMException ? failure.name : "";
      setError(name === "NotAllowedError" ? "Microphone access was denied. Allow microphone access in your browser and try again." : name === "NotFoundError" ? "No microphone was found. Connect a microphone and try again." : "Unable to start recording. Check that your microphone is available and try again.");
    }
  };

  return <div className={state === "idle" ? "relative shrink-0" : "relative min-w-0 flex-1"}>
    {state === "idle" ? <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-300" disabled={disabled} aria-label="Record voice" title="Record voice" onClick={() => void start()}><Mic size={15} /></Button> :
      <div className="flex min-w-0 items-center gap-1 rounded-xl bg-rose-950/20 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-rose-300" disabled={state === "stopping"} onClick={() => stop(true)} aria-label="Discard recording" title="Discard recording"><Trash2 size={16} /></Button>
        <div className="min-w-4 flex-1"><AudioWaveform stream={state === "recording" ? stream.current : null} /></div>
        <span role="status" className="shrink-0 text-[11px] tabular-nums text-rose-200">{state === "recording" ? <><span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span><span className="sr-only"> / 3:00</span></> : <><Loader2 size={14} className="animate-spin" /><span className="sr-only">{state === "requesting" ? "Waiting for microphone…" : "Preparing recording…"}</span></>}</span>
        {state === "recording" && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-rose-200" onClick={() => stop()} aria-label="Stop recording" title="Stop recording"><Square size={16} fill="currentColor" /></Button>}
      </div>}
    {error && <p role="alert" className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg border border-rose-900 bg-slate-950 p-3 text-xs text-rose-300">{error}</p>}
  </div>;
}
