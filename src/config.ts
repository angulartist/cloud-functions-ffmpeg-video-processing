import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as storage from '@google-cloud/storage'
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg'
import * as FfmpegCommand from 'fluent-ffmpeg'
admin.initializeApp()

// Firestore
export const db = admin.firestore()
db.settings({ timestampsInSnapshots: true })
export const timestamp: FirebaseFirestore.FieldValue = admin.firestore.FieldValue.serverTimestamp()

// Functions
export const runOpts: {
  timeoutSeconds: number
  memory: '128MB' | '256MB' | '512MB' | '1GB' | '2GB'
} = { timeoutSeconds: 300, memory: '2GB' }

// Storage
export const gcs = new storage.Storage()
export const bucketName = functions.config().bucket.name
export const processedClipsPath = 'processed_clips'
export const bucket = gcs.bucket(bucketName)

// ShortLink
export const apikey = functions.config().shortlink.apikey
export const workspace = functions.config().shortlink.workspace

// FFmpeg
export const cmd = FfmpegCommand.setFfmpegPath(ffmpegPath.path)

export const opts = {
  fontsize: 80,
  fontcolor: 'white',
  x: '(main_w/2-text_w/2)',
  y: '(main_h/2-text_h/2)',
  shadowcolor: 'black',
  enable: '(lt(mod(t,1),1))',
  shadowx: 2,
  shadowy: 2
}
