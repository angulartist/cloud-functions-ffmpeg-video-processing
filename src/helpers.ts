import * as functions from 'firebase-functions'

// Check if data object contain any valid key/value pair
export const assert = (data: any, key: string) => {
  if (!data[key]) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `function called without ${key} data`
    )
  } else {
    return data[key]
  }
}
