import Constants from "expo-constants";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

const API_BASE = derivedHost ? `http://${derivedHost}:3000` : "http://localhost:3000";

/* 🎨 Colores “HB” */
const COLORS = {
  header: "#2F4F73",
  background: "#F6F6F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  line: "#CFCFCF",
  pill: "#2F4F73", // botón principal
  danger: "#C0392B",
  soft: "#F1F5F9",
  success: "#059669",
};

type Profile = {
  nombre: string;
  socio: string;
  telefono: string;
};

const PROFILE_KEY = "hb_profile_v1";

export default function EmergenciaScreen() {
  // ✅ perfil guardado (autocompleta)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  // campos del perfil (solo se editan una vez)
  const [nombre, setNombre] = useState("");
  const [socio, setSocio] = useState("");
  const [telefono, setTelefono] = useState("");

  // ✅ lo único que escribe el paciente siempre
  const [symptoms, setSymptoms] = useState("");
  const [observations, setObservations] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);

  // 1) Cargar perfil al abrir pantalla
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Profile;
          setProfile(p);
          setEditingProfile(false);
        } else {
          setEditingProfile(true); // si no hay perfil, pedirlo una vez
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

  // 2) Guardar perfil (una sola vez)
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

  // 3) Enviar emergencia (solo síntomas/observaciones)
  const onSend = async () => {
    if (!profile) {
      Alert.alert("Falta perfil", "Primero guardá tu nombre y número de socio.");
      return;
    }

    if (!symptoms.trim()) {
      Alert.alert("Faltan datos", "Completá síntomas.");
      return;
    }

    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Ubicación desactivada",
          "Necesitamos tu ubicación para estimar tu llegada."
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
        telefono: profile.telefono, // opcional
        sintomas: symptoms.trim(),
        observaciones: observations.trim(), // ✅ agregado
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,

        // extras (MVP)
        distanceKm: Number(km.toFixed(2)),
        etaMin,
      };

      const res = await fetch(`${API_BASE}/emergencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        Alert.alert("Error backend", `${res.status}\n${text}`);
        return;
      }

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert("Respuesta inesperada", "El backend no devolvió JSON:\n" + text);
        return;
      }

      Alert.alert(
        "Emergencia enviada",
        `${data.nombre ?? payload.nombre} (Socio ${data.socio ?? payload.socio})
Síntomas: ${data.sintomas ?? payload.sintomas}

Se encuentra a ~${data.etaMin ?? etaMin} minutos del hospital.
Hora de recepción: ${data.receivedAt ?? data.createdAt ?? "-"}`
      );

      // limpiar SOLO lo que escribe el paciente
      setSymptoms("");
      setObservations("");

      router.back();
    } catch (e: any) {
      Alert.alert("Error real", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergencia</Text>
        <Text style={styles.headerSubtitle}>Hospital Británico</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nueva Emergencia</Text>

        {/* PERFIL */}
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
            <Text style={styles.sectionTitle}>Datos del paciente (automático)</Text>

            <ReadOnlyRow label="Nombre" value={profileDisplay?.nombre ?? "-"} />
            <ReadOnlyRow label="N° Socio" value={profileDisplay?.socio ?? "-"} />
            <ReadOnlyRow
              label="Teléfono"
              value={profileDisplay?.telefono ? profileDisplay.telefono : "—"}
            />

            <Pressable
              onPress={() => {
                // cargar a inputs y permitir edición
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

            {/* FORM EMERGENCIA (lo único editable siempre) */}
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

      {/* Botón Enviar */}
      {!showProfileForm && (
        <Pressable
          onPress={onSend}
          disabled={disabledSend}
          style={[styles.sendButton, disabledSend && styles.pillDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.pillText}>Enviar Emergencia</Text>
          )}
        </Pressable>
      )}

      <Pressable onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

/* ---------- COMPONENTES UI ---------- */

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
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 14,
  },

  header: {
    backgroundColor: COLORS.header,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    fontWeight: "600",
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  sectionTitle: {
    color: COLORS.muted,
    fontWeight: "800",
    marginBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  label: {
    color: COLORS.text,
    fontWeight: "800",
    marginBottom: 6,
  },
  req: { color: COLORS.danger },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: "white",
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  readonly: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.soft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  readonlyLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  readonlyValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: COLORS.header,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
  },

  secondaryButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryText: {
    color: COLORS.header,
    fontWeight: "900",
  },

  sendButton: {
    backgroundColor: COLORS.success,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  pillDisabled: { opacity: 0.6 },
  pillText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  link: { alignItems: "center", paddingTop: 6 },
  linkText: {
    color: COLORS.header,
    fontWeight: "700",
  },
});
