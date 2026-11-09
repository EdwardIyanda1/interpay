import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { EventPublic, formatDateTime, naira } from "@shared";
import { api } from "../../../src/api";
import { saveOrder } from "../../../src/storage";
import { c, font } from "../../../src/theme";
import { Button, Field, H, Notice, P, Stepper } from "../../../src/ui";

export default function EventScreen() {
  const { slug, year } = useLocalSearchParams<{ slug: string; year: string }>();
  const router = useRouter();
  const [ev, setEv] = useState<EventPublic | null>(null);
  const [err, setErr] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [mode, setMode] = useState<"PHYSICAL" | "ONLINE" | "">("");
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<EventPublic>(`/api/events/${slug}/${year}`).then((d) => {
      setEv(d);
      setMode(d.attendance_mode === "BOTH" ? "" : (d.attendance_mode as any));
      const cats = d.categories.filter((x) => !x.is_hidden);
      if (cats.length === 1 && cats[0].state === "AVAILABLE") setQty({ [cats[0].id]: 1 });
    }).catch((e) => setErr(e.message));
  }, [slug, year]);

  if (err) return <View style={{ padding: 16 }}><Notice kind="error">{err}</Notice></View>;
  if (!ev) return <View style={{ padding: 16 }}><P muted>Loading event</P></View>;

  const cats = ev.categories.filter((x) => !x.is_hidden);
  const allowed = (k: (typeof cats)[number]) => !mode || k.allowed_modes.includes(mode);
  const lines = cats.filter((k) => allowed(k) && (qty[k.id] ?? 0) > 0);
  const total = lines.reduce((a, k) => a + qty[k.id], 0);
  const amount = lines.reduce((a, k) => a + qty[k.id] * k.price_kobo, 0);
  const deadline = new Date(new Date(ev.start_at).getTime() - ev.cancel_window_hours * 3600e3).toISOString();
  const flyers = ev.media.filter((m) => m.content_type.startsWith("image/"));

  const submit = async () => {
    setErr("");
    if (!mode) return setErr("Choose whether you will attend in person or online");
    if (total < 1) return setErr("Select at least one ticket");
    setBusy(true);
    try {
      const r = await api<any>("/api/orders", { body: { event_id: ev.id, items: lines.map((k) => ({ ticket_type_id: k.id, quantity: qty[k.id] })), ...f, attendance_mode: mode, accepted_policy: ok, client: "mobile" } });
      await saveOrder({ token: r.order_token, title: ev.title, reference: r.reference });
      if (r.checkout_url) await WebBrowser.openAuthSessionAsync(r.checkout_url, "interpay://ticket");
      router.replace(`/ticket/${r.order_token}?status=pending`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: ev.title }} />
      {ev.status === "CANCELLED" && <Notice kind="error">This event was cancelled. All tickets are refunded in full.</Notice>}
      <H size={24}>{ev.title}</H>
      <P muted>{formatDateTime(ev.start_at, ev.timezone)}</P>
      {flyers.map((m) => <Image key={m.id} source={{ uri: m.url }} accessibilityLabel={`Flyer for ${ev.title}`} style={{ width: "100%", aspectRatio: 1, borderRadius: 8, marginBottom: 10 }} resizeMode="contain" />)}
      <P>{ev.description}</P>
      {ev.attendance_mode !== "ONLINE" && <P>{ev.venue_name}, {ev.venue_address}{ev.map_url ? "" : ""}</P>}
      {ev.map_url ? <Button title="Open map" kind="ghost" onPress={() => Linking.openURL(ev.map_url!)} /> : null}
      <H size={16}>Contact</H>
      <P>{[ev.contact.name, ev.contact.email, ev.contact.phone].filter(Boolean).join(" | ") || "No contact details provided"}</P>

      {!ev.sales_open ? <Notice>Ticket sales are closed for this event.</Notice> : (
        <View style={{ marginTop: 12 }}>
          <H size={18}>Get tickets</H>
          {ev.attendance_mode === "BOTH" && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}><Button title="In person" kind={mode === "PHYSICAL" ? "solid" : "ghost"} onPress={() => setMode("PHYSICAL")} /></View>
              <View style={{ flex: 1 }}><Button title="Online" kind={mode === "ONLINE" ? "solid" : "ghost"} onPress={() => setMode("ONLINE")} /></View>
            </View>
          )}
          {cats.map((k) => {
            const can = k.state === "AVAILABLE" && allowed(k);
            return (
              <View key={k.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontFamily: font.semi, color: c.ink }}>{k.name} {k.price_kobo === 0 ? "Free" : naira(k.price_kobo)}</Text>
                  <Text style={{ fontFamily: font.regular, color: c.muted, fontSize: 12 }}>{!allowed(k) ? "Not available for this attendance type" : k.state !== "AVAILABLE" ? k.state.replace("_", " ").toLowerCase() : `${k.available} left`}</Text>
                </View>
                {can ? <Stepper label={k.name} value={qty[k.id] ?? 0} min={0} max={Math.min(k.max_per_order, k.available)} onChange={(n) => setQty({ ...qty, [k.id]: n })} /> : null}
              </View>
            );
          })}
          <View style={{ height: 12 }} />
          <Field label="First name" value={f.first_name} onChangeText={(t) => setF({ ...f, first_name: t })} autoComplete="given-name" />
          <Field label="Last name" value={f.last_name} onChangeText={(t) => setF({ ...f, last_name: t })} autoComplete="family-name" />
          <Field label="Email address" value={f.email} onChangeText={(t) => setF({ ...f, email: t })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Phone number" value={f.phone} onChangeText={(t) => setF({ ...f, phone: t })} keyboardType="phone-pad" autoComplete="tel" />
          <Notice>{ev.cancellation_allowed ? `Cancellation is allowed. You can cancel for a refund until ${formatDateTime(deadline, ev.timezone)}.` : "This event does not allow cancellations. Tickets are not refundable unless the organiser cancels or changes the event."}</Notice>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Switch value={ok} onValueChange={setOk} trackColor={{ true: c.blue }} />
            <Text style={{ flex: 1, fontFamily: font.regular, color: c.ink, fontSize: 13 }}>I have read the cancellation policy and the Terms and Conditions.</Text>
          </View>
          <Text style={{ fontFamily: font.bold, fontSize: 16, color: c.ink, marginBottom: 8 }}>Total ({total}): {amount === 0 ? "Free" : naira(amount)}</Text>
          {err ? <Notice kind="error">{err}</Notice> : null}
          <Button title={busy ? "Please wait" : amount === 0 ? "Get free tickets" : "Continue to payment"} onPress={submit} disabled={busy || total < 1 || !ok} />
        </View>
      )}
    </ScrollView>
  );
}
