const DATABASE_NAME = 'tapper'
const DATABASE_VERSION = 1

let databasePromise

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function openTapperDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('O armazenamento local não está disponível neste navegador.'))
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result

        if (!database.objectStoreNames.contains('songs')) {
          const songs = database.createObjectStore('songs', { keyPath: 'id' })
          songs.createIndex('created_at', 'createdAt')
          songs.createIndex('updated_at', 'updatedAt')
          songs.createIndex('sync_status', 'syncStatus')
        }

        if (!database.objectStoreNames.contains('projects')) {
          const projects = database.createObjectStore('projects', { keyPath: 'id' })
          projects.createIndex('song_id', 'songId')
          projects.createIndex('updated_at', 'updatedAt')
          projects.createIndex('sync_status', 'syncStatus')
        }

        if (!database.objectStoreNames.contains('blobs')) {
          const blobs = database.createObjectStore('blobs', { keyPath: 'id' })
          blobs.createIndex('song_id', 'songId')
          blobs.createIndex('created_at', 'createdAt')
        }

        if (!database.objectStoreNames.contains('syncQueue')) {
          const syncQueue = database.createObjectStore('syncQueue', { keyPath: 'id' })
          syncQueue.createIndex('created_at', 'createdAt')
          syncQueue.createIndex('entity', 'entity')
        }
      }

      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
      request.onerror = () => {
        databasePromise = undefined
        reject(request.error)
      }
      request.onblocked = () => {
        databasePromise = undefined
        reject(new Error('Feche outras abas do Tapper para atualizar o armazenamento local.'))
      }
    })
  }

  return databasePromise
}

export async function runTransaction(storeNames, mode, operation) {
  const database = await openTapperDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode)
    let result

    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error || new Error('Operação local cancelada.'))

    try {
      result = operation(transaction, requestToPromise)
      if (result && typeof result.catch === 'function') result.catch(reject)
    } catch (error) {
      transaction.abort()
      reject(error)
    }
  })
}

export function resetDatabaseConnectionForTests() {
  databasePromise = undefined
}
