/**
 * HTXML (HTML + XML + Adaptive Cards 2.0) Agent Engineering Framework
 * 
 * This module provides a unified markup language that combines:
 * - HTML semantic structure and styling
 * - XML extensibility and namespacing
 * - Adaptive Cards 2.0 interactive components
 * - Agent-specific behavior definitions
 */

import { MarkdownTrace } from "./trace"
import { ChatGenerationContext } from "./chat"
import { errorMessage } from "./error"
import { HTMLEscape } from "./htmlescape"

// HTXML Core Types
export interface HTXMLElement {
    tag: string
    attributes: Record<string, string | number | boolean>
    children: (HTXMLElement | string)[]
    namespace?: string
}

export interface HTXMLAgentCapability {
    id: string
    name: string
    description: string
    parameters?: HTXMLParameter[]
    returns?: HTXMLType
    implementation?: (context: HTXMLAgentContext, ...args: any[]) => Promise<any>
}

export interface HTXMLParameter {
    name: string
    type: HTXMLType
    required?: boolean
    description?: string
    default?: any
}

export type HTXMLType = 
    | "string" 
    | "number" 
    | "boolean" 
    | "object" 
    | "array" 
    | "any"
    | { type: "object", properties: Record<string, HTXMLType> }
    | { type: "array", items: HTXMLType }

export interface HTXMLAgentContext {
    id: string
    name: string
    description: string
    capabilities: HTXMLAgentCapability[]
    memory: Map<string, any>
    trace?: MarkdownTrace
    chatContext?: ChatGenerationContext
    metadata: Record<string, any>
}

export interface HTXMLAgentDefinition {
    id: string
    name: string
    description: string
    version: string
    author?: string
    namespace?: string
    capabilities: HTXMLAgentCapability[]
    ui?: HTXMLElement
    behavior?: HTXMLBehavior
    memory?: HTXMLMemoryConfig
    security?: HTXMLSecurityConfig
}

export interface HTXMLBehavior {
    initialization?: string
    messageHandling?: string
    errorHandling?: string
    cleanup?: string
}

export interface HTXMLMemoryConfig {
    type: "ephemeral" | "persistent" | "shared"
    maxSize?: number
    ttl?: number
    encryption?: boolean
}

export interface HTXMLSecurityConfig {
    allowedDomains?: string[]
    maxRequestsPerMinute?: number
    requireAuth?: boolean
    sanitizeInputs?: boolean
}

// HTXML Parser and Builder
export class HTXMLParser {
    private static instance: HTXMLParser

    static getInstance(): HTXMLParser {
        if (!HTXMLParser.instance) {
            HTXMLParser.instance = new HTXMLParser()
        }
        return HTXMLParser.instance
    }

    parseAgent(htxml: string): HTXMLAgentDefinition {
        try {
            // Parse HTXML into DOM-like structure
            const dom = this.parseHTXML(htxml)
            return this.extractAgentDefinition(dom)
        } catch (error) {
            throw new Error(`Failed to parse HTXML agent: ${errorMessage(error)}`)
        }
    }

    private parseHTXML(htxml: string): HTXMLElement {
        // Simplified HTXML parser - in production, use a proper XML/HTML parser
        // This is a basic implementation for demonstration
        
        // Remove comments and normalize whitespace
        const cleaned = htxml
            .replace(/<!--.*?-->/gs, '')
            .replace(/\s+/g, ' ')
            .trim()

        return this.parseElement(cleaned)
    }

    private parseElement(content: string): HTXMLElement {
        // Basic element parsing - expand this for full HTXML support
        const tagMatch = content.match(/<(\w+:?\w*)\s*([^>]*)>/)
        if (!tagMatch) {
            throw new Error('Invalid HTXML element')
        }

        const [, tag, attributesStr] = tagMatch
        const attributes = this.parseAttributes(attributesStr)
        
        // Extract namespace if present
        const [namespace, localTag] = tag.includes(':') ? tag.split(':') : [undefined, tag]

        return {
            tag: localTag,
            namespace,
            attributes,
            children: [] // Simplified - full implementation would parse children
        }
    }

    private parseAttributes(attributesStr: string): Record<string, string | number | boolean> {
        const attributes: Record<string, string | number | boolean> = {}
        const attrRegex = /(\w+)=["']([^"']*)["']/g
        let match

        while ((match = attrRegex.exec(attributesStr)) !== null) {
            const [, name, value] = match
            // Type coercion
            if (value === 'true') attributes[name] = true
            else if (value === 'false') attributes[name] = false
            else if (!isNaN(Number(value))) attributes[name] = Number(value)
            else attributes[name] = value
        }

        return attributes
    }

