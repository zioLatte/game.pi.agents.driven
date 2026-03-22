import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  documentId
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db, firestoreEnabled } from "./firebase.js";

export async function upsertUser(uid, nickname, seedStats = null) {
  if (!firestoreEnabled || !db) return;
  const base = {
    nickname,
    updatedAt: Date.now(),
    stats: {
      totalScore: 0,
      maxLevel: 0,
      gamesPlayed: 0,
      totalPlayMs: 0
    }
  };

  if (seedStats) base.stats = { ...base.stats, ...seedStats };

  await setDoc(doc(db, "users", uid), base, { merge: true });
}

export async function fetchUsersByIds(uids) {
  if (!firestoreEnabled || !db) return [];
  if (!uids.length) return [];
  const q = query(collection(db, "users"), where(documentId(), "in", uids));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}
