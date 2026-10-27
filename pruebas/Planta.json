import React, { useState } from 'react'
import PlanEditor from './editor/PlanEditor' // Ajusta esta ruta a tu archivo real

// 1. CATÁLOGO MOCK (Para que el editor tenga qué mostrar en los desplegables)
const CATALOG = {
  kinds: [
    { id: 'embobinadora', name: 'Embobinadora', w: 2.5, d: 1.5, t: 1, ops: 1 },
    { id: 'armado', name: 'Estación de Armado', w: 2.0, d: 2.0, t: 1, ops: 1 },
    { id: 'soldadura', name: 'Estación de Soldadura', w: 2.0, d: 2.0, t: 1, ops: 1 },
    { id: 'impregnado', name: 'Tanque de Impregnado', w: 3.0, d: 2.0, t: 1, ops: 1 },
    { id: 'horno', name: 'Horno de Bache', w: 4.0, d: 4.0, t: 1, ops: 1 },
    { id: 'tester', name: 'Tester Eléctrico', w: 2.0, d: 2.0, t: 1, ops: 1 },
    { id: 'empaque', name: 'Estación de Empaque', w: 3.0, d: 3.0, t: 1, ops: 2 },
    { id: 'almacen', name: 'Almacén Intermedio', w: 2.0, d: 4.0, t: 1, ops: 1 },
    { id: 'gabinete', name: 'Ensamble de Gabinete', w: 2.0, d: 1.5, t: 1, ops: 1 },
    { id: 'nucleo', name: 'Recepción de Núcleo', w: 3.0, d: 1.5, t: 1, ops: 1 },
  ],
  zones: [
    { id: 'produccion', name: 'Zona de Producción' },
    { id: 'almacenamiento', name: 'Zona de Almacenamiento' },
    { id: 'bloqueado', name: 'Área Bloqueada' }
  ]
}

