import axios from 'axios'
import { apikey, workspace } from './config'

/**
 * Generate a short link cuz Cloud Storage URL are as longer as my c0ck.
 * Way too long.
 * @param destination Final url destination.
 */
export const shortUrl = async destination => {
  try {
    const { data } = await axios({
      method: 'post',
      url: 'https://api.rebrandly.com/v1/links',
      headers: {
        'Content-Type': 'application/json',
        apikey,
        workspace
      },
      data: {
        destination,
        domain: { fullName: 'gg.bonobo.team' }
      }
    })
    return data.shortUrl
  } catch (error) {
    throw new Error(error)
  }
}
