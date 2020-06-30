import Path from './Path'
import PriorityBoolean from '../Util/PriorityBooolean'
export default class PredicatePath extends Path {
  matches (path : Path) : PriorityBoolean {
    if (path instanceof PredicatePath) {
      return this.value === path.value ? new PriorityBoolean(true, true) : new PriorityBoolean(false, false)
    }
    return new PriorityBoolean(false, false)
  }

  getPathString () : string {
    return 'predicatePath'
  }
}
