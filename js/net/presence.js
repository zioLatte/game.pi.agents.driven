import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { rtdb } from "./firebase.js";

let statusRef = null;
let presenceNickname = "";
let lastWrite = 0;
let pending = null;
let pendingTimer = null;

function buildPresencePayload({ level, score } = {}) {
  return {
    state: "online",
    lastChanged: serverTimestamp(),
    nickname: presenceNickname,
    level: Number.isFinite(level) ? level : 0,
    score: Number.isFinite(score) ? score : 0
  };
}

function flushPresence(payload) {
  if (!statusRef || !payload) return;
  set(statusRef, payload).catch((err) => console.error("[presence]", err));
}

export function initPresence({ uid, nickname }) {
  statusRef = ref(rtdb, `status/${uid}`);
  const connectedRef = ref(rtdb, ".info/connected");
  presenceNickname = nickname || "";

  onValue(connectedRef, (snap) => {
    if (snap.val() !== true) return;

    onDisconnect(statusRef).set({
      state: "offline",
      lastChanged: serverTimestamp(),
      nickname: presenceNickname
    });

    flushPresence(buildPresencePayload());
  });

  return () =>
    set(statusRef, {
      state: "offline",
      lastChanged: serverTimestamp(),
      nickname: presenceNickname
    });
}

export function updatePresenceGameState({ level, score } = {}, nowMs = null) {
  if (!statusRef) return;
  const now = nowMs ?? Date.now();
  pending = buildPresencePayload({ level, score });
  const elapsed = now - lastWrite;
  if (elapsed >= 500) {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    lastWrite = now;
    const payload = pending;
    pending = null;
    flushPresence(payload);
    return;
  }

  if (pendingTimer) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (!pending) return;
    lastWrite = Date.now();
    const payload = pending;
    pending = null;
    flushPresence(payload);
  }, Math.max(0, 500 - elapsed));
}
