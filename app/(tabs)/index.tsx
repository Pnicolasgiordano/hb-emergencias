import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const COLORS = {
  header: "#3C5C7E",
  background: "#F6F6F6",
  card: "#FFFFFF",
  text: "#1A1A1A",
  line: "#CFCFCF",
  pill: "#D6D0CC",
  danger: "#C0392B",
};

export default function HomeScreen() {
  const [symptoms, setSymptoms] = useState("");
  const [observations, setObservations] = useState("");

  const disabled = symptoms.trim().length === 0;

  const onSend = () => {
    if (disabled) {
      Alert.alert("Faltan datos", "Ingresá tus síntomas.");
      return;
    }
    Alert.alert("Enviado", "Solicitud enviada (MVP).");
    setSymptoms("");
    setObservations("");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergencias</Text>
      </View>

      <View style={styles.card}>
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
          placeholder="Observaciones adicionales"
        />
      </View>

      <Pressable
  onPress={() => router.push("/emergencia")}
  style={styles.pillButton}
>
  <Text style={styles.pillText}>Enviar Emergencia</Text>
</Pressable>

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
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.req}>*</Text> : null}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.line}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />

      <View style={styles.underline} />
    </View>
  );
}

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
  pillDisabled: {
    opacity: 0.65,
  },
  pillText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
