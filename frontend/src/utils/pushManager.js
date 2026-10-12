import { pushApi } from '../api/client';

// Converts a base64url VAPID key into the Uint8Array format the browser's
// PushManager API requires.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const pushManager = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  async registerServiceWorker() {
    if (!this.isSupported()) return null;
    return navigator.serviceWorker.register('/sw.js');
  },

  getPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  },

  // Requests OS notification permission and registers a push subscription
  // with the backend, so the backend's minute-by-minute scheduler can wake
  // this browser even when no SymptomLog tab is open.
  async enableBackgroundAlarms() {
    if (!this.isSupported()) {
      return { ok: false, reason: 'unsupported' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'permission_denied' };
    }

    const registration = await this.registerServiceWorker();
    const keyRes = await pushApi.getPublicKey();
    if (!keyRes.data.enabled || !keyRes.data.publicKey) {
      return { ok: false, reason: 'server_push_disabled' };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey)
      });
    }

    const subJson = subscription.toJSON();
    await pushApi.subscribe({ endpoint: subJson.endpoint, keys: subJson.keys });
    return { ok: true };
  },

  async disableBackgroundAlarms() {
    if (!this.isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await pushApi.unsubscribe(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    }
  }
};
