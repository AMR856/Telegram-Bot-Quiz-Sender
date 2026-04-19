export interface HealthSnapshot {
  state: "up" | "down";
  code: number;
  at: string;
}
