import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedOrder = { token: string; title: string; reference: string };
const ORDERS = "interpay_orders";
const AUTH = "interpay_token";

export async function savedOrders(): Promise<SavedOrder[]> {
  try { return JSON.parse((await AsyncStorage.getItem(ORDERS)) ?? "[]"); } catch { return []; }
}
export async function saveOrder(o: SavedOrder) {
  const list = (await savedOrders()).filter((x) => x.token !== o.token);
  await AsyncStorage.setItem(ORDERS, JSON.stringify([o, ...list].slice(0, 50)));
}
export const getAuth = () => AsyncStorage.getItem(AUTH);
export const setAuth = (t: string | null) => (t ? AsyncStorage.setItem(AUTH, t) : AsyncStorage.removeItem(AUTH));
