import Constants from "expo-constants";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { HOSPITAL } from "../constants/hospital";
import { distanceKm, estimateEtaMinutes } from "../utils/eta";

/* 🔗 BACKEND (AUTO) */
const expoHost = Constants.expoConfig?.hostUri ?? "";
const derivedHost = expoHost.replace(/^exp:\/\//, "").split(":")[0];
const API_BASE = derivedHost
  ? `http://${derivedHost}:3000`
  : "http://localhost:3000";

/* 🎨 Colores Hospital */
const COLORS = {
  header: "#2F4F73",
  background: "#F6F6F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  line: "#E5E7EB",
  primary: "#2F4F73",
  success: "#059669",
  danger: "#C0392B",
  soft: "#F1F5F9",
};

type Profile = {
  nombre: string;
  socio: string;
  telefono: string;
};

const PROFILE_KEY = "hb_profile_v1";

export default function EmergenciaScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const [nombre, setNombre] = useState("");
  const [socio, setSocio] = useState("");
  const [telefono, setTelefono] = useState("");

  const [symptoms, setSymptoms] = useState("");
  const [observations, setObservations] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Profile;
          setProfile(p);
          setEditingProfile(false);
        } else {
          setEditingProfile(true);
        }
      } catch {
        setEditingProfile(true);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const disabledSend = !profile || !symptoms.trim() || loading;
  const showProfileForm = editingProfile;
  const profileDisplay = useMemo(() => profile, [profile]);

  const onSaveProfile = async () => {
    if (!nombre.trim() || !socio.trim()) {
      Alert.alert("Faltan datos", "Completá nombre y número de socio.");
      return;
    }

    const p: Profile = {
      nombre: nombre.trim(),
      socio: socio.trim(),
      telefono: telefono.trim(),
    };

    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    setEditingProfile(false);
  };

  const onSend = async () => {
    if (!profile || !symptoms.trim()) {
      Alert.alert("Faltan datos", "Completá los síntomas.");
      return;
    }

    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Ubicación requerida",
          "Necesitamos tu ubicación para estimar la llegada."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const km = distanceKm(
        loc.coords.latitude,
        loc.coords.longitude,
        HOSPITAL.lat,
        HOSPITAL.lng
      );

      const etaMin = estimateEtaMinutes(km);

      const payload = {
        socio: profile.socio,
        nombre: profile.nombre,
        telefono: profile.telefono,
        sintomas: symptoms.trim(),
        observaciones: observations.trim(),
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        distanceKm: Number(km.toFixed(2)),
        etaMin,
      };

      const res = await fetch(`${API_BASE}/emergencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      Alert.alert(
        "Emergencia enviada",
        "La recepción del Hospital Británico ya recibió tu emergencia."
      );

      setSymptoms("");
      setObservations("");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo enviar la emergencia");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.screen}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergencia</Text>
          <Text style={styles.headerSubtitle}>Hospital Británico</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nueva Emergencia</Text>

          {showProfileForm ? (
            <>
              <Text style={styles.sectionTitle}>Tus datos (solo una vez)</Text>

              <Field
                label="Nombre"
                required
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Nicolás Giordano"
              />

              <Field
                label="Número de socio"
                required
                value={socio}
                onChangeText={setSocio}
                placeholder="Ej: 4171"
              />

              <Field
                label="Teléfono (opcional)"
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Ej: 09xxxxxxx"
              />

              <Pressable onPress={onSaveProfile} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Guardar datos</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Datos del paciente</Text>

              <ReadOnlyRow label="Nombre" value={profileDisplay?.nombre ?? "-"} />
              <ReadOnlyRow label="N° Socio" value={profileDisplay?.socio ?? "-"} />
              <ReadOnlyRow
                label="Teléfono"
                value={profileDisplay?.telefono || "—"}
              />

              <Pressable
                onPress={() => {
                  setNombre(profileDisplay?.nombre ?? "");
                  setSocio(profileDisplay?.socio ?? "");
                  setTelefono(profileDisplay?.telefono ?? "");
                  setEditingProfile(true);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Editar mis datos</Text>
              </Pressable>

              <View style={styles.divider} />

              <Field
                label="Síntomas"
                required
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder="Ej: dolor de pecho, falta de aire…"
                multiline
              />

              <Field
                label="Observaciones"
                value={observations}
                onChangeText={setObservations}
                placeholder="Ej: alergias, medicación, antecedentes…"
                multiline
              />
            </>
          )}
        </View>

        {!showProfileForm && (
          <Pressable
            onPress={onSend}
            disabled={disabledSend}
            style={[styles.sendButton, disabledSend && styles.disabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendText}>Enviar Emergencia</Text>
            )}
          </Pressable>
        )}

        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={styles.linkText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- UI ---------- */

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readonly}>
      <Text style={styles.readonlyLabel}>{label}</Text>
      <Text style={styles.readonlyValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.req}>*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.line}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 160,
    gap: 14,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    backgroundColor: COLORS.header,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.75)", marginTop: 4 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  sectionTitle: { color: COLORS.muted, fontWeight: "800", marginBottom: 10 },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 12 },

  label: { fontWeight: "800", marginBottom: 6 },
  req: { color: COLORS.danger },

  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
  },
  inputMultiline: { minHeight: 100 },

  readonly: {
    backgroundColor: COLORS.soft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  readonlyLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  readonlyValue: { fontSize: 15, fontWeight: "800", marginTop: 4 },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "900" },

  secondaryButton: {
    backgroundColor: COLORS.soft,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  secondaryText: { color: COLORS.primary, fontWeight: "900" },

  sendButton: {
    backgroundColor: COLORS.success,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendText: { color: "white", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.6 },

  link: { alignItems: "center", paddingTop: 6 },
  linkText: { color: COLORS.primary, fontWeight: "700" },
});
