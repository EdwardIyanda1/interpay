import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { OrderView, RealtimeClient, formatDateTime, naira } from "@shared";
import { api, wsTicket } from "../../src/api";
import { WS_URL } from "../../src/config";
import { c, font } from "../../src/theme";
import { Button, H, Notice, P } from "../../src/ui";

export default function TicketScreen() {
  const { token, status } = useLocalSearchParams<{ token: string; status?: string }>();
  const [o, setO] = useState<OrderView | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api<OrderView>(`/api/orders/${token}`).then(setO).catch((e) => setErr(e.message)), [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (status === "pending") api<OrderView>(`/api/orders/${token}/verify`, { method: "POST" }).then(setO).catch(() => {}); }, [token, status]);
  useEffect(() => {
    const rt = new RealtimeClient({ url: WS_URL, getTicket: () => wsTicket({ order_token: token }), onEvent: () => load(), onRefetch: load });
    rt.start();
    return () => rt.stop();
  }, [token, load]);

  const cancel = (id: number) => Alert.alert("Cancel this ticket?", "The ticket price will be refunded to your original payment method.", [
    { text: "Keep ticket" },
    { text: "Cancel ticket", style: "destructive", onPress: async () => { try { setO(await api(`/api/tickets/${id}/cancel`, { method: "POST", headers: { "X-Order-Token": token! } })); setMsg("Ticket cancelled. Your refund is being processed."); } catch (e: any) { setMsg(e.message); } } },
  ]);

  if (err) return <View style={{ padding: 16 }}><Notice kind="error">{err}</Notice></View>;
  if (!o) return <View style={{ padding: 16 }}><P muted>Loading your tickets</P></View>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <H>{o.event.title}</H>
      <P muted>{formatDateTime(o.event.start_at, o.event.timezone)}</P>
      {o.status === "PENDING" && <Notice>Waiting for payment confirmation. This screen updates by itself.</Notice>}
      {o.status === "EXPIRED" && <Notice kind="error">This checkout expired and the tickets were released.</Notice>}
      {o.status === "PAID" && <Notice kind="ok">Payment confirmed. A confirmation email was sent to {o.email}.</Notice>}
      {msg ? <Notice>{msg}</Notice> : null}
      <P muted>Order {o.reference} | {o.amount_kobo === 0 ? "Free" : naira(o.amount_kobo)}</P>
      {o.tickets.map((t, i) => (
        <View key={t.id} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 14, marginTop: 12, alignItems: "center" }}>
          <Text style={{ fontFamily: font.bold, color: c.ink }}>{t.category}{t.guest_name ? ` for ${t.guest_name}` : ""}</Text>
          <Text style={{ fontFamily: font.regular, color: c.muted, marginBottom: 8 }}>{t.status === "CANCELLED" ? "Cancelled" : t.checked_in ? "Checked in" : "Valid"}</Text>
          {t.qr_url && t.status === "VALID" ? <Image source={{ uri: t.qr_url }} accessibilityLabel={`QR code for ticket ${i + 1}`} style={{ width: 200, height: 200 }} /> : null}
          {t.join_url && t.status === "VALID" ? <Button title="Join online" onPress={() => Linking.openURL(t.join_url!)} /> : null}
          {o.policy.can_cancel && t.status === "VALID" ? <View style={{ marginTop: 10 }}><Button title="Cancel this ticket" kind="danger" onPress={() => cancel(t.id)} /></View> : null}
        </View>
      ))}
      {o.status === "PAID" && <P muted>{o.policy.cancellation_allowed ? (o.policy.can_cancel ? `You can cancel for a refund until ${formatDateTime(o.policy.deadline, o.event.timezone)}.` : o.policy.reason) : "This event does not allow cancellations."}</P>}
    </ScrollView>
  );
}
