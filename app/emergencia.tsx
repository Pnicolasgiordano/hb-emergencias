import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState } from "react";
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

/* 🔗 BACKEND */
const API_BASE = "http://172.20.10.2:3000"; 
// ⬆️ 

const COLORS = {
  header: "#3C5C7E",
  background: "#F6F6F6",
  card: "#FFFFFF",
  text: "#1A1A1A",
  line: "#CFCFCF",
  pill: "#D6D0CC",
  danger: "#C0392B",
};

export default function EmergenciaScreen() {
  const [name, setName] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled =
    !name.trim() || !memberNumber.trim() || !symptoms.trim();

  const onSend = async () => {
    if (disabled) {
      Alert.alert(
        "Faltan datos",
        "Completá nombre, número de socio y síntomas."
      );
      return;
    }

    setLoading(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

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
  name: name.trim(),
  memberNumber: memberNumber.trim(),
  symptoms: symptoms.trim(),
  location: {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
  },
  distanceKm: Number(km.toFixed(2)),
  etaMin: etaMin,
};


      const res = await fetch(`${API_BASE}/emergencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Error enviando emergencia");
      }

      const data = await res.json();

      Alert.alert(
        "Emergencia enviada",
        `${data.name} (Socio ${data.memberNumber})
Síntomas: ${data.symptoms}

Se encuentra a ~${data.etaMinutes} minutos del hospital.
Hora de recepción: ${data.receivedAt}`
      );

      router.back();
    } catch (e) {
      Alert.alert(
        "Error",
        "No se pudo enviar la emergencia. Revisá backend e IP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva Emergencia</Text>
      </View>

      <View style={styles.card}>
        <Field
          label="Nombre"
          required
          value={name}
          onChangeText={setName}
          placeholder="Ej: Nicolás Giordano"
        />

        <Field
          label="Número de socio"
          required
          value={memberNumber}
          onChangeText={setMemberNumber}
          placeholder="Ej: 123456"
        />

        <Field
          label="Síntomas"
          required
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Ej: dolor de pecho, falta de aire…"
          multiline
        />
      </View>

      <Pressable
        onPress={onSend}
        disabled={disabled || loading}
        style={[
          styles.pillButton,
          (disabled || loading) && styles.pillDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.pillText}>Enviar</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={styles.link}
      >
        <Text style={styles.linkText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

/* ---------- COMPONENTE INPUT ---------- */

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
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.req}>*</Text>}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.line}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
        ]}
      />

      <View style={styles.underline} />
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
    height: 54,
    backgroundColor: COLORS.header,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
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

  label: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  req: { color: COLORS.danger },

  input: {
    color: COLORS.text,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  underline: {
    height: 1,
    backgroundColor: COLORS.line,
    marginTop: 2,
  },

  pillButton: {
    backgroundColor: COLORS.pill,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  pillDisabled: { opacity: 0.65 },
  pillText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  link: { alignItems: "center", paddingTop: 6 },
  linkText: {
    color: COLORS.header,
    fontWeight: "600",
  },
});
