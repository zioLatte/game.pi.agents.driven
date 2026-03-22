import {
  ref,
  query as rQuery,
  orderByChild,
  equalTo,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { rtdb } from "../net/firebase.js";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

export function startPlayersPanel() {
  const listEl = document.getElementById("players-list");
  if (!listEl) return () => {};

  const localNickname = (localStorage.getItem("pi_nickname") || "").trim();
  const onlineQ = rQuery(ref(rtdb, "status"), orderByChild("state"), equalTo("online"));

  let t = null;
  const seen = new Map();

  const unsub = onValue(onlineQ, (snap) => {
    const val = snap.val() || {};
    const uids = Object.keys(val);
    const onlineSet = new Set(uids);

    clearTimeout(t);
    t = setTimeout(async () => {
      for (const uid of uids) {
        const p = val[uid] || {};
        seen.set(uid, {
          uid,
          nickname: p.nickname || "unknown",
          score: Number(p.score) || 0,
          level: Number(p.level) || 0,
          state: "online"
        });
      }

      for (const [uid, entry] of seen.entries()) {
        if (!onlineSet.has(uid)) {
          seen.set(uid, { ...entry, state: "offline" });
        }
      }

      const rows = Array.from(seen.values()).sort((a, b) => {
        if (a.state !== b.state) return a.state === "online" ? -1 : 1;
        return b.score - a.score;
      });

      listEl.innerHTML = rows.map(r => {
        const rowClass = r.state === "offline" ? "players-panel__row--offline" : "";
        const score = String(r.score).padStart(3, "0");
        const level = String(r.level).padStart(3, "0");
        const isLocal = localNickname && r.nickname === localNickname;
        const nickClass = isLocal ? "players-panel__nickname players-panel__nickname--local" : "players-panel__nickname";
        return `
          <div class="players-panel__row ${rowClass}">
            [O:${score},L:${level}] <span class="${nickClass}">${esc(r.nickname)}</span>
          </div>
        `;
      }).join("");
    }, 150);
  });

  return () => {
    clearTimeout(t);
    unsub();
  };
}
