import debug, { Debugger } from "debug"

const _genaidDebug = debug("genaid")
export function genaidDebug(namespace: string): Debugger {
    return _genaidDebug.extend(namespace)
}
