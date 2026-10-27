import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parsePlantJson, serializePlantJson } from '../src/plantJson.js'

const example = readFileSync(new URL('../../pruebas/Planta.json', import.meta.url), 'utf8')

test('el ejemplo de transformadores conserva equipos, tamaños y posiciones al importar y exportar', () => {
    const original = JSON.parse(example)
    const plant = parsePlantJson(example)
    assert.equal(plant.stations.length, 37)
    assert.equal(plant.routes.length, 10)
    assert.deepEqual(plant.size, { w: 32, d: 16 })
    assert.deepEqual(plant.layout, original.layout)
    assert.equal(plant.stations.find((s) => s.id === 'horno').locked, true)
    assert.deepEqual(parsePlantJson(serializePlantJson(plant)), plant)
})

test('normaliza un plano mínimo sin inventar posiciones ni dimensiones', () => {
    const plant = parsePlantJson(JSON.stringify({ size: { w: 10, d: 8 }, stations: [{ id: 's', w: 2, d: 3 }], layout: { s: [4, 5] } }))
    assert.deepEqual(plant.layout.s, [4, 5, 0])
    assert.equal(plant.stations[0].kind, 'otro')
    assert.deepEqual(plant.walls, [])
    assert.deepEqual(plant.gates, [])
    assert.equal(plant.stations[0].w, 2)
})

test('rechaza código React, JSON roto y formatos de proyecto en lugar de planta', () => {
    for (const input of ['import React from "react"', '{', '{"draft": {}}', 'null', '[]']) assert.throws(() => parsePlantJson(input))
})

test('rechaza posiciones ausentes, tamaños inválidos, ids repetidos y rutas huérfanas', () => {
    const changes = [
        (p) => { delete p.layout.emb1 },
        (p) => { p.layout.emb1 = ['dos', 2, 0] },
        (p) => { p.size.w = 0 },
        (p) => { p.stations[0].w = -2 },
        (p) => { p.stations[0].count = 1.5 },
        (p) => { p.stations[1].id = p.stations[0].id },
        (p) => { p.routes[0].to = 'no-existe' },
        (p) => { p.zones = {} },
        (p) => { p.outline = [[0, 0], [1, 'mal'], [2, 0]] },
        (p) => { p.parts = [{ id: 'base', kind: 'poly', pts: [] }] },
    ]
    for (const change of changes) {
        const p = JSON.parse(example)
        change(p)
        assert.throws(() => parsePlantJson(JSON.stringify(p)))
    }
})

test('acepta posiciones de prueba fuera del recinto sin corregirlas silenciosamente', () => {
    const p = JSON.parse(example)
    p.layout.emb1 = [-3, 50, 90]
    assert.deepEqual(parsePlantJson(JSON.stringify(p)).layout.emb1, [-3, 50, 90])
})

test('conserva paredes, bandas y piezas de recinto creadas con el editor', () => {
    const p = JSON.parse(example)
    p.walls = [{ id: 'wall1', x1: 1, z1: 1, x2: 5, z2: 1 }]
    p.conveyors = [{ id: 'belt1', name: 'Banda 1', from: 'emb1', to: 'arm1', points: [[2, 2], [7, 3.5]], capacity_ppm: 1, speed_mpm: 6, locked: false }]
    p.parts = [{ id: 'base', kind: 'rect', x: 16, z: 8, w: 32, d: 16, rot: 0, hole: false }]
    const plant = parsePlantJson(serializePlantJson(p))
    for (const key of ['walls', 'conveyors', 'parts']) assert.deepEqual(plant[key], p[key])
})
