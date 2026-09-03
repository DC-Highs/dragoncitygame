import { ArticlePreview } from "./article-preview.interface"

export interface ArticlesPaginationMeta {
    total: number
    lastPage: number
    currentPage: number
    prevPage: number | null
    nextPage: number | null
}

export interface PaginatedArticlesResult {
    meta: ArticlesPaginationMeta
    data: ArticlePreview[]
}
