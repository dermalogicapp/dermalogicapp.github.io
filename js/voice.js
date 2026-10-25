// Speech input and output using the browser's built-in Web Speech API, tuned
// for phones. Recognition may use the browser vendor's speech service (Chrome
// sends audio to Google for transcription); speech output runs locally.
//
// Phone notes: browsers only allow speech output after a tap, so unlockAudio()
// is called from tap handlers; long replies are spoken sentence by sentence
// because Chrome on Android cuts off long utterances.

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceSupport = {
  input: !!Recognition,
  output: typeof window !== 'undefined' && 'speechSynthesis' in window,
};

let active = null;
let audioCtx = null;
let unlocked = false;
let speakToken = 0;
let speaking = false;

// Call from a tap or click. Wakes up speech output and the sound cues.
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
    audioCtx?.resume?.();
  } catch {}
  if (voiceSupport.output) {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

// Short tones so people who cannot see the screen know when to speak.
export function cue(kind) {
  try {
    navigator.vibrate?.(kind === 'start' ? 25 : [15, 40, 15]);
  } catch {}
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = kind === 'start' ? [660, 880] : [880, 520];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, now + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.15, now + i * 0.11 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.1);
      o.connect(g).connect(audioCtx.destination);
      o.start(now + i * 0.11);
      o.stop(now + i * 0.11 + 0.12);
    });
  } catch {}
}

export function listen({ onStart, onInterim, onResult, onEnd, onError, lang } = {}) {
  if (!Recognition) {
    onError?.('Voice input is not supported in this browser. Try Chrome or Safari, or use your keyboard\'s microphone to dictate.');
    onEnd?.();
    return () => {};
  }
  stopListening();
  const rec = new Recognition();
  rec.lang = lang || navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  let lastInterim = '';
  let failed = false;
  rec.onstart = () => onStart?.();
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim) {
      lastInterim = interim;
      onInterim?.(interim);
    } else if (finalText) onInterim?.(finalText);
  };
  rec.onerror = (e) => {
    failed = e.error !== 'no-speech' && e.error !== 'aborted';
    const msg = {
      'not-allowed': 'Microphone access was blocked. Tap the lock or tune icon next to the web address, allow the microphone, then try again.',
      'service-not-allowed': 'This browser will not let this page use speech recognition. Try Chrome or Safari.',
      'audio-capture': 'No microphone was found.',
      'no-speech': 'I did not hear anything. Tap the microphone and try again.',
      network: 'Voice recognition needs an internet connection.',
      aborted: '',
    }[e.error];
    if (msg !== '') onError?.(msg ?? `Voice input error: ${e.error}`, e.error);
  };
  rec.onend = () => {
    active = null;
    // Some phones end without marking the last words final: use what we heard.
    const text = (finalText || (failed ? '' : lastInterim)).trim();
    if (text) onResult?.(text);
    onEnd?.(!!text);
  };
  try {
    rec.start();
    active = rec;
  } catch (err) {
    onError?.('Could not start the microphone. Please try again.');
    onEnd?.(false);
  }
  return stopListening;
}

export function stopListening() {
  if (active) {
    try {
      active.stop();
    } catch {}
  }
}

export function isListening() {
  return !!active;
}

export function isSpeaking() {
  return speaking;
}

// Splits a reply into short chunks at sentence ends.
export function chunkText(text, max = 170) {
  const clean = String(text).replace(/:\n/g, ': ').replace(/\n+/g, '. ').replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    if (s.length > max) {
      // A very long sentence: split at commas, then at spaces.
      for (const part of s.split(/(?<=,)\s+/)) {
        if ((cur + part).length > max && cur) {
          out.push(cur.trim());
          cur = '';
        }
        cur += part + ' ';
      }
    } else cur += s + ' ';
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices?.() || [];
  const base = lang.slice(0, 2).toLowerCase();
  const same = voices.filter((v) => v.lang?.toLowerCase().startsWith(base));
  const nice = same.find((v) => /natural|google|samantha|karen|serena|female/i.test(v.name));
  return nice || same.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) || same[0] || null;
}

export function speak(text, { rate = 1, onStart, onEnd } = {}) {
  if (!voiceSupport.output) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  const token = ++speakToken;
  synth.cancel();
  const lang = navigator.language || 'en-US';
  const chunks = chunkText(text);
  let i = 0;
  speaking = true;
  const finish = () => {
    if (token !== speakToken) return;
    speaking = false;
    onEnd?.();
  };
  const next = () => {
    if (token !== speakToken) return;
    if (i >= chunks.length) return finish();
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    u.rate = rate;
    u.lang = lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    if (i === 1) u.onstart = () => token === speakToken && onStart?.();
    u.onend = next;
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? null : next());
    try {
      synth.speak(u);
    } catch {
      finish();
    }
  };
  // A short pause after cancel() avoids a silent-speech bug on Android Chrome.
  setTimeout(next, 80);
}

export function stopSpeaking() {
  speakToken++;
  speaking = false;
  if (voiceSupport.output) window.speechSynthesis.cancel();
}
