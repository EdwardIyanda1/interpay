export const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
export const WS_URL = API.replace(/^http/, "ws");
