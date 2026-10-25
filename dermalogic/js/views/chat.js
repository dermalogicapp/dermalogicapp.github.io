import { store } from '../store.js';
import { esc, announce, toast } from '../ui.js';
import { respond } from '../chatbot.js';
import { dropletIcon } from '../icon.js';
import { listen, stopListening, isListening, speak, stopSpeaking, voiceSupport } from '../voice.js';

const SUGGESTIONS = ['Read my morning routine', 'What is niacinamide?', 'How do I fade dark spots?', 'My skin is itching', 'I used to bleach my skin', 'What is my skin tone?', 'Help'];

export default {
  title: 'Assistant',
  render(root, { navigate }) {
    const st = () => store.get();
    let handsFree = false;

    root.innerHTML = `
      <h1>Assistant</h1>
      <p class="lead">Ask about your routine, ingredients or a skin problem by typing or with your voice. Answers come from DermaLogic's built-in skin-care guide on this device.</p>

      <section class="card voice-controls" aria-labelledby="vc-h">
        <h2 id="vc-h" class="sr-only">Voice settings</h2>
        <label class="check"><input type="checkbox" id="speak" ${st().settings.speak ? 'checked' : ''} /> <span>Read replies aloud</span></label>
        <label class="check"><input type="checkbox" id="handsfree" ${voiceSupport.input ? '' : 'disabled'} /> <span>Hands-free conversation (listen again after each reply)</span></label>
        <div class="field inline">
          <label for="rate">Speaking speed <output id="rate-out">${st().settings.rate}</output>×</label>
          <input type="range" id="rate" min="0.6" max="1.8" step="0.1" value="${st().settings.rate}" />
        </div>
        <button type="button" class="btn btn-ghost btn-small" id="stop-speak">Stop speaking</button>
        ${voiceSupport.input ? '' : '<p class="small muted">Voice input is not supported in this browser. Typing and spoken replies still work.</p>'}
      </section>

      <div class="chat-log" id="log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>

      <form id="chat-form" class="chat-form">
        <label for="msg" class="sr-only">Your message</label>
        <input id="msg" autocomplete="off" placeholder="Type a question…" />
        <button type="button" class="btn btn-voice" id="mic" aria-pressed="false" ${voiceSupport.input ? '' : 'disabled'}>
          <span aria-hidden="true">🎙</span> <span class="mic-label">Speak</span>
        </button>
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
      <div class="suggestions" role="group" aria-label="Suggested questions">
        ${SUGGESTIONS.map((q) => `<button type="button" class="chip-btn" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
      </div>
      <button type="button" class="btn btn-ghost btn-small" id="clear">Clear conversation</button>
    `;

    const log = root.querySelector('#log');
    const input = root.querySelector('#msg');
    const mic = root.querySelector('#mic');

    const drawLog = () => {
      const msgs = st().chat.slice(-60);
      log.innerHTML = msgs.length
        ? msgs
            .map(
              (m) => `<div class="msg msg-${m.role} ${m.urgent ? 'msg-urgent' : ''}">${m.role === 'bot' ? dropletIcon({ size: 28 }) : ''}<span class="sr-only">${m.role === 'user' ? 'You said' : 'DermaLogic said'}:</span><p>${esc(m.text).replace(/\n/g, '<br />')}</p></div>`
            )
            .join('')
        : '<p class="muted">Say or type "help" to hear what I can do.</p>';
      log.scrollTop = log.scrollHeight;
    };

    const ask = (text, viaVoice = false) => {
      if (!text.trim()) return;
      const s = st();
      const reply = respond(text, { profile: s.profile, analysis: s.analyses.at(-1)?.result, reminders: s.reminders });
      store.update((x) => {
        x.chat.push({ role: 'user', text, at: new Date().toISOString() });
        x.chat.push({ role: 'bot', text: reply.text, at: new Date().toISOString(), urgent: !!reply.urgent });
      });
      drawLog();
      if (reply.urgent) announce(reply.text, true);
      const shouldSpeak = viaVoice || st().settings.speak;
      const after = () => {
        if (reply.action?.navigate) navigate(reply.action.navigate);
        else if (handsFree && viaVoice) startListening();
      };
      if (shouldSpeak) speak(reply.text, { rate: st().settings.rate, onEnd: after });
      else after();
    };

    const setMic = (on) => {
      mic.setAttribute('aria-pressed', String(on));
      mic.classList.toggle('listening', on);
      mic.querySelector('.mic-label').textContent = on ? 'Listening… tap to stop' : 'Speak';
    };

    function startListening() {
      stopSpeaking();
      setMic(true);
      announce('Listening');
      listen({
        onInterim: (t) => (input.value = t),
        onResult: (t) => {
          input.value = '';
          ask(t, true);
        },
        onError: (m) => toast(m, 'error'),
        onEnd: () => setMic(false),
      });
    }

    mic.addEventListener('click', () => (isListening() ? stopListening() : startListening()));
    root.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = input.value;
      input.value = '';
      ask(t);
      input.focus();
    });
    root.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.q)));
    root.querySelector('#speak').addEventListener('change', (e) => store.update((s) => (s.settings.speak = e.target.checked)));
    root.querySelector('#handsfree').addEventListener('change', (e) => {
      handsFree = e.target.checked;
      if (handsFree) {
        store.update((s) => (s.settings.speak = true));
        root.querySelector('#speak').checked = true;
        startListening();
      }
    });
    root.querySelector('#rate').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      root.querySelector('#rate-out').textContent = v;
      store.update((s) => (s.settings.rate = v));
    });
    root.querySelector('#stop-speak').addEventListener('click', stopSpeaking);
    root.querySelector('#clear').addEventListener('click', () => {
      store.update((s) => (s.chat = []));
      drawLog();
      announce('Conversation cleared.');
    });

    drawLog();
    return () => {
      stopListening();
      stopSpeaking();
    };
  },
};