    private extractAgentDefinition(dom: HTXMLElement): HTXMLAgentDefinition {
        // Extract agent definition from parsed DOM
        // This is a simplified implementation
        return {
            id: (dom.attributes.id as string) || 'unknown',
            name: (dom.attributes.name as string) || 'Unnamed Agent',
            description: (dom.attributes.description as string) || '',
            version: (dom.attributes.version as string) || '1.0.0',
            capabilities: [],
            ui: dom
        }
    }
}

// HTXML Agent Runtime
export class HTXMLAgentRuntime {
    private agents = new Map<string, HTXMLAgentContext>()
    private parser = HTXMLParser.getInstance()

    async registerAgent(htxml: string): Promise<HTXMLAgentContext> {
        const definition = this.parser.parseAgent(htxml)
        
        const context: HTXMLAgentContext = {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            capabilities: definition.capabilities,
            memory: new Map(),
            metadata: {
                version: definition.version,
                author: definition.author,
                registeredAt: new Date().toISOString()
            }
        }

        this.agents.set(definition.id, context)
        return context
    }

    async invokeAgent(
        agentId: string, 
        capabilityId: string, 
        parameters: any[],
        chatContext?: ChatGenerationContext
    ): Promise<any> {
        const agent = this.agents.get(agentId)
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`)
        }

        const capability = agent.capabilities.find(c => c.id === capabilityId)
        if (!capability) {
            throw new Error(`Capability ${capabilityId} not found in agent ${agentId}`)
        }

        if (!capability.implementation) {
            throw new Error(`Capability ${capabilityId} has no implementation`)
        }

        // Set chat context if provided
        if (chatContext) {
            agent.chatContext = chatContext
        }

        try {
            return await capability.implementation(agent, ...parameters)
        } catch (error) {
            throw new Error(`Failed to invoke ${agentId}.${capabilityId}: ${errorMessage(error)}`)
        }
    }

    getAgent(agentId: string): HTXMLAgentContext | undefined {
        return this.agents.get(agentId)
    }

    listAgents(): HTXMLAgentContext[] {
        return Array.from(this.agents.values())
    }

    async removeAgent(agentId: string): Promise<boolean> {
        return this.agents.delete(agentId)
    }
}

// HTXML Builder utility
export class HTXMLBuilder {
    private elements: HTXMLElement[] = []

    element(tag: string, attributes: Record<string, any> = {}, namespace?: string): HTXMLBuilder {
        this.elements.push({
            tag,
            namespace,
            attributes,
            children: []
        })
        return this
    }

    text(content: string): HTXMLBuilder {
        if (this.elements.length > 0) {
            this.elements[this.elements.length - 1].children.push(content)
        }
        return this
    }

    child(element: HTXMLElement): HTXMLBuilder {
        if (this.elements.length > 0) {
            this.elements[this.elements.length - 1].children.push(element)
        }
        return this
    }

    // Adaptive Cards components
    adaptiveCard(version = "1.5"): HTXMLBuilder {
        return this.element("AdaptiveCard", { version }, "ac")
    }

    textBlock(text: string, weight?: "default" | "lighter" | "bolder"): HTXMLBuilder {
        return this.element("TextBlock", { text, weight }, "ac")
    }

    actionSet(): HTXMLBuilder {
        return this.element("ActionSet", {}, "ac")
    }

    submitAction(title: string, data?: any): HTXMLBuilder {
        return this.element("Action.Submit", { title, data: JSON.stringify(data) }, "ac")
    }

    // Agent-specific components
    agentCapability(id: string, name: string, description: string): HTXMLBuilder {
        return this.element("Capability", { id, name, description }, "agent")
    }

    agentMemory(type: "ephemeral" | "persistent" = "ephemeral"): HTXMLBuilder {
        return this.element("Memory", { type }, "agent")
    }

    agentBehavior(type: "initialization" | "messageHandling" | "errorHandling"): HTXMLBuilder {
        return this.element("Behavior", { type }, "agent")
    }

    build(): string {
        return this.elementsToHTXML(this.elements)
    }

    private elementsToHTXML(elements: HTXMLElement[]): string {
        return elements.map(element => this.elementToHTXML(element)).join('\n')
    }

    private elementToHTXML(element: HTXMLElement): string {
        const tagName = element.namespace ? `${element.namespace}:${element.tag}` : element.tag
        const attributes = Object.entries(element.attributes)
            .map(([key, value]) => `${key}="${HTMLEscape(String(value))}"`)
            .join(' ')
        
        const childrenContent = element.children
            .map(child => typeof child === 'string' ? HTMLEscape(child) : this.elementToHTXML(child))
            .join('')

        if (childrenContent) {
            return `<${tagName}${attributes ? ' ' + attributes : ''}>${childrenContent}</${tagName}>`
        } else {
            return `<${tagName}${attributes ? ' ' + attributes : ''} />`
        }
    }
}

// Export singleton runtime instance
export const htxmlRuntime = new HTXMLAgentRuntime()