const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// “Base de datos” en memoria (MVP)
const emergencies = [];

/**
 * GET lista de emergencias
 */
app.get("/emergencies", (req, res) => {
  res.json(emergencies);
});

/**
 * POST crear emergencia
 * Espera: socio, nombre, telefono (opcional), sintomas, observaciones (opcional), lat, lng
 */
app.post("/emergencies", (req, res) => {
  const { socio, nombre, telefono, sintomas, observaciones, lat, lng } = req.body || {};

  // Validación mínima
  if (!socio || !nombre || !sintomas || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({
      error: "Faltan datos",
      required: ["socio", "nombre", "sintomas", "lat(number)", "lng(number)"],
    });
  }

  const item = {
    id: randomUUID(),
    socio: String(socio),
    nombre: String(nombre),
    telefono: telefono ? String(telefono) : "",
    sintomas: String(sintomas),
    observaciones: observaciones ? String(observaciones) : "",
    lat,
    lng,
    createdAt: new Date().toISOString(),
    status: "nuevo",
  };

  // Agregamos al principio para que salga arriba
  emergencies.unshift(item);

  res.status(201).json(item);
});

/**
 * PATCH cambiar estado (para botones en recepción)
 */
app.patch("/emergencies/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!["nuevo", "en_atencion", "finalizado"].includes(status)) {
    return res.status(400).json({ error: "status inválido" });
  }

  const idx = emergencies.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "No encontrado" });

emergencies[idx].status = status;

if (status === "en_atencion") {
  emergencies[idx].takenAt = new Date().toISOString();
}

if (status === "finalizado") {
  emergencies[idx].closedAt = new Date().toISOString();
}

res.json(emergencies[idx]);

});

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});
