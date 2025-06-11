// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 1. Firebase init
//const firebaseConfig = { /* your config here */ };
const firebaseConfig = {
  apiKey: "AIzaSyB6gpymEoxrObBzgIKH0dUmzXyJDgXEnh0",
  authDomain: "mirror-me-screen.firebaseapp.com",
  projectId: "mirror-me-screen",
  storageBucket: "mirror-me-screen.appspot.app",
  messagingSenderId: "492861281995",
  appId: "1:492861281995:web:a3dd317158d1862ae4ed4e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. WebRTC config
const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let pc = new RTCPeerConnection(servers);
let remoteVideo = document.getElementById("remoteVideo");

// 3. Get screen stream
async function startCapture() {
  return await navigator.mediaDevices.getDisplayMedia({ video: true });
}

// 4. Create session
document.getElementById("create").onclick = async () => {
  const sessionId = Math.random().toString(36).substring(2, 8);


  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await setDoc(doc(db, "sessions", sessionId), { offer });

  const joinUrl = `${location.origin}${location.pathname}?session=${sessionId}`;
  alert("Session ID: " + sessionId + "\n" + joinUrl);

  const qr = new QRious({
    element: document.getElementById("qr"),
                        value: joinUrl,
                        size: 250
  });

  onSnapshot(doc(db, "sessions", sessionId), async (docSnap) => {
    const data = docSnap.data();
    if (data?.answer && !pc.currentRemoteDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });
};


// Auto-fill session from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionFromUrl = urlParams.get('session');
if (sessionFromUrl) {
  document.getElementById("sessionId").value = sessionFromUrl;
  document.getElementById("join").click();
}


// 5. Join session
document.getElementById("join").onclick = async () => {
  const sessionId = document.getElementById("sessionId").value;
  const docRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    alert("Session not found");
    return;
  }
  const session = snap.data();

  const offerStream = await startCapture();
  offerStream.getTracks().forEach(track => pc.addTrack(track, offerStream));

  await pc.setRemoteDescription(new RTCSessionDescription(session.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await setDoc(docRef, { ...session, answer });

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };
};

