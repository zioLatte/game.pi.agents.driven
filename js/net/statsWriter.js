import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db, firestoreEnabled } from "./firebase.js";

export function createStatsWriter(uid) {
  if (!firestoreEnabled || !db) {
    return async function noop() {};
  }
  const ref = doc(db, "users", uid);

  let last = 0;
  let pending = null;

  async function flush(now) {
    if (!pending) return;
    const payload = pending;
    pending = null;
    await updateDoc(ref, payload);
  }

  return async function write(partialStats, nowMs) {
    const now = nowMs ?? Date.now();
    pending = {
      updatedAt: now,
      "stats.totalScore": partialStats.totalScore ?? 0,
      "stats.maxLevel": partialStats.maxLevel ?? 0,
      "stats.gamesPlayed": partialStats.gamesPlayed ?? 0,
      "stats.totalPlayMs": partialStats.totalPlayMs ?? 0
    };

    if (now - last < 2000) return;
    last = now;
    await flush(now);
  };
}
