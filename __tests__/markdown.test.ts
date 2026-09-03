import { describe, expect, it } from "vitest"
import { richTextToMarkdown } from "../src/shared/helpers/markdown.helper"
import { ContentfulRichTextNode } from "../src/modules/news/interfaces"

describe("richTextToMarkdown", () => {
    it("should return empty string for undefined node", () => {
        expect(richTextToMarkdown(undefined)).toBe("")
    })

    it("should convert simple paragraph and bold marks correctly without spaces inside asterisks", () => {
        const input: ContentfulRichTextNode = {
            nodeType: "document",
            content: [
                {
                    nodeType: "paragraph",
                    content: [
                        {
                            nodeType: "text",
                            value: "3 Sep - Sep 17: Divine Pass ",
                            marks: [{ type: "bold" }],
                        },
                    ],
                },
            ],
        }

        const result = richTextToMarkdown(input)
        expect(result).toBe("**3 Sep - Sep 17: Divine Pass**")
    })

    it("should avoid producing **** for empty text nodes with bold mark", () => {
        const input: ContentfulRichTextNode = {
            nodeType: "document",
            content: [
                {
                    nodeType: "paragraph",
                    content: [
                        {
                            nodeType: "text",
                            value: "",
                            marks: [{ type: "bold" }],
                        },
                    ],
                },
                {
                    nodeType: "paragraph",
                    content: [
                        {
                            nodeType: "text",
                            value: "Featured Dragon: Sparkler Dragon",
                        },
                    ],
                },
            ],
        }

        const result = richTextToMarkdown(input)
        expect(result).not.toContain("****")
        expect(result).toBe("Featured Dragon: Sparkler Dragon")
    })

    it("should collapse multiple consecutive empty paragraphs into a single clean line break", () => {
        const input: ContentfulRichTextNode = {
            nodeType: "document",
            content: [
                {
                    nodeType: "paragraph",
                    content: [{ nodeType: "text", value: "Featured Dragon: High Stained SharpFang Dragon" }],
                },
                { nodeType: "paragraph", content: [{ nodeType: "text", value: "" }] },
                { nodeType: "paragraph", content: [{ nodeType: "text", value: "" }] },
                { nodeType: "paragraph", content: [{ nodeType: "text", value: "" }] },
                {
                    nodeType: "paragraph",
                    content: [{ nodeType: "text", value: "3 Sep - 10 Sep: Grid Island", marks: [{ type: "bold" }] }],
                },
            ],
        }

        const result = richTextToMarkdown(input)
        expect(result).toBe(
            "Featured Dragon: High Stained SharpFang Dragon\n\n**3 Sep - 10 Sep: Grid Island**"
        )
    })

    it("should handle links, headings, lists and images cleanly", () => {
        const input: ContentfulRichTextNode = {
            nodeType: "document",
            content: [
                {
                    nodeType: "heading-1",
                    content: [{ nodeType: "text", value: "September Calendar" }],
                },
                {
                    nodeType: "unordered-list",
                    content: [
                        {
                            nodeType: "list-item",
                            content: [{ nodeType: "text", value: "Item 1" }],
                        },
                        {
                            nodeType: "list-item",
                            content: [{ nodeType: "text", value: "Item 2" }],
                        },
                    ],
                },
                {
                    nodeType: "hyperlink",
                    data: { uri: "https://dragoncitygame.com" },
                    content: [{ nodeType: "text", value: "Play Dragon City" }],
                },
            ],
        }

        const result = richTextToMarkdown(input)
        expect(result).toContain("# September Calendar")
        expect(result).toContain("- Item 1\n- Item 2")
        expect(result).toContain("[Play Dragon City](https://dragoncitygame.com)")
    })
})
