// Speech input and output using the browser's built-in Web Speech API.
// Recognition may use the browser vendor's speech service (Chrome sends audio
// to Google for transcription); speech output runs locally.

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceSupport = {
  input: !!Recognition,
  output: typeof window !== 'undefined' && 'speechSynthesis' in window,
};

let active = null;

export function listen({ onInterim, onResult, onEnd, onError, lang } = {}) {
  if (!Recognition) {
    onError?.('Voice input is not supported in this browser. Try Chrome, Edge or Safari, or type your question.');
    return () => {};
  }
  stopListening();
  const rec = new Recognition();
  rec.lang = lang || navigator.language || 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim) onInterim?.(interim);
  };
  rec.onerror = (e) => {
    const msg = {
      'not-allowed': 'Microphone access was blocked. Allow the microphone in your browser settings to use voice.',
      'no-speech': 'I did not hear anything. Try again.',
      network: 'Voice recognition needs an internet connection in this browser.',
    }[e.error] || `Voice input error: ${e.error}`;
    onError?.(msg);
  };
  rec.onend = () => {
    active = null;
    if (finalText.trim()) onResult?.(finalText.trim());
    onEnd?.();
  };
  rec.start();
  active = rec;
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

export function speak(text, { rate = 1, onEnd } = {}) {
  if (!voiceSupport.output) return;
  window.speechSynthesis.cancel();
  // Speak numbered lists as separate sentences so they are easier to follow.
  const clean = String(text).replace(/\n+/g, '. ').replace(/\.\s*\./g, '.');
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = rate;
  u.lang = navigator.language || 'en-US';
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (voiceSupport.output) window.speechSynthesis.cancel();
}
