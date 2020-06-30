import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean';
export default class InversePath extends Path {
  matches (path : Path) : PriorityBoolean {
    if (path instanceof InversePath) {
      return this.value === path.value ? new PriorityBoolean(true, true) : new PriorityBoolean(false, false)
    }
    return new PriorityBoolean(false, false)
  }

  getPathString () : string {
    return 'inversePath'
  }
}
