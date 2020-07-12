import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
import * as N3 from 'n3'

export default class SequencePath extends Path {
  value: Path[];

  constructor (value : Path[], subject? : N3.Term, object?: N3.Term) {
    super(value, subject, object)
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
