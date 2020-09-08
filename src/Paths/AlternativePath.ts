import Path from './Path'
import * as N3 from 'n3'
export default class AlternativePath extends Path {
  value: Path[];

  constructor (value : Path[], subject? : N3.Term, object?: N3.Term) {
    super(value, subject, object)
    this.value = value
  }

  getPathString () : string {
    return 'AlternativePath'
  }
}
