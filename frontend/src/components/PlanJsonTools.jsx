import { useRef, useState } from 'react'
import { parsePlantJson, serializePlantJson } from '../plantJson'
import Btn from '../fx/Btn'

export default function PlanJsonTools({ draft, disabled, onImport }) {
    const input = useRef(null)
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(false)
    const importFile = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setLoading(true)
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el límite de 5 MB.')
            const plant = parsePlantJson(await file.text())
            onImport(plant, file.name)
            setNotice(`${file.name}: plano cargado. Revisa sus medidas y posiciones en el editor.`)
        } catch (error) { setNotice(error.message || 'No se pudo leer el plano.') }
        finally { setLoading(false) }
    }
    const exportFile = () => {
        const url = URL.createObjectURL(new Blob([serializePlantJson(draft)], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url
        link.download = 'cauce-plano.json'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    return <details className="block" style={{ marginBottom: 20 }}>
        <summary>Importar o exportar un plano JSON</summary>
        <p className="small">Carga un plano con medidas y posiciones definidas, sin usar la IA. La importación reemplaza el plano editable del proyecto actual y reinicia sus resultados de análisis. Puedes exportarlo antes de cargar otro.</p>
        <div className="row">
            <input ref={input} type="file" accept=".json,application/json" hidden onChange={importFile} aria-label="Seleccionar plano JSON" disabled={disabled || loading} />
            <Btn type="button" size="small" variant="ghost" disabled={disabled || loading} onClick={() => input.current?.click()}>{loading ? 'Cargando…' : 'Importar plano JSON'}</Btn>
            <Btn type="button" size="small" variant="ghost" disabled={disabled || loading || !draft} onClick={exportFile}>Exportar plano JSON</Btn>
        </div>
        {notice && <p className="small" role="status">{notice}</p>}
    </details>
}
