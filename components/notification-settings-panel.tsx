"use client";

import { FormEvent, useState } from "react";
import type { NotificationPreference } from "@/lib/data/notification-preferences";

export function NotificationSettingsPanel({
  preference,
  vapidPublicKey
}: {
  preference: NotificationPreference;
  vapidPublicKey?: string;
}) {
  const [message, setMessage] = useState("");

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          emailEnabled: form.get("emailEnabled") === "on",
          webPushEnabled: form.get("webPushEnabled") === "on",
          warningEnabled: form.get("warningEnabled") === "on",
          criticalEnabled: form.get("criticalEnabled") === "on",
          escalationEnabled: form.get("escalationEnabled") === "on",
          recoveryEnabled: form.get("recoveryEnabled") === "on"
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save notification preferences.");
      }

      setMessage(payload.message ?? "Notification preferences saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notification preferences.");
    }
  }

  async function enableWebPush() {
    try {
      if (!vapidPublicKey) {
        setMessage("Set NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY before enabling browser push.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setMessage("This browser does not support web push notifications.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/detroit-living-push-sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      const response = await fetch("/api/notifications/web-push-subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save browser push subscription.");
      }

      setMessage(payload.message ?? "Browser push enabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable browser push.");
    }
  }

  return (
    <div className="notification-panel">
      <form className="form-grid" onSubmit={savePreferences}>
        <label className="checkbox-label">
          <input name="emailEnabled" type="checkbox" defaultChecked={preference.emailEnabled} />
          Email notifications
        </label>
        <label className="checkbox-label">
          <input name="webPushEnabled" type="checkbox" defaultChecked={preference.webPushEnabled} />
          Web push notifications
        </label>
        <label className="checkbox-label">
          <input name="warningEnabled" type="checkbox" defaultChecked={preference.warningEnabled} />
          Warning alerts
        </label>
        <label className="checkbox-label">
          <input name="criticalEnabled" type="checkbox" defaultChecked={preference.criticalEnabled} />
          Critical alerts
        </label>
        <label className="checkbox-label">
          <input name="escalationEnabled" type="checkbox" defaultChecked={preference.escalationEnabled} />
          Escalations
        </label>
        <label className="checkbox-label">
          <input name="recoveryEnabled" type="checkbox" defaultChecked={preference.recoveryEnabled} />
          Recovery notices
        </label>
        <div className="form-actions span-2">
          <button className="button" type="button" onClick={enableWebPush}>
            Enable browser push
          </button>
          <button className="button primary" type="submit">
            Save notifications
          </button>
        </div>
      </form>
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