// 2. DATOS INICIALES (Traducidos de tu HTML SVG a metros)
const INITIAL_PLANT = {
  size: { w: 32, d: 16 },
  name: "Planta de Transformadores Tipo Seco",
  stations: [
    // Embobinadoras Izquierda (6)
    ...[1, 2, 3, 4, 5, 6].map(i => ({ id: `emb${i}`, name: `Emb ${i}`, kind: 'embobinadora', w: 2.5, d: 1.5, ops: 1 })),
    // Embobinadoras Derecha (6)
    ...[7, 8, 9, 10, 11, 12].map(i => ({ id: `emb${i}`, name: `Emb ${i}`, kind: 'embobinadora', w: 2.5, d: 1.5, ops: 1 })),
    // Núcleos
    { id: 'nuclL', name: 'Nucl L', kind: 'nucleo', w: 3.0, d: 1.5, ops: 1 },
    { id: 'nuclR', name: 'Nucl R', kind: 'nucleo', w: 3.0, d: 1.5, ops: 1 },
    // Armado
    ...[1, 2, 3].map(i => ({ id: `arm${i}`, name: `Armado A${i}`, kind: 'armado', w: 2.0, d: 2.0, ops: 1 })),
    ...[4, 5, 6].map(i => ({ id: `arm${i}`, name: `Armado A${i}`, kind: 'armado', w: 2.0, d: 2.0, ops: 1 })),
    // Almacén
    { id: 'almacen', name: 'Almacén Componentes', kind: 'almacen', w: 2.0, d: 4.0, ops: 1 },
    // Soldadura
    ...[1, 2].map(i => ({ id: `sol${i}`, name: `Soldadura S${i}`, kind: 'soldadura', w: 2.0, d: 2.0, ops: 1 })),
    ...[3, 4].map(i => ({ id: `solR${i}`, name: `Soldadura Sol${i}`, kind: 'soldadura', w: 2.0, d: 2.0, ops: 1 })),
    // Gabinetes
    ...[1, 2, 3, 4, 5, 6].map(i => ({ id: `gab${i}`, name: `Ensamble Gab ${i}`, kind: 'gabinete', w: 2.0, d: 1.5, ops: 1 })),
    // Proceso Central
    { id: 'stock', name: 'Stock y Secado', kind: 'almacen', w: 4.0, d: 2.5, ops: 1 },
    { id: 'horno', name: 'Horno de Bache', kind: 'horno', w: 4.0, d: 4.0, ops: 1, locked: true, lock_reason: 'Cuello de botella principal' },
    { id: 'impregnado', name: 'Tanque Impregnado', kind: 'impregnado', w: 3.0, d: 2.0, ops: 1 },
    // Pruebas
    { id: 'tester1', name: 'Tester 1 (Intermedio)', kind: 'tester', w: 2.0, d: 2.0, ops: 1 },
    { id: 'tester2', name: 'Tester 2 (Final)', kind: 'tester', w: 2.0, d: 2.0, ops: 1 },
    // Empaque
    { id: 'empaque', name: 'Empaque y Salida', kind: 'empaque', w: 3.0, d: 3.0, ops: 2 },
  ],
  zones: [
    { id: 'z1', name: 'Pasillos Principales', kind: 'produccion', x: 16, z: 8, w: 10, d: 4 }
  ],
  gates: [
    { id: 'A', x: 0, z: 8, label: 'Entrada Materia Prima (Izq)' },
    { id: 'B', x: 32, z: 8, label: 'Entrada Materia Prima (Der)' },
    { id: 'C', x: 16, z: 0, label: 'Salida Producto Terminado' }
  ],
  routes: [
    // Flujo representativo basado en tus paths SVG
    { id: 'r1', from: 'emb1', to: 'arm1', flow: 'material', frac: 1 },
    { id: 'r2', from: 'arm1', to: 'sol1', flow: 'material', frac: 1 },
    { id: 'r3', from: 'sol1', to: 'tester1', flow: 'material', frac: 1 },
    { id: 'r4', from: 'tester1', to: 'impregnado', flow: 'material', frac: 1 },
    { id: 'r5', from: 'impregnado', to: 'horno', flow: 'material', frac: 1 },
    { id: 'r6', from: 'horno', to: 'stock', flow: 'material', frac: 1 },
    { id: 'r7', from: 'stock', to: 'gab1', flow: 'material', frac: 1 },
    { id: 'r8', from: 'gab1', to: 'tester2', flow: 'material', frac: 1 },
    { id: 'r9', from: 'tester2', to: 'empaque', flow: 'material', frac: 1 },
    { id: 'r10', from: 'empaque', to: 'nuclL', flow: 'material', frac: 0.5, is_return: true }, // Retorno
  ],
  // 3. LAYOUT (Posiciones X, Z, Rotación en grados)
  // Traducido de SVG (1000x600) a Metros (32x16)
  layout: {
    'emb1': [2.0, 2.0, 0], 'emb2': [2.0, 4.0, 0], 'emb3': [2.0, 6.0, 0],
    'emb4': [2.0, 8.0, 0], 'emb5': [2.0, 10.0, 0], 'emb6': [2.0, 12.0, 0],
    'emb7': [28.0, 2.0, 0], 'emb8': [28.0, 4.0, 0], 'emb9': [28.0, 6.0, 0],
    'emb10': [28.0, 8.0, 0], 'emb11': [28.0, 10.0, 0], 'emb12': [28.0, 12.0, 0],
    'nuclL': [7.0, 1.0, 0], 'nuclR': [25.0, 1.0, 0],
    'arm1': [7.0, 3.5, 0], 'arm2': [7.0, 5.5, 0], 'arm3': [7.0, 7.5, 0],
    'arm4': [25.0, 3.5, 0], 'arm5': [25.0, 5.5, 0], 'arm6': [25.0, 7.5, 0],
    'almacen': [10.0, 5.0, 0],
    'sol1': [10.0, 9.5, 0], 'sol2': [10.0, 11.5, 0],
    'solR3': [24.0, 9.5, 0], 'solR4': [24.0, 11.5, 0],
    'gab1': [12.0, 4.0, 0], 'gab2': [14.0, 4.0, 0], 'gab3': [16.0, 4.0, 0],
    'gab4': [18.0, 4.0, 0], 'gab5': [20.0, 4.0, 0], 'gab6': [22.0, 4.0, 0],
    'stock': [16.0, 6.5, 0],
    'horno': [16.0, 9.5, 0],
    'impregnado': [16.0, 13.0, 0],
    'tester1': [10.0, 14.0, 0],
    'tester2': [22.0, 2.0, 0],
    'empaque': [16.0, 1.5, 0],
  }
}

// 4. COMPONENTE PRINCIPAL
export default function App() {
  // El estado combina la planta y sus posiciones, tal como lo hace Story.jsx
  const [draft, setDraft] = useState(INITIAL_PLANT)
  const [metrics, setMetrics] = useState(null)

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior simple para contexto */}
      <div style={{ padding: '16px', background: '#0f172a', color: 'white', borderBottom: '1px solid #334155' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Planta de Transformadores Tipo Seco (32m x 16m)</h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
          Vista inicial traducida desde HTML. Ahora es totalmente editable.
        </p>
      </div>

      {/* El Editor ocupa todo el espacio restante */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PlanEditor
          plant={draft}
          positions={draft.layout}
          onChange={(newPlant, newPositions) => {
            // Actualizamos el estado manteniendo la estructura que el editor espera
            setDraft({ ...newPlant, layout: newPositions })
          }}
          catalog={CATALOG}
          mode="full"
          onMetrics={setMetrics}
          title="Editor de Planta"
        />
      </div>
      
      {/* Debug opcional para ver que los datos cambian */}
      {metrics && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
          Distancia de recorrido: {metrics.piece_m.toFixed(1)} m
       . Rutas calculadas: {metrics.legs?.length || 0}
        </div>
      )}
    </div>
  )
}