import assert from "node:assert/strict"
import { test } from "node:test"
import { measure, performanceMonitor } from "./performance"

test("measure returns independent, idempotent completion callbacks", () => {
    performanceMonitor.startProfile("measure-test", "measure test")
    const first = measure("same-operation", "first")
    const second = measure("same-operation", "second")
    assert.equal(typeof first, "function")
    const duration = first("complete")
    assert.ok(duration >= 0)
    assert.equal(first(), duration)
    assert.ok(second() >= 0)
    const profile = performanceMonitor.endProfile("measure-test")!
    const measured = profile.metrics.filter(m => m.name === "same-operation")
    assert.equal(measured.length, 2)
    assert.equal(measured[0].metadata?.details, "first")
    assert.equal(measured[1].metadata?.details, "second")
})
