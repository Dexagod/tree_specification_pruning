import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
export default class AlternatePath extends Path {
  value: Path[];

  constructor (value : Path[]) {
    super(value)
    this.value = value
  }

  matches (path: Path): PriorityBoolean {
    throw new Error('Method not implemented.')
  }

  getPathString () : string {
    return 'AlternatePath'
  }
}
