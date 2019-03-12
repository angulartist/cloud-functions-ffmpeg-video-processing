import * as functions from 'firebase-functions'
import { gcs, processedClipsPath, bucketName } from './config'
import { assert } from './helpers'

// #
import * as fs from 'fs-extra'
import { tmpdir } from 'os'
import { join } from 'path'

// ffmpeg
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg'
import * as FfmpegCommand from 'fluent-ffmpeg'
FfmpegCommand.setFfmpegPath(ffmpegPath.path)

export const generateVideo = functions.https.onCall(async data => {
  // Getting text data
  const text = assert(data, 'text')

  // Setting up the bucket
  const bucket = gcs.bucket(bucketName)

  // Set the original clip path in the /tmp/ directory
  const tmpFilePath = join(tmpdir(), 'rave.mp4')

  // Set the font file (.ttf) in the /tmp/ directory
  const tmpFontFilePath = join(tmpdir(), 'Gobold_Bold.ttf')

  // Set a temp name for the manipulated clip
  const processedFileName = 'processed_' + Math.random() + '_rave.mp4'

  // Set up them path
  const tmpProcessingPath = join(tmpdir(), processedFileName)

  // Downloading the font
  try {
    await bucket.file('fonts/Gobold_Bold.ttf').download({
      destination: tmpFontFilePath
    })
  } catch (error) {
    throw new Error(`Error on getting font: ${error}`)
  }

  // Download the original clip
  try {
    await bucket.file('templates/rave.mp4').download({
      destination: tmpFilePath
    })
  } catch (error) {
    throw new Error(`Error on getting clip: ${error}`)
  }

  // Make a read stream of the clip
  const fileStream = fs.createReadStream(tmpFilePath)

  // Video filter options...
  const options = {
    fontfile: tmpFontFilePath,
    text,
    fontsize: 80,
    fontcolor: 'white',
    x: '(main_w/2-text_w/2)',
    y: '(main_h/2-text_h/2)',
    shadowcolor: 'black',
    shadowx: 2,
    shadowy: 2
  }

  // Set a new ffmpeg command (fuking any type needed atm)
  const cmd = FfmpegCommand(fileStream) as any

  // Using drawText filter to add the user's text...
  cmd
    .videoFilters({
      filter: 'drawtext',
      options
    })
    .on('end', async () => {
      // Cool, set the processed clip path in the bucket
      const destination = `${processedClipsPath}/processed_clip_${Math.random() *
        100}.mp4`

      // Uploading the processed clip!
      try {
        await bucket.upload(tmpProcessingPath, {
          destination,
          resumable: false
        })
      } catch (error) {
        throw new Error(`Error on uploading processed clip: ${error}`)
      }
    })
    .on('error', ({ message }) => {
      throw new Error(`Error while processing the video: ${message}`)
    })
    .save(tmpProcessingPath)
})
