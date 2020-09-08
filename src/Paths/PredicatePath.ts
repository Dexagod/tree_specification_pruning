import Path from './Path'
export default class PredicatePath extends Path {
  // matches (path : Path) : PriorityBoolean {
  //   if (path instanceof PredicatePath) {
  //     return this.value === path.value ? new PriorityBoolean(true, true) : new PriorityBoolean(false, false)
  //   }
  //   return new PriorityBoolean(false, false)
  // }

  getPathString () : string {
    return 'predicatePath'
  }
}
