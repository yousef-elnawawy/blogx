import Echo from "laravel-echo";
import Pusher from "pusher-js";
import api from "./api";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: any;
  }
}

let echoInstance: any = null;

export function getEcho(): any {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY || "x9jcqqxfanl6yskucqq2";
  const wsHost = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost";
  const wsPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080);
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http";

  if (!echoInstance) {
    window.Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: "reverb",
      key: key,
      wsHost: wsHost,
      wsPort: wsPort,
      wssPort: wsPort,
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],
      authorizer: (channel: any) => {
        return {
          authorize: (socketId: string, callback: (error: any, data: any) => void) => {
            api
              .post("/api/broadcasting/auth", {
                socket_id: socketId,
                channel_name: channel.name,
              })
              .then((response) => {
                callback(null, response.data);
              })
              .catch((error) => {
                console.error("[Echo] Channel auth failed for", channel.name, error);
                callback(error, null);
              });
          },
        };
      },
    });
  }

  return echoInstance;
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      // Ignore disconnect error
    }
    echoInstance = null;
  }
}
