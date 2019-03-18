import * as functions from 'firebase-functions'
import {
  processedClipsPath,
  bucket,
  runOpts,
  db,
  timestamp,
  watchEndpoint,
  fb
} from './config'

import * as fs from 'fs-extra'
import { tmpdir } from 'os'
import { join } from 'path'

import * as ffmpegPath from '@ffmpeg-installer/ffmpeg'
import * as FfmpegCommand from 'fluent-ffmpeg'
import { shortUrl } from './api'
FfmpegCommand.setFfmpegPath(ffmpegPath.path)

// Models
import { STATE } from './models/state'
import { selectedTemplate } from './helpers'

const tmpSrtPath = join(tmpdir(), 'text.srt')

/**
 * Upload the processed clip.
 * @param path Processed clip path under /tmp/ directory
 * @param destination Storage bucket path directory
 */
const uploadClip = async (path: string, destination: string) => {
  try {
    await bucket.upload(path, {
      destination,
      //  /tmp/.config, is not writable
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
  bucketLink: string = 'NO_URL_YET',
  link: string = 'NO_URL_YET',
  createdAt = timestamp
) => {
  try {
    return await ref.update({ state, bucketLink, link, createdAt })
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
 * Make a new srt file.
 * @param text Text to send
 */
const makeSrt = async (text: string): Promise<void> => {
  const content = `1
00:00:00,000 --> 00:00:15,000
${text}

2
00:00:15,000 --> 00:00:100,000
bonobo.team`

  await new Promise((resolve, reject) => {
    fs.writeFile(tmpSrtPath, content, err => {
      if (err) {
        reject(err)
      } else resolve()
    })
  })
}

const freeDiskSpace = (...paths: string[]) => {
  paths.forEach(path => fs.unlinkSync(path))
}

/**
 * Main function.
 */
export const generateVideo = functions
  .runWith(runOpts)
  .firestore.document('clips/{clipId}')
  .onCreate(async (snapShot, context) => {
    const { clipId } = context.params

    const watchPath = watchEndpoint.concat(clipId)

    const clipRef = db.doc(`clips/${clipId}`)

    const snapData = snapShot.data()

    const { text, tpl } = snapData

    const template = selectedTemplate(tpl)

    const tmpFilePath = join(tmpdir(), template)

    const tmpFontFilePath = join(tmpdir(), 'Gobold_Bold.ttf')

    const processedFileName = `processed_${Math.random()}_${template}`

    const tmpProcessingPath = join(tmpdir(), processedFileName)

    const command = FfmpegCommand(tmpFilePath) as any

    await updateDoc(clipRef, STATE.GETTING_CLIP)

    await downloadFile('fonts/Gobold_Bold.ttf', tmpFontFilePath)

    await downloadFile(`templates/${template}`, tmpFilePath)

    await updateDoc(clipRef, STATE.PROCESSING)

    await makeSrt(text)

    await new Promise((resolve, reject) => {
      command
        .outputOptions([
          `-vf subtitles=${tmpSrtPath}:force_style='Alignment=10,Fontsize=70`,
          '-preset superfast'
        ])
        .on('start', () => {
          fb.ref('clips/' + clipId).set({
            progress: 0
          })
        })
        .on('progress', async progress => {
          await fb.ref('clips/' + clipId).set({
            progress
          })
        })
        .on('end', async () => {
          const destination = `${processedClipsPath}/processed_clip_${Math.random() *
            100}.mp4`

          await updateDoc(clipRef, STATE.UPLOADING)

          await uploadClip(tmpProcessingPath, destination)

          await updateDoc(clipRef, STATE.BUILD_LINK)

          const clipLink = await shortUrl(watchPath)

          freeDiskSpace(
            tmpProcessingPath,
            tmpFilePath,
            tmpFontFilePath,
            tmpSrtPath
          )

          return resolve(
            updateDoc(clipRef, STATE.DONE, generateLink(destination), clipLink)
          )
        })
        .on('error', () => {
          return reject(updateDoc(clipRef, STATE.ERROR))
        })
        .save(tmpProcessingPath)
    })
  })
