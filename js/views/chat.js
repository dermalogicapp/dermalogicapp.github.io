import { store } from '../store.js';
import { esc, announce, toast } from '../ui.js';
import { respond } from '../chatbot.js';
import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';
import { listen, stopListening, isListening, speak, stopSpeaking, isSpeaking, voiceSupport, unlockAudio, cue } from '../voice.js';

const SUGGESTIONS = ['Read my morning routine', 'What is niacinamide?', 'How do I fade dark spots?', 'My skin is itching', 'I used to bleach my skin', 'What is my skin tone?', 'Help'];

// Follow-up ideas shown after each reply so the conversation keeps going.
export function followUps(reply) {
  const t = String(reply?.text || '').toLowerCase();
  if (reply?.urgent) return [];
  if (t.includes('morning routine')) return ['Read my evening routine', 'What is niacinamide?', 'Open reminders'];
  if (t.includes('evening routine')) return ['Read my morning routine', 'Open progress', 'Open reminders'];
  if (/itch|burn|rash|swelling|sting/.test(t)) return ['Open complaints', 'How do I calm irritated skin?', 'When should I see a doctor?'];
  if (/bleach|barrier|soothing/.test(t)) return ['Read my morning routine', 'What should I avoid?', 'When should I see a doctor?'];
  if (/tone|undertone|scan/.test(t)) return ['Read my morning routine', 'Open face scan', 'How do I fade dark spots?'];
  if (/niacinamide|ingredient|acid|retinol|ceramide/.test(t)) return ['Is it safe in pregnancy?', 'Read my morning routine', 'Open ingredients'];
  return ['Read my morning routine', 'What is my skin tone?', 'Help'];
}

const STATES = {
  idle: ['Tap to talk', 'Ask about your routine, an ingredient or a skin problem.'],
  listening: ['Listening…', 'Speak now. I will answer when you stop.'],
  thinking: ['Thinking…', ''],
  speaking: ['Speaking…', 'Tap to interrupt and ask something else.'],
};

