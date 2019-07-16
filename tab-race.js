// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/

const dbPrefix = 'tab-race: '
const storeName = 'tab-race'

async function openIdb (dbName) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      reject(new Error(`error opening indexedDB: ${request.error}`))
    }

    // if db doesn't already exist
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
  })
}

// returns true if this tab won
module.exports.race = async function (id) {
  const db = await openIdb(dbPrefix + id)

  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)

  store.add(true, 'race-finished')

  const result = await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true) // this tab won

    transaction.onabort = (event) => {
      const error = event.target.error

      // a constraint error means another tab already wrote the key
      if (error.name === 'ConstraintError') {
        resolve(false) // this tab lost
      } else {
        reject(error)
      }
    }

    transaction.onerror = () => {
      // null if aborted
      if (transaction.error !== null) {
        reject(transaction.error)
      }
    }
  })

  db.close()

  return result
}

module.exports.endRace = function (id) {
  window.indexedDB.deleteDatabase(dbPrefix + id)
}
