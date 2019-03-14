import * as functions from 'firebase-functions'
import { processedClipsPath, opts, bucket, runOpts, db } from './config'

import { tmpdir } from 'os'
import { join } from 'path'

import * as ffmpegPath from '@ffmpeg-installer/ffmpeg'
import * as FfmpegCommand from 'fluent-ffmpeg'
import { shortUrl } from './api'
FfmpegCommand.setFfmpegPath(ffmpegPath.path)

// Models
import { STATE } from './models/state'

/**
 * Upload the processed clip.
 * @param path Processed clip path under /tmp/ directory
 * @param destination Storage bucket path directory
 */
const uploadClip = async (path: string, destination: string) => {
  try {
    await bucket.upload(path, {
      destination,
      resumable: false
    })
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Download a file from the bucket @cloud/storage.
 * @param path Storage bucket path directory
 * @param destination File path under /tmp/ directory
 */
const downloadFile = async (path: string, destination: string) => {
  try {
    await bucket.file(path).download({
      destination
    })
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Update state of a clip doc...
 * @param ref Reference to the clip document
 * @param state Given state
 */
const updateDoc = async (
  ref: FirebaseFirestore.DocumentReference,
  state: STATE,
  link: string = 'NO_URL_YET'
) => {
  try {
    return await ref.update({ state, link })
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Why the fuck is so complicated to generate a signed link via the admin SDK @Google ? Please...
 * Have to write this horse shit.
 * @param clipPath Path of the processed clip
 */
const generateLink = clipPath => {
  if (!clipPath) throw new Error('No clip path found!')
  const clipName = clipPath.split('/').pop()
  return `https://firebasestorage.googleapis.com/v0/b/notbanana-7f869.appspot.com/o/processed_clips%2F${clipName}?alt=media`
}

/**
 * Main function.
 */
export const generateVideo = functions
  .runWith(runOpts)
  .firestore.document('clips/{clipId}')
  .onCreate(async (snapShot, context) => {
    const clipRef = db.doc(`clips/${context.params.clipId}`)

    const snapData = snapShot.data()

    const { text /* templateId */ } = snapData

    const tmpFilePath = join(tmpdir(), 'rave_.mp4')

    const tmpFontFilePath = join(tmpdir(), 'Gobold_Bold.ttf')

    const processedFileName = 'processed_' + Math.random() + '_rave_.mp4'

    const tmpProcessingPath = join(tmpdir(), processedFileName)

    const command = FfmpegCommand(tmpFilePath) as any

    await updateDoc(clipRef, STATE.GETTING_CLIP)

    await downloadFile('fonts/Gobold_Bold.ttf', tmpFontFilePath)

    await downloadFile('templates/rave_.mp4', tmpFilePath)

    await updateDoc(clipRef, STATE.PROCESSING)

    await new Promise((resolve, reject) => {
      command
        .videoFilters({
          filter: 'drawtext',
          options: { fontfile: tmpFontFilePath, text, ...opts }
        })
        .on('end', async () => {
          const destination = `${processedClipsPath}/processed_clip_${Math.random() *
            100}.mp4`

          await updateDoc(clipRef, STATE.UPLOADING)

          await uploadClip(tmpProcessingPath, destination)

          await updateDoc(clipRef, STATE.BUILD_LINK)

          const clipLink = await shortUrl(generateLink(destination))

          return resolve(updateDoc(clipRef, STATE.DONE, clipLink))
        })
        .on('error', () => {
          return reject(updateDoc(clipRef, STATE.ERROR))
        })
        .save(tmpProcessingPath)
    })
  })
