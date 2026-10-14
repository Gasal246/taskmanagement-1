import React from "react";
import { createRoot } from "react-dom/client";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ActivityCommentsSheet from "@/components/task/ActivityCommentsSheet";

const state = (window as any).voiceChecks = { uploads: [] as any[], posts: [] as any[], comments: [] as any[], streams: [] as MediaStream[], deny: false, uploadFail: false, delay: false, playbackUrl: "", releasePermission: null as (() => void) | null };
const originalMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = async constraints => {
  if (state.deny) throw new DOMException('Denied', 'NotAllowedError');
  const stream = await originalMedia(constraints);
  state.streams.push(stream);
  if (state.delay) await new Promise<void>(resolve => { state.releasePermission = resolve; });
  return stream;
};
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (url.startsWith('/api/task/activity-files') && init?.method === 'POST') {
    if (state.uploadFail) return Response.json({ message: 'Upload temporarily failed' }, { status: 502 });
    const file = (init.body as FormData).get('file') as File;
    state.uploads.push({ name: file.name, size: file.size, type: file.type });
    state.playbackUrl = URL.createObjectURL(file);
    return Response.json({ file: { name: file.name, size: file.size, mimeType: file.type, extension: file.name.split('.').pop(), storagePath: 'task-activity-comments/task/activity/viewer/voice.webm', url: 'https://firebasestorage.googleapis.com/test-voice' } }, { status: 201 });
  }
  if (url.endsWith('/comments/seen')) return Response.json({ status: 200 });
  if (url.endsWith('/comments')) {
    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body)); state.posts.push(payload);
      const comment = { id: 'voice-1', activityId: 'activity', taskId: 'task', parentId: payload.parentId, rootId: null, depth: 0, body: payload.body, attachment: { ...payload.attachment, url: state.playbackUrl }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isSeen: true, canDelete: true, deletedAt: null, author: { id: 'viewer', name: 'Test user', avatarUrl: '' } };
      state.comments.push(comment);
      return Response.json({ comment }, { status: 201 });
    }
    return Response.json({ comments: state.comments });
  }
  return originalFetch(input, init);
};
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
createRoot(document.getElementById('root')!).render(<SessionProvider session={{ user: { id: 'viewer' }, expires: '2099-01-01T00:00:00Z' }}><QueryClientProvider client={client}><ActivityCommentsSheet activity={{ _id: 'activity', activity: 'Voice discussion test' }} taskId="task" /></QueryClientProvider></SessionProvider>);
