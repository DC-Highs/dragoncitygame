import { FetchClient } from "@xcrap/core"

export interface NewsServiceOptions {
    baseUrl: string
    client: FetchClient
}

export interface GetManyArticlesOptions {
    page?: number
}
