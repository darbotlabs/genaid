import {
    createAdaptiveCard,
    addTextBlock,
    addFactSet,
    addAction,
    validateCard,
    cardToJSON,
    cardFromJSON,
} from "./adaptivecards"
import { describe, test } from "node:test"
import assert from "node:assert/strict"

describe("Adaptive Cards", () => {
    describe("createAdaptiveCard", () => {
        test("should create a basic adaptive card", () => {
            const card = createAdaptiveCard("1.5")
            assert.equal(card.type, "AdaptiveCard")
            assert.equal(card.version, "1.5")
            assert.ok(Array.isArray(card.body))
        })
    })

    describe("addTextBlock", () => {
        test("should add a text block to card", () => {
            const card = createAdaptiveCard()
            addTextBlock(card, "Hello World", { size: "large" })
            assert.equal(card.body.length, 1)
            assert.equal(card.body[0].type, "TextBlock")
            assert.equal(card.body[0].text, "Hello World")
            assert.equal(card.body[0].size, "large")
        })
    })

    describe("addFactSet", () => {
        test("should add a fact set to card", () => {
            const card = createAdaptiveCard()
            const facts = [
                { title: "Name", value: "John" },
                { title: "Age", value: "30" },
            ]
            addFactSet(card, facts)
            assert.equal(card.body.length, 1)
            assert.equal(card.body[0].type, "FactSet")
            assert.deepEqual(card.body[0].facts, facts)
        })
    })

    describe("addAction", () => {
        test("should add an action to card", () => {
            const card = createAdaptiveCard()
            addAction(card, "Click Me", "Action.OpenUrl", {
                url: "https://example.com",
            })
            assert.ok(card.actions)
            assert.equal(card.actions.length, 1)
            assert.equal(card.actions[0].type, "Action.OpenUrl")
            assert.equal(card.actions[0].title, "Click Me")
            assert.equal(card.actions[0].url, "https://example.com")
        })
    })

    describe("validateCard", () => {
        test("should validate a correct card", () => {
            const card = createAdaptiveCard()
            const result = validateCard(card)
            assert.equal(result.valid, true)
            assert.equal(result.errors.length, 0)
        })

        test("should detect invalid card type", () => {
            const card = { type: "Invalid", version: "1.5", body: [] }
            const result = validateCard(card as any)
            assert.equal(result.valid, false)
            assert.ok(result.errors.length > 0)
        })
    })

    describe("cardToJSON and cardFromJSON", () => {
        test("should convert card to JSON and back", () => {
            const card = createAdaptiveCard()
            addTextBlock(card, "Test")
            const json = cardToJSON(card)
            const parsed = cardFromJSON(json)
            assert.deepEqual(parsed, card)
        })
    })
})
