import { upgradePlant } from './migrate.js'

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const number = (value) => typeof value === 'number' && Number.isFinite(value)
const positive = (value) => number(value) && value > 0
const fail = (message) => { throw new Error(message) }

// Valida datos antes de entregarlos al editor. No reacomoda ni corrige la geometría.
export function parsePlantJson(text) {
    let plant
    try { plant = JSON.parse(text.replace(/^\uFEFF/, '')) } catch {
        fail('El archivo debe ser JSON válido: sin import, comentarios, variables ni funciones .map().')
    }
    if (!object(plant) || !object(plant.size) || !positive(plant.size.w) || !positive(plant.size.d)) {
        fail('Se requiere size con w y d numéricos mayores que cero, en metros.')
    }
    if (plant.schema_version != null && ![2, 3].includes(plant.schema_version)) fail('Solo se admiten plantas con schema_version 2 o 3.')
    if (!Array.isArray(plant.stations) || !object(plant.layout)) fail('Se requieren stations (lista) y layout (objeto de posiciones).')
    const ids = new Set()
    const lists = ['stations', 'zones', 'gates', 'walls', 'conveyors', 'routes', 'parts']
    for (const key of lists) {
        if (plant[key] === undefined) continue
        if (!Array.isArray(plant[key])) fail(`${key} debe ser una lista.`)
        for (const item of plant[key]) {
            if (!object(item) || typeof item.id !== 'string' || !item.id.trim()) fail(`Cada elemento de ${key} necesita un id de texto.`)
            if (ids.has(item.id)) fail(`El id "${item.id}" está repetido.`)
            ids.add(item.id)
        }
    }
    const point = (value) => Array.isArray(value) && value.length === 2 && value.every(number)
    const polygon = (value, label) => {
        if (!Array.isArray(value) || value.length < 3 || !value.every(point)) fail(`${label} necesita al menos tres puntos [x, z] numéricos.`)
    }
    const dimensions = (item) => {
        if (!positive(item.w) || !positive(item.d)) fail(`${item.id}: w y d deben ser números mayores que cero.`)
    }
    for (const s of plant.stations) {
        dimensions(s)
        const pos = plant.layout[s.id]
        if (!Array.isArray(pos) || ![2, 3].includes(pos.length) || !pos.every(number)) fail(`${s.id}: falta layout.${s.id} = [x, z, giro] con números.`)
        if (s.count !== undefined && (!Number.isInteger(s.count) || s.count < 1 || s.count > 500)) fail(`${s.id}: count debe ser un entero entre 1 y 500.`)
        for (const key of ['t', 'ops']) if (s[key] !== undefined && (!number(s[key]) || s[key] < 0)) fail(`${s.id}: ${key} debe ser un número no negativo.`)
        for (const key of ['unit_w', 'unit_d']) if (s[key] !== undefined && !positive(s[key])) fail(`${s.id}: ${key} debe ser un número mayor que cero.`)
        if (s.arrangement !== undefined && !['fila', 'columna', 'bloque'].includes(s.arrangement)) fail(`${s.id}: arrangement debe ser fila, columna o bloque.`)
        if (s.kind !== undefined && typeof s.kind !== 'string') fail(`${s.id}: kind debe ser texto.`)
    }
    for (const z of plant.zones || []) {
        dimensions(z)
        if (!number(z.x) || !number(z.z)) fail(`${z.id}: se requieren x y z numéricos.`)
    }
    for (const g of plant.gates || []) if (!number(g.x) || (g.z !== undefined && !number(g.z))) fail(`${g.id}: coordenadas de portón inválidas.`)
    for (const w of plant.walls || []) if (![w.x1, w.z1, w.x2, w.z2].every(number)) fail(`${w.id}: se requieren x1, z1, x2 y z2 numéricos.`)
    for (const c of plant.conveyors || []) {
        if (!Array.isArray(c.points) || c.points.length < 2 || !c.points.every(point)) fail(`${c.id}: la banda necesita al menos dos points [x, z] numéricos.`)
    }
    if (plant.outline !== undefined) polygon(plant.outline, 'outline')
    for (const part of plant.parts || []) {
        if (part.kind === 'poly') polygon(part.pts, part.id)
        else {
            dimensions(part)
            if (!number(part.x) || !number(part.z)) fail(`${part.id}: se requieren x y z numéricos.`)
        }
        if (part.rot !== undefined && !number(part.rot)) fail(`${part.id}: rot debe ser numérico.`)
    }
    const stations = new Set(plant.stations.map((s) => s.id))
    for (const r of plant.routes || []) {
        if (!stations.has(r.from) || !stations.has(r.to)) fail(`${r.id}: from y to deben referirse a estaciones existentes.`)
        if (r.flow !== undefined && !['material', 'personas', 'vehiculos', 'carga'].includes(r.flow)) fail(`${r.id}: tipo de flujo desconocido.`)
        if (r.frac !== undefined && (!number(r.frac) || r.frac < 0)) fail(`${r.id}: frac debe ser un número no negativo.`)
    }
    for (const key of ['name', 'industry']) if (plant[key] !== undefined && typeof plant[key] !== 'string') fail(`${key} debe ser texto.`)
    if (plant.params !== undefined && !object(plant.params)) fail('params debe ser un objeto.')
    return upgradePlant({
        name: 'Planta importada', industry: '', params: {}, gates: [], walls: [], conveyors: [], routes: [],
        ...plant,
        stations: plant.stations.map((s) => ({ kind: 'otro', t: 0, ops: 0, ...s, name: typeof s.name === 'string' ? s.name : s.id })),
        zones: (plant.zones || []).map((z) => ({ kind: 'area', ...z, name: typeof z.name === 'string' ? z.name : z.id })),
        layout: Object.fromEntries(plant.stations.map((s) => [s.id, [...plant.layout[s.id].slice(0, 2), plant.layout[s.id][2] ?? 0]])),
    })
}

export function serializePlantJson(plant) {
    return JSON.stringify(plant, null, 2) + '\n'
}
