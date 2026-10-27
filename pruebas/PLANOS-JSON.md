# Probar el editor con planos JSON

1. Inicia la aplicación habitual y abre el paso **Proceso y plano**.
2. Despliega **Importar o exportar un plano JSON**, debajo de la introducción.
3. Usa **Importar plano JSON** y selecciona `pruebas/Planta.json`.
4. Revisa **Tu plano**. Puedes mover equipos, cambiar medidas y editar rutas.
5. Usa **Exportar plano JSON** para descargar los cambios. Edita ese archivo y vuelve a importarlo para otra prueba.

La importación reemplaza el borrador del proyecto activo y reinicia el análisis y rediseño anteriores. Exporta primero el plano si quieres conservarlo, o crea otro proyecto desde el selector. El contexto y el relato se conservan. El archivo de origen en disco solo cambia si lo editas tú; la exportación descarga una copia.

El dibujo usa el mismo `frontend/src/editor/PlanEditor.jsx` que la aplicación. No es necesario conectar `PlantViewer.jsx`: ese archivo queda como boceto de referencia, sin entrada en Vite. `Planta.html` es una referencia visual independiente; sus estilos no se importan al editor.

`Planta.json` contiene 37 estaciones y 10 recorridos, extraídos del ejemplo de `PlantViewer.jsx`. No se ha certificado que su distribución sea físicamente viable. Se conservan posiciones y tamaños para poder detectar solapes o diferencias visuales.

## Formato mínimo

```json
{
  "schema_version": 3,
  "name": "Mi prueba",
  "size": { "w": 20, "d": 12 },
  "stations": [
    { "id": "mesa1", "name": "Mesa de armado", "kind": "otro", "w": 2, "d": 1.5 }
  ],
  "layout": { "mesa1": [5, 4, 0] }
}
```

- Todas las medidas y coordenadas están en **metros**; el giro está en **grados**.
- `size.w` y `size.d` son el ancho y fondo del recinto.
- `stations[].w` y `.d` son las medidas del bloque de equipo.
- `layout[id] = [x, z, giro]`: `x` y `z` corresponden al **centro** de la estación. En el dibujo, `x` crece hacia la derecha y `z` hacia abajo.
- Los nombres de `layout` deben coincidir exactamente con los `id` de las estaciones.
- `routes` conecta estaciones con `from` y `to`; los recorridos se recalculan con el backend.
- `zones`, `gates`, `walls`, `conveyors` y `routes` son opcionales; se completan como listas vacías. Puedes exportar elementos creados en el editor para conocer su estructura.
- `kind` elige la representación del catálogo. Usa un tipo existente para probar también su maqueta 3D; `otro` sirve como equipo genérico.
- El archivo debe ser JSON puro: sin comentarios, `import`, `const`, `.map()` ni código JSX. Una exportación de proyecto completo corresponde al flujo de importación del contexto, no a este importador de planos.

La validación de importación comprueba estructura, dimensiones y referencias; no reacomoda equipos ni demuestra viabilidad física. Permite posiciones fuera del recinto para inspeccionar casos problemáticos. El dibujo puede abrirse sin IA; los recorridos calculados y el análisis requieren backend.

Este flujo prueba **JSON → editor**. Para probar **relato → IA → plano**, utiliza los botones habituales y compara el JSON exportado con tu referencia.
