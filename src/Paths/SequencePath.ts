import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
export default class SequencePath extends Path {
  value: Path[];

  constructor (value : Path[]) {
    super(value)
    this.value = value
  }

  matches (path: Path): PriorityBoolean {
    if (path instanceof SequencePath) {
      const thisvalue = this.value as Path[]
      const pathvalue = path.value as Path[]
      for (let index = 0; index < thisvalue.length; index++) {
        const priorityValue = thisvalue[index].matches(pathvalue[index])
        if (!priorityValue.value) return priorityValue
      }
      return new PriorityBoolean(true, true)
    }
    return new PriorityBoolean(false, false)
  }

  getPathString () : string {
    return 'sequencePath'
  }
}
