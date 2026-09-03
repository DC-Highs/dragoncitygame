import { ContentfulRichTextLinks, ContentfulRichTextNode } from "../../modules/news/interfaces"

export function richTextToMarkdown(
    node?: ContentfulRichTextNode | ContentfulRichTextNode[],
    links?: ContentfulRichTextLinks,
): string {
    if (!node) return ""

    const rawMarkdown = renderNode(node, links)

    return cleanMarkdown(rawMarkdown)
}

function renderNode(
    node?: ContentfulRichTextNode | ContentfulRichTextNode[],
    links?: ContentfulRichTextLinks,
): string {
    if (!node) return ""

    if (Array.isArray(node)) {
        return node.map((child) => renderNode(child, links)).join("")
    }

    switch (node.nodeType) {
        case "document":
            return renderNode(node.content, links)

        case "paragraph": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return content.trim() + "\n\n"
        }

        case "heading-1": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "# " + content.trim() + "\n\n"
        }

        case "heading-2": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "## " + content.trim() + "\n\n"
        }

        case "heading-3": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "### " + content.trim() + "\n\n"
        }

        case "heading-4": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "#### " + content.trim() + "\n\n"
        }

        case "heading-5": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "##### " + content.trim() + "\n\n"
        }

        case "heading-6": {
            const content = renderNode(node.content, links)
            if (!content.trim()) return ""
            return "###### " + content.trim() + "\n\n"
        }

        case "unordered-list": {
            if (!node.content || !node.content.length) return ""
            const items = node.content
                .map((item) => renderNode(item, links).trim())
                .filter(Boolean)
            if (!items.length) return ""
            return items.map((item) => `- ${item}`).join("\n") + "\n\n"
        }

        case "ordered-list": {
            if (!node.content || !node.content.length) return ""
            const items = node.content
                .map((item) => renderNode(item, links).trim())
                .filter(Boolean)
            if (!items.length) return ""
            return items.map((item, index) => `${index + 1}. ${item}`).join("\n") + "\n\n"
        }

        case "list-item":
            return renderNode(node.content, links)

        case "blockquote": {
            const content = renderNode(node.content, links).trim()
            if (!content) return ""
            return "> " + content.replace(/\n/g, "\n> ") + "\n\n"
        }

        case "hr":
            return "---\n\n"

        case "hyperlink": {
            const linkText = renderNode(node.content, links).trim()
            const uri = node.data?.uri || ""
            if (!linkText) return ""
            if (!uri) return linkText
            return `[${linkText}](${uri})`
        }

        case "embedded-asset-block": {
            const assetId = node.data?.target?.sys?.id
            if (!assetId || !links?.assets?.block) return ""
            const asset = links.assets.block.find((a) => a.sys?.id === assetId)
            if (!asset || !asset.url) return ""
            const alt = asset.title || "image"
            return `![${alt}](${asset.url})\n\n`
        }

        case "text": {
            let text = node.value || ""
            if (!text) return ""

            if (!text.trim()) {
                return text
            }

            if (node.marks && node.marks.length > 0) {
                const leadingMatch = text.match(/^(\s*)/)
                const trailingMatch = text.match(/(\s*)$/)
                const leadingSpace = leadingMatch ? leadingMatch[0] : ""
                const trailingSpace = trailingMatch ? trailingMatch[0] : ""
                let core = text.trim()

                if (core) {
                    node.marks.forEach((mark) => {
                        if (mark.type === "bold") core = `**${core}**`
                        if (mark.type === "italic") core = `_${core}_`
                        if (mark.type === "code") core = `\`${core}\``
                    })
                    text = leadingSpace + core + trailingSpace
                }
            }
            return text
        }

        default:
            return "content" in node && Array.isArray((node as any).content)
                ? renderNode((node as any).content, links)
                : ""
    }
}

function cleanMarkdown(markdown: string): string {
    if (!markdown) return ""

    let cleaned = markdown

    // Remove lines that only contain empty bold/italic formatting or whitespace
    cleaned = cleaned.replace(/^[ \t]*(\*{2,}|_{2,})[ \t]*$/gm, "")

    // Remove any leftover **** or ____ strings
    cleaned = cleaned.replace(/\*{4,}/g, "")
    cleaned = cleaned.replace(/_{4,}/g, "")

    // Deduplicate consecutive horizontal rules (e.g. --- followed by ---)
    cleaned = cleaned.replace(/(?:[ \t]*---[ \t]*\n+){2,}/g, "---\n\n")

    // Replace 3 or more consecutive newlines with 2 newlines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

    return cleaned.trim()
}
