import { useRef, useState } from 'react'
import { workspaceRequest as request } from '../../workspaceApi'
import { attachmentFile } from '../../contextWorkspace'
import { ask } from '../Dialog'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function useWorkspaceBackend(project, activeId, onProjectChange) {
    const id = project.serverWorkspaceId || activeId
    const revision = useRef(project.serverRevision || 0)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState('')
    const [job, setJob] = useState(null)
    const [questions, setQuestions] = useState([])
    const [deliverables, setDeliverables] = useState(null)

    const mark = (saved, apply = false) => {
        revision.current = saved.revision
        onProjectChange({ ...(apply ? { context: saved.project.context, contextWorkspace: saved.project.contextWorkspace } : {}), serverRevision: saved.revision, serverWorkspaceId: saved.id })
        return saved
    }
    const save = async (snapshot = project) => {
        const { serverRevision: _revision, serverWorkspaceId: _id, ...payload } = snapshot
        return mark(await request(`/${id}`, { method: 'PUT', body: { project: payload, expected_revision: revision.current } }))
    }
    const run = async (operation) => {
        if (busy) return null
        setBusy(true)
        setNotice('')
        try { return await operation() }
        catch (error) { setNotice(error.message); return null }
        finally { setBusy(false) }
    }
    const confirm = (ids, target = 'proposals') => run(async () => {
        await save()
        const saved = mark(await request(`/${id}/confirm`, { method: 'POST', body: { expected_revision: revision.current, ids, target } }), true)
        const accepted = saved.result.accepted.length
        const blocked = saved.result.blocked.length
        setNotice(`${accepted === 1 ? '1 dato confirmado.' : `${accepted} datos confirmados.`}${blocked ? ` ${blocked === 1 ? 'Uno necesita' : `${blocked} necesitan`} que elijas un valor o completes su nombre antes de confirmarlo.` : ''}`)
        return saved
    })
    const interpret = (text, kind = 'context', sourceId = null, topic = null, retryId = null) => run(async () => {
        await save()
        let work = await request(`/${id}/jobs`, { method: 'POST', body: { expected_revision: revision.current, kind, text, source_id: sourceId, topic, retry_job_id: retryId } })
        setJob(work)
        while (['queued', 'running', 'waiting_provider'].includes(work.status)) {
            if (work.status === 'waiting_provider') {
                const proceed = await ask(`Error 429: la API de Gemini ha llegado a su límite. ¿Quieres continuar con el modelo local ${work.provider_issue?.local_model || 'Ollama'}? Se conservan las entregas terminadas y se retoma la llamada pendiente. El modelo local puede tardar más.`, { title: 'Límite de la API alcanzado', ok: 'Continuar con modelo local', cancel: 'Detener y conservar avance' })
                if (!proceed) {
                    await request(`/${id}/jobs/${work.id}/cancel`, { method: 'POST' })
                    throw new Error('Trabajo detenido. El avance permanece guardado para reintentar.')
                }
                try {
                    await request(`/${id}/jobs/${work.id}/continue-local`, { method: 'POST' })
                } catch (error) {
                    const retry = await ask(error.message, { title: 'No se pudo iniciar el modelo local', ok: 'Volver a intentar', cancel: 'Detener y conservar avance' })
                    if (!retry) {
                        await request(`/${id}/jobs/${work.id}/cancel`, { method: 'POST' })
                        throw new Error('Trabajo detenido. El avance permanece guardado para reintentar.')
                    }
                    continue
                }
            }
            await delay(700)
            work = await request(`/${id}/jobs/${work.id}?summary=true`)
            setJob(work)
        }
        if (!['done', 'partial'].includes(work.status)) throw new Error(work.error || (work.status === 'cancelled' ? 'Interpretación cancelada. Los originales siguen guardados.' : 'No se pudo interpretar. Revisa el proveedor e inténtalo de nuevo.'))
        mark(await request(`/${id}`), true)
        setNotice(work.status === 'partial' ? 'Información organizada. Algunas partes no se pudieron leer; revisa los datos propuestos y, si falta algo, reintenta o agrégalo a mano.' : 'Información organizada. Revisa y confirma los datos propuestos.')
        return work
    })
    const upload = async (file, topic) => {
        await save()
        return request(`/${id}/documents?name=${encodeURIComponent(file.name)}&topic=${topic}`, { method: 'POST', body: file, binary: true })
    }
    const importOperators = (sourceId) => run(async () => {
        await save()
        mark(await request(`/${id}/operators`, { method: 'POST', body: { expected_revision: revision.current, source_id: sourceId } }), true)
        setNotice('Operadores importados para revisión. Los indicadores conservan su significado original.')
    })
    const review = () => run(async () => {
        await save()
        const [coverage, studies] = await Promise.all([request(`/${id}/coverage`), request(`/${id}/deliverables`)])
        setQuestions(coverage.questions)
        setDeliverables(studies)
        setNotice('Revisión actualizada con la información confirmada.')
    })
    const restore = () => run(async () => {
        const saved = await request(`/${id}`)
        revision.current = saved.revision
        onProjectChange({ ...saved.project, serverRevision: saved.revision, serverWorkspaceId: saved.id })
        setNotice('Copia guardada recuperada.')
    })
    const exportProject = () => run(async () => {
        const replacements = {}
        const attachments = []
        for (const file of project.contextWorkspace?.attachments || []) {
            if (file.storage === 'server') attachments.push(file)
            else {
                const original = await attachmentFile(file.id)
                const uploaded = await upload(original, file.topic)
                replacements[file.id] = uploaded.id
                attachments.push(uploaded)
            }
        }
        const snapshot = JSON.parse(JSON.stringify({ ...project, contextWorkspace: { ...project.contextWorkspace, attachments } }), (_key, value) => typeof value === 'string' ? replacements[value] || value : value)
        mark(await save(snapshot), true)
        const link = document.createElement('a')
        link.href = `/api/workspaces/${id}/export`
        link.download = 'cauce-proyecto.zip'
        link.click()
    })
    const importProject = (file) => run(async () => {
        const saved = await request('/import', { method: 'POST', body: file, binary: true })
        revision.current = saved.revision
        onProjectChange({ ...saved.project, serverRevision: saved.revision, serverWorkspaceId: saved.id })
        setNotice('Paquete restaurado en este proyecto. El expediente original permanece guardado.')
    })
    const cancel = async () => {
        if (job?.id) await request(`/${id}/jobs/${job.id}/cancel`, { method: 'POST' })
    }
    const clearNotice = () => setNotice('')
    const retry = () => job && interpret(job.text, job.kind, job.source_id, job.topic, job.id)
    const saveCopy = () => run(async () => { await save(); setNotice('Copia del proyecto guardada.'); return true })
    const integrateNew = () => run(async () => {
        await save()
        mark(await request(`/${id}/integrate-new`, { method: 'POST', body: { expected_revision: revision.current } }), true)
        setNotice('Datos nuevos interpretados. Revisa y confirma las propuestas nuevas; el maestro anterior y el plano se conservaron.')
    })
    return { id, busy, notice, job, questions, deliverables, run, save, saveCopy, integrateNew, confirm, interpret, upload, review, restore, exportProject, importProject, importOperators, cancel, clearNotice, retry }
}
