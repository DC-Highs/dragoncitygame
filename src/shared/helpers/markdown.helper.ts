import { ContentfulRichTextLinks, ContentfulRichTextNode } from "../../modules/news/interfaces"

export function richTextToMarkdown(
    node?: ContentfulRichTextNode | ContentfulRichTextNode[],
    links?: ContentfulRichTextLinks,
): string {
    if (!node) return ""

    if (Array.isArray(node)) {
        return node.map((child) => richTextToMarkdown(child, links)).join("")
    }

    switch (node.nodeType) {
        case "document":
            return richTextToMarkdown(node.content, links)

        case "paragraph":
            return richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-1":
            return "# " + richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-2":
            return "## " + richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-3":
            return "### " + richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-4":
            return "#### " + richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-5":
            return "##### " + richTextToMarkdown(node.content, links) + "\n\n"

        case "heading-6":
            return "###### " + richTextToMarkdown(node.content, links) + "\n\n"

        case "unordered-list":
            return (
                (node.content || []).map((item) => "- " + richTextToMarkdown(item, links).trim() + "\n").join("") + "\n"
            )

        case "ordered-list":
            return (
                (node.content || [])
                    .map((item, index) => `${index + 1}. ` + richTextToMarkdown(item, links).trim() + "\n")
                    .join("") + "\n"
            )

        case "list-item":
            return richTextToMarkdown(node.content, links)

        case "blockquote":
            return "> " + richTextToMarkdown(node.content, links).trim() + "\n\n"

        case "hr":
            return "---\n\n"

        case "hyperlink": {
            const linkText = richTextToMarkdown(node.content, links).trim()
            const uri = node.data?.uri || ""
            return `[${linkText}](${uri})`
        }

        case "embedded-asset-block": {
            const assetId = node.data?.target?.sys?.id
            if (!assetId || !links?.assets?.block) return ""
            const asset = links.assets.block.find((a) => a.sys?.id === assetId)
            if (!asset) return ""
            const alt = asset.title || "image"
            return `![${alt}](${asset.url})\n\n`
        }

        case "text": {
            let text = node.value || ""
            if (node.marks) {
                node.marks.forEach((mark) => {
                    if (mark.type === "bold") text = `**${text}**`
                    if (mark.type === "italic") text = `_${text}_`
                    if (mark.type === "code") text = `\`${text}\``
                })
            }
            return text
        }

        default:
            return "content" in node && (node as any).content
                ? richTextToMarkdown((node as any).content, links)
                : ""
    }
}

