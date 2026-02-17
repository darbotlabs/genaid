/**
 * Adaptive Cards support for GenAID
 * Enables creation and rendering of Microsoft Adaptive Cards for rich, interactive outputs
 */

export interface AdaptiveCard {
    type: "AdaptiveCard"
    version: string
    body: AdaptiveCardElement[]
    actions?: AdaptiveCardAction[]
    $schema?: string
}

export interface AdaptiveCardElement {
    type: string
    [key: string]: any
}

export interface AdaptiveCardAction {
    type: string
    title: string
    [key: string]: any
}

/**
 * Creates a basic Adaptive Card structure
 */
export function createAdaptiveCard(
    version: string = "1.5"
): AdaptiveCard {
    return {
        type: "AdaptiveCard",
        version,
        body: [],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    }
}

/**
 * Adds a text block to an Adaptive Card
 */
export function addTextBlock(
    card: AdaptiveCard,
    text: string,
    options: {
        size?: "small" | "default" | "medium" | "large" | "extraLarge"
        weight?: "lighter" | "default" | "bolder"
        color?: string
        wrap?: boolean
    } = {}
): AdaptiveCard {
    card.body.push({
        type: "TextBlock",
        text,
        size: options.size || "default",
        weight: options.weight || "default",
        color: options.color,
        wrap: options.wrap !== false,
    })
    return card
}

/**
 * Adds an image to an Adaptive Card
 */
export function addImage(
    card: AdaptiveCard,
    url: string,
    options: {
        altText?: string
        size?: "auto" | "stretch" | "small" | "medium" | "large"
        style?: "default" | "person"
    } = {}
): AdaptiveCard {
    card.body.push({
        type: "Image",
        url,
        altText: options.altText,
        size: options.size || "auto",
        style: options.style || "default",
    })
    return card
}

/**
 * Adds a fact set to an Adaptive Card
 */
export function addFactSet(
    card: AdaptiveCard,
    facts: Array<{ title: string; value: string }>
): AdaptiveCard {
    card.body.push({
        type: "FactSet",
        facts,
    })
    return card
}

/**
 * Adds a container to an Adaptive Card
 */
export function addContainer(
    card: AdaptiveCard,
    items: AdaptiveCardElement[],
    options: {
        style?: "default" | "emphasis" | "good" | "attention" | "warning" | "accent"
        bleed?: boolean
    } = {}
): AdaptiveCard {
    card.body.push({
        type: "Container",
        items,
        style: options.style,
        bleed: options.bleed,
    })
    return card
}

/**
 * Adds a column set to an Adaptive Card
 */
export function addColumnSet(
    card: AdaptiveCard,
    columns: Array<{ width?: string | number; items: AdaptiveCardElement[] }>
): AdaptiveCard {
    card.body.push({
        type: "ColumnSet",
        columns: columns.map((col) => ({
            type: "Column",
            width: col.width || "auto",
            items: col.items,
        })),
    })
    return card
}

/**
 * Adds an action button to an Adaptive Card
 */
export function addAction(
    card: AdaptiveCard,
    title: string,
    actionType: "Action.OpenUrl" | "Action.Submit" | "Action.ShowCard",
    options: {
        url?: string
        data?: any
        card?: AdaptiveCard
    } = {}
): AdaptiveCard {
    if (!card.actions) {
        card.actions = []
    }

    const action: AdaptiveCardAction = {
        type: actionType,
        title,
    }

    if (actionType === "Action.OpenUrl" && options.url) {
        action.url = options.url
    } else if (actionType === "Action.Submit" && options.data) {
        action.data = options.data
    } else if (actionType === "Action.ShowCard" && options.card) {
        action.card = options.card
    }

    card.actions.push(action)
    return card
}

/**
 * Creates an Adaptive Card from a simple object structure
 */
export function createCardFromData(
    data: Record<string, any>,
    options: {
        title?: string
        subtitle?: string
        imageUrl?: string
    } = {}
): AdaptiveCard {
    const card = createAdaptiveCard()

    if (options.title) {
        addTextBlock(card, options.title, { size: "large", weight: "bolder" })
    }

    if (options.subtitle) {
        addTextBlock(card, options.subtitle, { size: "medium", color: "accent" })
    }

    if (options.imageUrl) {
        addImage(card, options.imageUrl, { size: "medium" })
    }

    const facts = Object.entries(data).map(([key, value]) => ({
        title: key,
        value: String(value),
    }))

    if (facts.length > 0) {
        addFactSet(card, facts)
    }

    return card
}

/**
 * Validates an Adaptive Card structure
 */
export function validateCard(card: AdaptiveCard): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (card.type !== "AdaptiveCard") {
        errors.push("Card type must be 'AdaptiveCard'")
    }

    if (!card.version) {
        errors.push("Card version is required")
    }

    if (!Array.isArray(card.body)) {
        errors.push("Card body must be an array")
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Converts an Adaptive Card to JSON string
 */
export function cardToJSON(card: AdaptiveCard, pretty: boolean = true): string {
    return JSON.stringify(card, null, pretty ? 2 : 0)
}

/**
 * Parses an Adaptive Card from JSON string
 */
export function cardFromJSON(json: string): AdaptiveCard {
    return JSON.parse(json) as AdaptiveCard
}
