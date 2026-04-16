import { EventEmitter } from "events";
import { HealthSnapshot } from "./health.type";

const HEALTH_CHECK_INTERVAL_MS = 5000;

const healthEvents = new EventEmitter();
healthEvents.setMaxListeners(0);

let healthTimer: NodeJS.Timeout | null = null;

function buildHealthSnapshot(): HealthSnapshot {
  return {
    state: "up",
    code: 200,
    at: new Date().toLocaleTimeString(),
  };
}

export function getCurrentHealthSnapshot(): HealthSnapshot {
  return buildHealthSnapshot();
}

export function startHealthPublisher(): void {
  if (healthTimer) {
    return;
  }

  const publish = () => {
    healthEvents.emit("health", buildHealthSnapshot());
  };

  publish(); // send the first snapshot immediately
  healthTimer = setInterval(publish, HEALTH_CHECK_INTERVAL_MS);
}

export function subscribeToHealth(
  listener: (snapshot: HealthSnapshot) => void,
): () => void {
  healthEvents.on("health", listener);

  // unsubscriber for each user should be returned
  return () => {
    healthEvents.off("health", listener);
  };
}