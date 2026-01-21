import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";

import TextRecognition from "@react-native-ml-kit/text-recognition";
import { CameraView, useCameraPermissions } from "expo-camera";

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type VinField = { label: string; value: string };

const RECENTS_KEY = "vin_recents_v1";
const MAX_RECENTS = 10;

const _origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = String(args?.[0] ?? "");
  if (msg.includes("CoreGraphics") && msg.includes("NaN")) {
    console.log("⚠️ CoreGraphics NaN warning args:", args);
  }
  _origWarn(...args);
};

// VIN rules: 17 chars; letters I, O, Q not allowed.
function normalizeVin(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function validateVin(v: string): string | null {
  if (v.length === 0) return null; // no error while empty
  if (v.length !== 17) return "VIN must be exactly 17 characters.";
  if (/[IOQ]/.test(v)) return "VIN cannot contain I, O, or Q.";
  return null;
}

async function loadRecents(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function saveRecents(recents: string[]) {
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

export default function VinLookupScreen() {
  const [vinInput, setVinInput] = useState("");
  const vin = useMemo(() => normalizeVin(vinInput), [vinInput]);
  const vinError = useMemo(() => validateVin(vin), [vin]);

  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<VinField[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recents, setRecents] = useState<string[]>([]);

  const [scanMode, setScanMode] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  useEffect(() => {
    (async () => setRecents(await loadRecents()))();
  }, []);

  async function pushRecent(v: string) {
    const next = [v, ...recents.filter((x) => x !== v)].slice(0, MAX_RECENTS);
    setRecents(next);
    await saveRecents(next);
  }

  async function decodeVin(v: string) {
    setLoading(true);
    setFields(null);
    setErrorMsg(null);

    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${v}?format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const r = json?.Results?.[0];
      if (!r) throw new Error("No results returned.");

      const picked: VinField[] = [
        { label: "Make", value: r.Make },
        { label: "Model", value: r.Model },
        { label: "Year", value: r.ModelYear },
        { label: "Trim", value: r.Trim },
        { label: "Body Class", value: r.BodyClass },
        { label: "Vehicle Type", value: r.VehicleType },
        {
          label: "Engine",
          value: [
            r.EngineModel,
            r.DisplacementL && `${r.DisplacementL}L`,
            r.EngineCylinders && `${r.EngineCylinders} cyl`,
          ]
            .filter(Boolean)
            .join(" • "),
        },
        { label: "Fuel", value: r.FuelTypePrimary },
        {
          label: "Plant",
          value: [r.PlantCity, r.PlantState, r.PlantCountry]
            .filter(Boolean)
            .join(", "),
        },
      ].filter((f) => f.value && String(f.value).trim().length > 0);

      setFields(
        picked.length
          ? picked
          : [
              {
                label: "Result",
                value: "Decoded, but no common fields present.",
              },
            ],
      );

      await pushRecent(v);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onDecodePress() {
    if (vinError) return;
    if (vin.length !== 17) return;
    await decodeVin(vin);
  }

  if (scanMode) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 24,
              gap: 12,
            }}
          >
            <Pressable
              onPress={async () => {
                try {
                  // Take a photo
                  // @ts-ignore (CameraView typing varies slightly across SDKs)
                  const photo = await cameraRef.current?.takePictureAsync?.({
                    quality: 0.8,
                  });
                  const uri = photo?.uri;
                  if (!uri) throw new Error("No photo captured.");

                  // OCR
                  const result = await TextRecognition.recognize(uri); // returns recognized text blocks
                  const allText = Array.isArray(result)
                    ? result.map((b: any) => b.text ?? "").join("\n")
                    : String(result ?? "");

                  const found = extractVinFromText(allText);
                  if (!found)
                    throw new Error(
                      "Couldn’t find a VIN. Try closer focus / better lighting.",
                    );

                  // Fill input + exit scan mode
                  setVinInput(found);
                  setScanMode(false);

                  // Optional: auto-decode
                  // await decodeVin(found);
                } catch (e: any) {
                  setErrorMsg(e?.message ?? "Scan failed.");
                  setScanMode(false);
                }
              }}
              style={{
                backgroundColor: "#111",
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                Capture & OCR
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setScanMode(false)}
              style={{
                backgroundColor: "#666",
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  } else {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.h1}>VIN Lookup</Text>
          <Text style={styles.sub}>Decode a VIN using NHTSA vPIC.</Text>

          <View style={styles.row}>
            <TextInput
              value={vinInput}
              onChangeText={setVinInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="1HGCM82633A004352"
              style={styles.input}
              maxLength={32}
            />

            <Pressable
              onPress={async () => {
                if (!permission?.granted) {
                  const res = await requestPermission();
                  if (!res.granted) return;
                }
                setScanMode(true);
              }}
              style={({ pressed }) => [
                styles.scanBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.scanBtnText}>Scan VIN</Text>
            </Pressable>

            <Pressable
              onPress={onDecodePress}
              disabled={loading || !!vinError || vin.length !== 17}
              style={({ pressed }) => [
                styles.button,
                (loading || !!vinError || vin.length !== 17) &&
                  styles.buttonDisabled,
                pressed &&
                  !(loading || !!vinError || vin.length !== 17) &&
                  styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>{loading ? "…" : "Decode"}</Text>
            </Pressable>
          </View>

          {vinError && <Text style={styles.inlineError}>{vinError}</Text>}

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Decoding…</Text>
            </View>
          )}

          {errorMsg && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Lookup failed</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <Pressable onPress={onDecodePress} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!!recents.length && (
            <View style={styles.recents}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRow}
              >
                {recents.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setVinInput(r);
                      decodeVin(r);
                    }}
                    style={({ pressed }) => [
                      styles.recentChip,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.recentChipText}>{r}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.results}>
            {fields?.map((f) => (
              <View key={f.label} style={styles.card}>
                <Text style={styles.cardLabel}>{f.label}</Text>
                <Text style={styles.cardValue}>{String(f.value)}</Text>
              </View>
            ))}

            {!loading && !errorMsg && !fields && (
              <Text style={styles.empty}>
                Enter a 17-character VIN and tap Decode.
              </Text>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 10 },
  h1: { fontSize: 28, fontWeight: "700" },
  sub: { opacity: 0.7 },

  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "white", fontWeight: "700" },

  inlineError: { color: "#b00020", fontWeight: "600" },

  loading: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: { opacity: 0.7 },

  errorBox: {
    borderWidth: 1,
    borderColor: "#f0c2c2",
    backgroundColor: "#fff5f5",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  errorTitle: { fontWeight: "800" },
  errorText: { opacity: 0.8 },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  retryText: { color: "white", fontWeight: "700" },

  recents: { gap: 8, paddingTop: 6 },
  sectionTitle: { fontWeight: "800", opacity: 0.7 },
  recentRow: { gap: 10, paddingBottom: 6 },
  recentChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  recentChipText: { fontWeight: "700" },

  results: { paddingVertical: 8, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  cardLabel: { fontSize: 12, opacity: 0.6, fontWeight: "700" },
  cardValue: { fontSize: 18, fontWeight: "600" },

  empty: { paddingTop: 18, opacity: 0.6 },
  scanBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#444",
  },
  scanBtnText: { color: "white", fontWeight: "800" },
});

function extractVinFromText(text: string): string | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, " ");
  const candidates = cleaned.split(/\s+/).filter(Boolean);

  // Try exact 17-char tokens first
  for (const c of candidates) {
    if (c.length === 17 && !/[IOQ]/.test(c)) return c;
  }

  // Fallback: scan sliding window
  const joined = cleaned.replace(/\s+/g, "");
  for (let i = 0; i + 17 <= joined.length; i++) {
    const sub = joined.slice(i, i + 17);
    if (!/[IOQ]/.test(sub)) return sub;
  }

  return null;
}

export const colors = {
  light: {
    background: "#FFFFFF",
    text: "#000000",
    secondaryText: "#555555",
    card: "#F2F2F2",
  },
  dark: {
    background: "#000000",
    text: "#FFFFFF",
    secondaryText: "#BBBBBB",
    card: "#1C1C1E",
  },
};
