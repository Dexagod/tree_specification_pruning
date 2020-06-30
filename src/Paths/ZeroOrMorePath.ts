import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
export default class ZeroOrMorePath extends Path {
  matches (path: Path): PriorityBoolean {
    throw new Error('Method not implemented.')
  }

  getPathString () : string {
    return 'zeroOrMorePath'
  }
}
