import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as storage from '@google-cloud/storage'
admin.initializeApp()

// Firestore
export const db = admin.firestore()
db.settings({ timestampsInSnapshots: true })
export const timestamp: FirebaseFirestore.FieldValue = admin.firestore.FieldValue.serverTimestamp()

// Storage
export const gcs = new storage.Storage()
export const bucketName = functions.config().bucket.name // You'll never get my fucking bucket name bro'
export const processedClipsPath = 'processed_clips'
