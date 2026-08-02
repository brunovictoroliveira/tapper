import { useCallback, useEffect, useState } from 'react'
import { songRepository } from '../../../repositories/songRepository.js'
import { exportLocalData, importLocalData } from '../../../services/localBackupService.js'
import { createProjectFromAnalysis } from '../../../services/projectService.js'

function filenameToTitle(filename) {
  return filename?.replace(/\.[^.]+$/, '').trim() || 'Gravação sem título'
}

export function useLocalSongHistory() {
  const [songs, setSongs] = useState([])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    try {
      setSongs(await songRepository.list())
      setStatus('ready')
    } catch (error) {
      setStatus('unavailable')
      setMessage(error.message)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveAnalysis = useCallback(async (analysis, audioFile) => {
    try {
      const song = await songRepository.create({
        title: filenameToTitle(audioFile?.name),
        originalFilename: audioFile?.name,
        mimeType: audioFile?.type,
        fileSizeBytes: audioFile?.size,
        durationMs: analysis.durationMs,
        detectedKey: analysis.key,
        detectedMode: analysis.mode,
        detectionConfidence: analysis.confidence,
        camelot: analysis.camelot,
        alternative: analysis.alternative,
        analyzedAt: analysis.analyzedAt,
      })
      await createProjectFromAnalysis(song, analysis)
      setSongs((current) => [song, ...current])
      setStatus('ready')
      setMessage('Análise salva no histórico deste dispositivo.')
      return song
    } catch (error) {
      setStatus('unavailable')
      setMessage(`A análise foi concluída, mas não pôde ser salva: ${error.message}`)
      return null
    }
  }, [])

  const removeSong = useCallback(async (id) => {
    try {
      await songRepository.remove(id)
      setSongs((current) => current.filter((song) => song.id !== id))
      setMessage('Item removido do histórico local.')
    } catch (error) {
      setMessage(error.message)
    }
  }, [])

  const exportBackup = useCallback(async () => {
    try {
      const contents = await exportLocalData()
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `tapper-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage('Backup exportado com sucesso.')
    } catch (error) {
      setMessage(error.message)
    }
  }, [])

  const importBackup = useCallback(async (file) => {
    if (!file) return
    try {
      const imported = await importLocalData(await file.text())
      await refresh()
      setMessage(`${imported.songs} música(s) e ${imported.projects} projeto(s) importados.`)
    } catch (error) {
      setMessage(error.message)
    }
  }, [refresh])

  return {
    songs,
    status,
    message,
    saveAnalysis,
    removeSong,
    exportBackup,
    importBackup,
  }
}