export default {
  title: 'Assistant',
  render(root, { navigate }) {
    const st = () => store.get();
    let handsFree = false;
    let state = 'idle';
    let misses = 0;
    let wakeLock = null;
    let alive = true;

    root.innerHTML = `
      <h1>Assistant</h1>
      <p class="lead">Talk to DermaLogic like a person. Tap the circle, ask a question, and listen to the answer. Answers come from DermaLogic's built-in skin-care guide on this device.</p>

      <section class="card voice-stage" aria-labelledby="vs-h" data-state="idle">
        <h2 id="vs-h" class="sr-only">Voice conversation</h2>
        <button type="button" class="orb" id="orb" ${voiceSupport.input ? '' : 'disabled'} aria-describedby="orb-state">
          <span class="orb-rings" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="orb-core" aria-hidden="true">${dropletIcon({ size: 64 })}</span>
          <span class="orb-bars" aria-hidden="true">${[...Array(7)].map(() => '<i></i>').join('')}</span>
          <span class="sr-only" id="orb-label">Talk to the assistant</span>
        </button>
        <p class="orb-title" id="orb-title" aria-hidden="true"></p>
        <p class="orb-state small muted" id="orb-state"></p>
        <div class="heard" id="heard" aria-live="off"></div>
        <div class="followups" id="followups" role="group" aria-label="Suggested next questions"></div>
        ${voiceSupport.input ? '' : '<p class="callout" role="note">Voice input is not available in this browser (iPhone and iPad need Safari, not other browsers). You can still type below, and use your keyboard\'s microphone key to dictate.</p>'}
        <div class="voice-opts">
          <label class="check"><input type="checkbox" id="handsfree" ${voiceSupport.input ? '' : 'disabled'} /> <span><strong>Keep the conversation going</strong> (I listen again after each answer)</span></label>
          <label class="check"><input type="checkbox" id="speak" ${st().settings.speak ? 'checked' : ''} /> <span>Read typed questions' answers aloud too</span></label>
          <div class="field inline">
            <label for="rate">Speaking speed <output id="rate-out">${st().settings.rate}</output>×</label>
            <input type="range" id="rate" min="0.6" max="1.8" step="0.1" value="${st().settings.rate}" />
          </div>
        </div>
      </section>

      <div class="chat-log" id="log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>

      <form id="chat-form" class="chat-form">
        <label for="msg" class="sr-only">Your message</label>
        <input id="msg" autocomplete="off" placeholder="Or type a question…" />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
      <div class="suggestions" role="group" aria-label="Suggested questions">
        ${SUGGESTIONS.map((q) => `<button type="button" class="chip-btn" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
      </div>
      <button type="button" class="btn btn-ghost btn-small" id="clear">Clear conversation</button>
    `;

    const log = root.querySelector('#log');
    const input = root.querySelector('#msg');
    const stage = root.querySelector('.voice-stage');
    const heard = root.querySelector('#heard');
    const fu = root.querySelector('#followups');
    const orb = root.querySelector('#orb');

    const setState = (s, extra = '') => {
      state = s;
      stage.dataset.state = s;
      root.querySelector('#orb-title').textContent = STATES[s][0];
      root.querySelector('#orb-state').textContent = extra || STATES[s][1];
      orb.setAttribute('aria-pressed', String(s === 'listening'));
      root.querySelector('#orb-label').textContent = s === 'listening' ? 'Listening. Tap to stop.' : s === 'speaking' ? 'Speaking. Tap to interrupt and talk.' : 'Talk to the assistant';
    };

    const showHeard = (you, bot) => {
      heard.innerHTML = `${you ? `<p class="heard-you"><small>You</small>${esc(you)}</p>` : ''}${bot ? `<p class="heard-bot"><small>DermaLogic</small>${esc(bot).replace(/\n/g, '<br />')}</p>` : ''}`;
    };

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

    const drawFollowUps = (reply) => {
      fu.innerHTML = followUps(reply).map((q) => `<button type="button" class="chip-btn" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    };

    async function holdScreenAwake(on) {
      try {
        if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
        else if (!on && wakeLock) {
          await wakeLock.release();
          wakeLock = null;
        }
      } catch {}
    }

    function ask(text, viaVoice = false) {
      if (!text.trim()) return;
      unlockAudio();
      setState('thinking');
      const s = st();
      const reply = respond(text, { profile: s.profile, analysis: s.analyses.at(-1)?.result, reminders: s.reminders });
      store.update((x) => {
        x.chat.push({ role: 'user', text, at: new Date().toISOString() });
        x.chat.push({ role: 'bot', text: reply.text, at: new Date().toISOString(), urgent: !!reply.urgent });
      });
      drawLog();
      showHeard(text, reply.text);
      drawFollowUps(reply);
      if (reply.urgent) announce(reply.text, true);
      const after = () => {
        if (!alive) return;
        setState('idle');
        if (reply.action?.navigate) navigate(reply.action.navigate);
        else if (handsFree && viaVoice) setTimeout(startListening, 350);
      };
      if (viaVoice || st().settings.speak) {
        setState('speaking');
        speak(reply.text, { rate: st().settings.rate, onEnd: after });
      } else after();
    }

    function startListening() {
      if (!alive) return;
      unlockAudio();
      stopSpeaking();
      cue('start');
      setState('listening');
      announce('Listening');
      heard.innerHTML = '';
      let gotText = false;
      listen({
        onInterim: (t) => {
          input.value = t;
          showHeard(t, '');
        },
        onResult: (t) => {
          gotText = true;
          misses = 0;
          input.value = '';
          cue('stop');
          ask(t, true);
        },
        onError: (m, code) => {
          if (code === 'no-speech') return; // handled in onEnd
          toast(m, 'error');
          handsFree = false;
          root.querySelector('#handsfree').checked = false;
          holdScreenAwake(false);
        },
        onEnd: () => {
          if (gotText || !alive) return;
          input.value = '';
          misses += 1;
          setState('idle', handsFree && misses < 2 ? 'I did not hear anything. Listening again…' : 'I did not hear anything. Tap the circle to try again.');
          if (handsFree && misses < 2) setTimeout(startListening, 600);
          else {
            handsFree = false;
            root.querySelector('#handsfree').checked = false;
            holdScreenAwake(false);
          }
        },
      });
    }

    orb.addEventListener('click', () => {
      unlockAudio();
      if (isListening()) {
        stopListening();
        return;
      }
      if (isSpeaking()) stopSpeaking();
      misses = 0;
      startListening();
    });

    root.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = input.value;
      input.value = '';
      ask(t);
      input.focus();
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (b) ask(b.dataset.q, true);
    });
    root.querySelector('#speak').addEventListener('change', (e) => store.update((s) => (s.settings.speak = e.target.checked)));
    root.querySelector('#handsfree').addEventListener('change', (e) => {
      handsFree = e.target.checked;
      holdScreenAwake(handsFree);
      if (handsFree) {
        misses = 0;
        startListening();
      }
    });
    root.querySelector('#rate').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      root.querySelector('#rate-out').textContent = v;
      store.update((s) => (s.settings.rate = v));
    });
    root.querySelector('#clear').addEventListener('click', () => {
      store.update((s) => (s.chat = []));
      drawLog();
      heard.innerHTML = '';
      fu.innerHTML = '';
      announce('Conversation cleared.');
    });

    setState('idle');
    drawLog();
    return () => {
      alive = false;
      stopListening();
      stopSpeaking();
      holdScreenAwake(false);
    };
  },
};
