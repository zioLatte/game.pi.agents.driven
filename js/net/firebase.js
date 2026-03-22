import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

export const firebaseConfig = {

    apiKey: "AIzaSyCVqNSVVHHPCqN2w_iWzUoRYpoXJdZwMeI",
    authDomain: "pichan-d7eb2.firebaseapp.com",
    projectId: "pichan-d7eb2",
    storageBucket: "pichan-d7eb2.firebasestorage.app",
    messagingSenderId: "349902045534",
    appId: "1:349902045534:web:34be9040c5cc4220904fcf",
    measurementId: "G-TNYX1RXGJ8",
    databaseURL: "https://pichan-d7eb2-default-rtdb.europe-west1.firebasedatabase.app"
};


const BASE_DOMAIN = "alessioravani";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";
export const isAllowedDomain = hostname.includes(BASE_DOMAIN);
export const firestoreEnabled = isAllowedDomain;


let app = null;
export let auth = null;
export let db = null;
export let rtdb = null;

if (firestoreEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
}
