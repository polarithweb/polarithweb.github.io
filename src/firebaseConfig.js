import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test Connection on Startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase handshake successful. DB status: Online.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.warn("Please check your Firebase configuration. Client is offline.");
      } else {
        console.warn("Firebase connection test completed. Connection note: " + error.message);
      }
    }
  }
}
testConnection();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errMsg,
    authInfo: null,
    operationType,
    path
  };
  
  const isQuotaError = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit exceeded');
  const isPermissionError = errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied');

  if (isQuotaError) {
    console.warn('Firestore Quota Limit Exceeded: The app has reached its free tier database limits. Local caching/fallbacks are active.', errInfo);
    return; // Gracefully bypass without throwing to prevent page crashes
  }

  if (isPermissionError) {
    console.error('Firestore Security/Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Database Notice: ', JSON.stringify(errInfo));
  }
}

export { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, serverTimestamp };

