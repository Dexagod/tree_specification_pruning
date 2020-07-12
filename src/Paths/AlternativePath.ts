import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
import * as N3 from 'n3'
export default class AlternativePath extends Path {
  value: Path[];

  constructor (value : Path[], subject? : N3.Term, object?: N3.Term) {
    super(value, subject, object)
    this.value = value
  }

  matches (path: Path): PriorityBoolean {
    throw new Error('Method not implemented.')
  }

  getPathString () : string {
    return 'AlternativePath'
  }
}
