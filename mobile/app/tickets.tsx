import { useCallback, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { SavedOrder, savedOrders } from "../src/storage";
import { c, font } from "../src/theme";
import { P } from "../src/ui";

export default function Tickets() {
  const [list, setList] = useState<SavedOrder[]>([]);
  useFocusEffect(useCallback(() => { savedOrders().then(setList); }, []));
  return (
    <FlatList data={list} keyExtractor={(o) => o.token} contentContainerStyle={{ padding: 16, gap: 10 }}
      ListEmptyComponent={<P muted>Orders you make on this phone appear here.</P>}
      renderItem={({ item }) => (
        <Link href={`/ticket/${item.token}`} asChild>
          <Pressable style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 14 }}>
            <Text style={{ fontFamily: font.bold, color: c.ink }}>{item.title}</Text>
            <Text style={{ fontFamily: font.regular, color: c.muted }}>Order {item.reference}</Text>
          </Pressable>
        </Link>
      )} />
  );
}
