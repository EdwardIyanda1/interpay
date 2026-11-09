import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { clamp } from "@shared";
import { c, font } from "./theme";

export function Button({ title, onPress, kind = "solid", disabled }: { title: string; onPress: () => void; kind?: "solid" | "ghost" | "danger"; disabled?: boolean }) {
  const solid = kind === "solid";
  const color = kind === "danger" ? c.danger : c.blue;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={{ backgroundColor: solid ? c.blue : c.white, borderColor: color, borderWidth: 1, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 18, opacity: disabled ? 0.45 : 1, alignItems: "center" }}>
      <Text style={{ color: solid ? c.white : color, fontFamily: font.semi, fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: font.semi, color: c.ink, marginBottom: 4, fontSize: 13 }}>{label}</Text>
      <TextInput placeholderTextColor={c.muted} {...p} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 6, padding: 10, fontFamily: font.regular, color: c.ink, fontSize: 15 }} />
    </View>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => { const n = parseInt(raw.replace(/\D/g, ""), 10); onChange(clamp(Number.isNaN(n) ? min : n, min, max)); setText(null); };
  const btn = (t: string, d: number, off: boolean) => (
    <Pressable accessibilityLabel={`${d > 0 ? "Increase" : "Decrease"} ${label}`} disabled={off} onPress={() => onChange(value + d)}
      style={{ width: 40, height: 40, borderWidth: 1, borderColor: c.blue, borderRadius: 6, alignItems: "center", justifyContent: "center", opacity: off ? 0.4 : 1 }}>
      <Text style={{ color: c.blue, fontSize: 20, fontFamily: font.semi }}>{t}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {btn("-", -1, value <= min)}
      <TextInput keyboardType="number-pad" value={text ?? String(value)} onChangeText={(t) => setText(t.replace(/\D/g, ""))} onEndEditing={(e) => commit(e.nativeEvent.text)}
        accessibilityLabel={`${label} quantity`} style={{ width: 52, height: 40, textAlign: "center", borderWidth: 1, borderColor: c.border, borderRadius: 6, fontFamily: font.semi, color: c.ink }} />
      {btn("+", 1, value >= max)}
    </View>
  );
}

export const Notice = ({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: React.ReactNode }) => (
  <View style={{ borderWidth: 1, borderColor: kind === "error" ? c.danger : kind === "ok" ? c.ok : c.border, backgroundColor: kind === "info" ? c.blueSoft : c.white, borderRadius: 6, padding: 10, marginVertical: 8 }}>
    <Text style={{ fontFamily: font.regular, color: kind === "error" ? c.danger : kind === "ok" ? c.ok : c.ink, fontSize: 13 }}>{children}</Text>
  </View>
);

export const H = ({ children, size = 22 }: { children: React.ReactNode; size?: number }) => <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: size, color: c.ink, marginBottom: 8 }}>{children}</Text>;
export const P = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => <Text style={{ fontFamily: font.regular, fontSize: 14, color: muted ? c.muted : c.ink, marginBottom: 6, lineHeight: 21 }}>{children}</Text>;
