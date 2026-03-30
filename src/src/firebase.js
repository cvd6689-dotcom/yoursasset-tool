import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "여기에복붙",
  authDomain: "여기에복붙",
  projectId: "여기에복붙",
  storageBucket: "여기에복붙",
  messagingSenderId: "여기에복붙",
  appId: "여기에복붙",
  measurementId: "여기에복붙"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
