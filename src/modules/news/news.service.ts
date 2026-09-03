import { FetchClient } from "@xcrap/core"

import { configHelper } from "../../shared/helpers/config.helper"
import { richTextToMarkdown } from "../../shared/helpers/markdown.helper"
import { regexHelper } from "../../shared/helpers/regex.helper"
import {
    ArticleNotFoundError,
    NewsArticlesCollectionNotFoundError,
    NextDataScriptNotFoundError,
    UpcomingEventsArticleNotFoundError,
} from "./errors"
import {
    Article,
    ArticlePreview,
    GetManyArticlesOptions,
    NewsServiceOptions,
    NextDataPage,
    NextDataSingleArticlePage,
    PaginatedArticlesResult,
} from "./interfaces"

export class NewsService {
    readonly baseUrl: string
    readonly client: FetchClient

    constructor({ baseUrl, client }: NewsServiceOptions) {
        this.baseUrl = baseUrl
        this.client = client
    }

    async getManyArticles({ page = 1 }: GetManyArticlesOptions = { page: 1 }): Promise<PaginatedArticlesResult> {
        const searchParams = new URLSearchParams()
        searchParams.set("page", String(page))

        const pageUrl = `${this.baseUrl}/dragon-city-news?${searchParams.toString()}`

        const response = await this.client.fetch({ url: pageUrl })
        const parser = response.asHtmlParser()
        const nextDataMatch = parser.source.match(regexHelper.nextDataScriptRegex)

        if (!nextDataMatch) {
            throw new NextDataScriptNotFoundError()
        }

        const nextData: NextDataPage = JSON.parse(nextDataMatch[1])

        const contentsItems = nextData.props.pageProps.page.layoutCollection.items

        const newsCollection = contentsItems.find((item) => item.newsArticlesCollection)?.newsArticlesCollection

        if (!newsCollection) {
            throw new NewsArticlesCollectionNotFoundError()
        }

        const totalArticles = newsCollection.total
        const limitPerPage = newsCollection.items.length || 1
        const totalPages = Math.ceil(totalArticles / limitPerPage)
        const currentPage = page
        const previousPage = currentPage > 1 ? currentPage - 1 : null
        const nextPage = currentPage < totalPages ? currentPage + 1 : null

        const articles = newsCollection.items.map((article): ArticlePreview => ({
            slug: article.slug,
            createdAt: article.releaseDate,
            title: article.title,
            thumbnailUrl: article.doubleWidthImage?.url ?? "",
        }))

        return {
            meta: {
                total: totalArticles,
                lastPage: totalPages,
                currentPage: currentPage,
                prevPage: previousPage,
                nextPage: nextPage,
            },
            data: articles,
        }
    }

    async getOneArticle(slug: string): Promise<Article> {
        const pageUrl = `${this.baseUrl}/news/${slug}`

        const response = await this.client.fetch({ url: pageUrl })
        const parser = response.asHtmlParser()
        const nextDataMatch = parser.source.match(regexHelper.nextDataScriptRegex)

        if (!nextDataMatch) {
            throw new NextDataScriptNotFoundError()
        }

        const nextData: NextDataSingleArticlePage = JSON.parse(nextDataMatch[1])
        const pageData = nextData.props.pageProps.page

        if (!pageData) {
            throw new ArticleNotFoundError(slug)
        }

        const bodyMarkdown = pageData.richText
            ? richTextToMarkdown(pageData.richText.json, pageData.richText.links)
            : ""

        return {
            slug: pageData.slug,
            createdAt: pageData.releaseDate,
            title: pageData.title,
            thumbnailUrl: pageData.doubleWidthImage?.url ?? "",
            body: bodyMarkdown,
        }
    }

    async getLastUpcomingEventsArticle(): Promise<ArticlePreview> {
        let currentPage = 1
        let hasNextPage = true

        while (hasNextPage) {
            const { meta, data: articles } = await this.getManyArticles({ page: currentPage })

            const upcomingEventsArticle = articles.find((article) => {
                const normalizedTitle = article.title.trim().toUpperCase()
                return configHelper.upcomingEventsTitlePrefixes.some((prefix) =>
                    normalizedTitle.startsWith(prefix.toUpperCase()),
                )
            })

            if (upcomingEventsArticle) {
                return await this.getOneArticle(upcomingEventsArticle.slug)
            }

            if (meta.nextPage) {
                currentPage = meta.nextPage
            } else {
                hasNextPage = false
            }
        }

        throw new UpcomingEventsArticleNotFoundError()
    }
}
