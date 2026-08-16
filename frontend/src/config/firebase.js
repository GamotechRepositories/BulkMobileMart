import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAZUioMEpqUU6d-6tJovAJREseFYOfWEto",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bulkmobilemart-90da8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bulkmobilemart-90da8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bulkmobilemart-90da8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "404801924633",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:404801924633:web:ed1c31d3d01063bcb78488",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const getMessagingInstance = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM: Web Push Messaging is not supported in this browser.");
      return null;
    }
    return getMessaging(app);
  } catch (err) {
    console.error("FCM: Failed to initialize Firebase Messaging —", err);
    return null;
  }
};

export const requestAndGetFcmToken = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("FCM: Window/Notification API is not available.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("FCM: Notification permission denied by user.");
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    let serviceWorkerRegistration;
    if ("serviceWorker" in navigator) {
      serviceWorkerRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

    const token = await getToken(messaging, {
      serviceWorkerRegistration,
      vapidKey,
    });

    return token || null;
  } catch (err) {
    console.error("FCM: Error getting FCM Web Push Token —", err);
    return null;
  }
};

export const setupForegroundMessaging = async (onMessageReceived) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("FCM: Received foreground push message —", payload);
    if (onMessageReceived) {
      onMessageReceived(payload);
    }
  });
};

export default app;
