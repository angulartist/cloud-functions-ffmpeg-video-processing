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

// Firebase
export const fb = admin.database()

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
export const watchEndpoint = 'https://bonobo.team/v/'

// FFmpeg
export const cmd = FfmpegCommand.setFfmpegPath(ffmpegPath.path)
