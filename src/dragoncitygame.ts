import { FetchClient } from "@xcrap/core"

import { NewsService } from "./modules/news/news.service"
import { StoreService } from "./modules/store/store.service"
import { LanguagePrefix } from "./shared/enums/language-prefix.enum"
import { configHelper } from "./shared/helpers/config.helper"

export type DragonCityGameOptions = {
    languagePrefix: LanguagePrefix
}

export class DragonCityGame {
    readonly news: NewsService
    readonly store: StoreService
    readonly baseUrl: string
    readonly client: FetchClient

    constructor({ languagePrefix }: DragonCityGameOptions) {
        this.baseUrl = configHelper.baseUrlTemplate.replace("{languagePrefix}", languagePrefix)
        this.client = new FetchClient()

        this.news = new NewsService({
            baseUrl: this.baseUrl,
            client: this.client,
        })

        this.store = new StoreService({
            baseUrl: this.baseUrl,
            client: this.client,
        })
    }
}

