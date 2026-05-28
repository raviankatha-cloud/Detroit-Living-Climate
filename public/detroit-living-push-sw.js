self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Detroit Living Climate alert";
  const options = {
    body: payload.body || payload.message || "A building needs attention.",
    data: {
      url: payload.url || "/alerts"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/alerts";

  event.waitUntil(clients.openWindow(url));
});
