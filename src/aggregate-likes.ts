import * as functions from 'firebase-functions'
import { db } from './config'

/**
 * Aggregate likes (@like) counter for a given clip.
 */
export const aggregateLikes = functions.firestore
  .document('likes/{likeKey}')
  .onCreate(async snapShot => {
    const { clipId } = snapShot.data()

    const clipRef = db.doc(`clips/${clipId}`)

    return db.runTransaction(async txs => {
      try {
        const doc = await txs.get(clipRef)
        const { countLikes } = doc.data()
        const aggregatedCounter = countLikes + 1
        return txs.update(clipRef, { countLikes: aggregatedCounter })
      } catch (error) {
        throw new Error(error)
      }
    })
  })
