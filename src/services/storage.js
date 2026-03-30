import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const LOCAL_KEY = "yoursasset_portal_cases";

export function getLocalCases() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCase(item) {
  const current = getLocalCases();

  const nextItem = {
    ...item,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    source: "local",
  };

  const next = [nextItem, ...current];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  return next;
}

export function deleteLocalCase(id) {
  const current = getLocalCases();
  const next = current.filter((item) => item.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  return next;
}

export async function saveFirebaseCase(item) {
  const payload = {
    ...item,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "portalCases"), payload);
  return ref.id;
}

export async function getFirebaseCases() {
  const q = query(collection(db, "portalCases"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    source: "firebase",
  }));
}

export async function deleteFirebaseCase(id) {
  await deleteDoc(doc(db, "portalCases", id));
}
