import { TPL } from './models/template'

export const selectedTemplate = (tpl: TPL) => {
  return {
    0() {
      return 'rave_.mp4'
    },
    1() {
      return 'retro_.mp4'
    },
    2() {
      return 'monkeys.mp4'
    },
    3() {
      return 'blackman.mp4'
    }
  }[tpl]()
}
