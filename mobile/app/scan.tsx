import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../src/api";
import { getAuth, setAuth } from "../src/storage";
import { c, font } from "../src/theme";
import { Button, Field, H, Notice, P } from "../src/ui";

const RESULT: Record<string, { text: string; kind: "ok" | "error" | "info" }> = {
  VALID: { text: "Valid ticket. Admit.", kind: "ok" },
  ALREADY_USED: { text: "Already used. Do not admit.", kind: "error" },
  CANCELLED: { text: "Cancelled ticket. Do not admit.", kind: "error" },
  WRONG_MODE: { text: "This is an online ticket.", kind: "error" },
  INVALID: { text: "Invalid ticket.", kind: "error" },
};

export default function Scan() {
  const [authed, setAuthed] = useState(false);
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);
  const [perm, ask] = useCameraPermissions();
  const lock = useRef(false);

  useEffect(() => { getAuth().then((t) => setAuthed(!!t)); }, []);
  const login = async () => {
    try { const r = await api<{ token: string }>("/api/auth/login", { body: f }); await setAuth(r.token); setAuthed(true); setErr(""); }
    catch (e: any) { setErr(e.message); }
  };
  const onScan = async ({ data }: { data: string }) => {
    if (lock.current) return;
    lock.current = true;
    try { setResult(await api("/api/organiser/checkins", { body: { qr_token: data }, auth: true })); }
    catch (e: any) { setResult({ result: "INVALID", error: e.message }); }
    setTimeout(() => { lock.current = false; }, 2000);
  };

  if (!authed) return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <H>Organiser sign in</H>
      <P muted>Sign in with the organiser account that owns the event you are checking in.</P>
      <Field label="Email address" value={f.email} onChangeText={(t) => setF({ ...f, email: t })} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={f.password} onChangeText={(t) => setF({ ...f, password: t })} secureTextEntry />
      {err ? <Notice kind="error">{err}</Notice> : null}
      <Button title="Sign in" onPress={login} />
    </ScrollView>
  );
  if (!perm?.granted) return (
    <View style={{ padding: 16 }}><P>Camera access is needed to scan ticket QR codes.</P><Button title="Allow camera" onPress={ask} /></View>
  );
  const r = result && (RESULT[result.result] ?? RESULT.INVALID);
  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
      <View style={{ padding: 16 }}>
        {r ? <Notice kind={r.kind}>{r.text}{result.ticket ? `  ${result.ticket.name} | ${result.ticket.category}` : ""}</Notice> : <P muted>Point the camera at a ticket QR code.</P>}
        <Button title="Sign out" kind="ghost" onPress={async () => { await setAuth(null); setAuthed(false); }} />
      </View>
    </View>
  );
}
