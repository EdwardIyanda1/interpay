import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { EventCard, formatDateTime, naira } from "@shared";
import { api } from "../src/api";
import { c, font } from "../src/theme";
import { Button, H, Notice, P } from "../src/ui";

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => { setBusy(true); api<EventCard[]>("/api/events").then(setEvents).catch((e) => setErr(e.message)).finally(() => setBusy(false)); };
  useEffect(load, []);
  return (
    <FlatList
      data={events} keyExtractor={(e) => String(e.id)} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <H size={24}>Buy tickets. Your money is held until the event happens.</H>
          <P muted>Pay through the Interswitch checkout. Cancel for a refund up to 12 hours before the start when the organiser allows it.</P>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Button title="My tickets" kind="ghost" onPress={() => router.push("/tickets")} />
            <Button title="Door check-in" kind="ghost" onPress={() => router.push("/scan")} />
          </View>
          {err ? <Notice kind="error">{err}</Notice> : null}
        </View>
      }
      ListEmptyComponent={err ? null : <P muted>No events are listed yet.</P>}
      renderItem={({ item: e }) => (
        <Link href={`/event/${e.slug}/${e.year}`} asChild>
          <Pressable style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 14 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: c.ink }}>{e.title}</Text>
            <Text style={{ fontFamily: font.regular, color: c.muted, marginTop: 4 }}>{formatDateTime(e.start_at, e.timezone)}</Text>
            <Text style={{ fontFamily: font.regular, color: c.muted }}>{e.venue_name ?? "Online"}</Text>
            {e.from_price_kobo !== null && <Text style={{ fontFamily: font.semi, color: c.blue, marginTop: 6 }}>{e.from_price_kobo === 0 ? "Free" : `From ${naira(e.from_price_kobo)}`}</Text>}
          </Pressable>
        </Link>
      )}
    />
  );
}
