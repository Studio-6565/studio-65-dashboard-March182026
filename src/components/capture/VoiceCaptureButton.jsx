import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/studio/StudioToast';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

const MONO = '"DM Mono", monospace';
const MAX_DURATION_MS = 5 * 60 * 1000; // 5 min
const SILENCE_THRESHOLD = 0.01;
const SILENCE_AFTER_MS = 30 * 1000; // silence detection kicks in after 30s
const SILENCE_DURATION_MS = 3000; // 3s of silence

export default function VoiceCaptureButton({ projects = [], contacts = [], onTasksCreated, size = 'normal' }) {
  const [state, setState] = useState('idle'); // idle | recording | processing
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const monitorAudio = useCallback((analyser) => {
    const buf = new Uint8Array(analyser.fftSize);
    let silenceStart = null;

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) / buf.length);
      setAudioLevel(Math.min(1, rms * 8));

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > SILENCE_AFTER_MS) {
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
            stopRecording();
            return;
          }
        } else {
          silenceStart = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(250);

      startTimeRef.current = Date.now();
      setState('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
        elapsedRef.current = e;
        setElapsed(e);
        if (e >= MAX_DURATION_MS / 1000) stopRecording();
      }, 500);

      monitorAudio(analyser);
    } catch (err) {
      showToast('Microphone access denied', 'red');
    }
  };

  const stopRecording = useCallback(async () => {
    if (state !== 'recording' && mediaRecorderRef.current?.state !== 'recording') return;

    stopAll();
    setState('processing');

    const mr = mediaRecorderRef.current;
    if (!mr) { setState('idle'); return; }

    await new Promise(resolve => {
      mr.onstop = resolve;
      if (mr.state !== 'inactive') mr.stop();
      else resolve();
    });

    const mimeType = mr.mimeType || 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (blob.size < 1000) {
      showToast('Recording too short', 'amber');
      setState('idle');
      return;
    }

    try {
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
      const { file_url: audio_url } = await base44.integrations.Core.UploadFile({ file });

      // Create VoiceCapture record
      const vc = await base44.entities.VoiceCapture.create({
        audio_url,
        duration_seconds: elapsedRef.current,
        status: 'processing'
      });

      showToast('Transcribing...', 'blue');

      const result = await base44.functions.invoke('voiceCapture', {
        audio_url,
        voice_capture_id: vc.id,
        contacts: contacts.slice(0, 50).map(c => ({ name: c.name, id: c.id })),
        projects: projects.slice(0, 30).map(p => ({ name: p.name, id: p.id, client: p.client }))
      });

      const n = result.data?.task_count || 0;
      const m = result.data?.needs_input_count || 0;
      const msg = m > 0
        ? `${n} task${n !== 1 ? 's' : ''} added · ${m} need${m !== 1 ? '' : 's'} your input`
        : `${n} task${n !== 1 ? 's' : ''} captured`;

      showToast(msg, n > 0 ? 'green' : 'amber');
      onTasksCreated?.({ task_count: n, needs_input_count: m });
    } catch (err) {
      showToast('Processing failed: ' + err.message, 'red');
    }

    setState('idle');
    setElapsed(0);
    setAudioLevel(0);
  }, [state, contacts, projects, onTasksCreated]);

  const toggle = () => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const isSmall = size === 'small';

  if (state === 'processing') {
    return (
      <button disabled style={btnStyle(isSmall, 'processing')}>
        <Loader2 size={isSmall ? 14 : 18} style={{ animation: 'spin 1s linear infinite' }} />
        {!isSmall && <span style={{ fontFamily: MONO, fontSize: 11 }}>Processing...</span>}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </button>
    );
  }

  if (state === 'recording') {
    return (
      <button onClick={toggle} style={btnStyle(isSmall, 'recording')}>
        {/* Pulse ring */}
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(232,26,26,0.3)',
          transform: `scale(${1 + audioLevel * 0.5})`,
          transition: 'transform 0.08s',
          pointerEvents: 'none'
        }} />
        <Square size={isSmall ? 12 : 16} fill="#fff" />
        {!isSmall && (
          <span style={{ fontFamily: MONO, fontSize: 11, zIndex: 1 }}>{fmt(elapsed)}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title="Voice capture (⌘M)"
      style={btnStyle(isSmall, 'idle')}
    >
      <Mic size={isSmall ? 14 : 18} />
      {!isSmall && <span style={{ fontFamily: MONO, fontSize: 11 }}>Voice</span>}
    </button>
  );
}

function btnStyle(small, state) {
  const base = {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 6,
    border: 'none', cursor: state === 'processing' ? 'default' : 'pointer',
    fontFamily: 'Syne, sans-serif', fontWeight: 700,
    transition: 'all 0.15s', overflow: 'hidden',
    WebkitTapHighlightColor: 'transparent',
  };

  if (small) {
    return {
      ...base,
      width: 34, height: 34, borderRadius: '50%',
      justifyContent: 'center',
      background: state === 'recording' ? '#E81A1A' : state === 'processing' ? '#1A1A1A' : '#1A1A1A',
      color: state === 'recording' ? '#fff' : '#555',
      border: `1px solid ${state === 'recording' ? '#E81A1A' : '#222'}`,
    };
  }

  return {
    ...base,
    padding: '8px 14px', borderRadius: 8,
    background: state === 'recording' ? 'rgba(232,26,26,0.15)' : '#1A1A1A',
    border: `1px solid ${state === 'recording' ? 'rgba(232,26,26,0.5)' : '#222'}`,
    color: state === 'recording' ? '#E81A1A' : '#666',
  };
}