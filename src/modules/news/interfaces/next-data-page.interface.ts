export interface NextDataArticle {
    __typename: string
    sys: { id: string }
    title: string
    slug: string
    releaseDate: string
    showInFullPage: boolean
    externalLink: string | null
    doubleWidthImage: {
        url: string
        width: number
        height: number
        title: string
    } | null
}

export interface NextDataPage {
    props: {
        pageProps: {
            page: {
                layoutCollection: {
                    items: Array<{
                        newsArticlesCollection?: {
                            total: number
                            items: NextDataArticle[]
                        }
                    }>
                }
            }
        }
    }
}

export interface ContentfulTextNode {
    nodeType: "text"
    value: string
    marks?: Array<{ type: string }>
}

export interface ContentfulHyperlinkNode {
    nodeType: "hyperlink"
    data: { uri: string }
    content: ContentfulRichTextNode[]
}

export interface ContentfulAssetBlockNode {
    nodeType: "embedded-asset-block"
    data: {
        target?: {
            sys?: { id: string }
        }
    }
}

export interface ContentfulEntryBlockNode {
    nodeType: "embedded-entry-block"
    data: {
        target?: {
            sys?: { id: string }
        }
    }
}

export interface ContentfulGenericContainerNode {
    nodeType:
        | "document"
        | "paragraph"
        | "heading-1"
        | "heading-2"
        | "heading-3"
        | "heading-4"
        | "heading-5"
        | "heading-6"
        | "unordered-list"
        | "ordered-list"
        | "list-item"
        | "blockquote"
        | "hr"
    content?: ContentfulRichTextNode[]
}

export type ContentfulRichTextNode =
    | ContentfulTextNode
    | ContentfulHyperlinkNode
    | ContentfulAssetBlockNode
    | ContentfulEntryBlockNode
    | ContentfulGenericContainerNode

export interface ContentfulAsset {
    __typename?: string
    sys: { id: string }
    url: string
    title?: string
    width?: number
    height?: number
}

export interface ContentfulRichTextLinks {
    assets?: {
        block?: ContentfulAsset[]
    }
    entries?: {
        block?: Array<{
            sys: { id: string }
            [key: string]: any
        }>
    }
}

export interface NextDataSingleArticlePage {
    props: {
        pageProps: {
            page?: {
                title: string
                slug: string
                releaseDate: string
                doubleWidthImage?: {
                    url: string
                } | null
                richText?: {
                    json: ContentfulRichTextNode
                    links?: ContentfulRichTextLinks
                }
            }
        }
    }
}
