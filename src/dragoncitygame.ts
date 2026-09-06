import { FetchClient } from "@xcrap/core"
import { PuppeteerClient, PuppeteerClientOptions } from "@xcrap/puppeteer-client"

import { NewsService } from "./modules/news/news.service"
import { StoreCookie, StoreCookiesChangeListener, StoreRefreshTokenResult } from "./modules/store/interfaces"
import { StoreService } from "./modules/store/store.service"
import { LanguagePrefix } from "./shared/enums/language-prefix.enum"
import { configHelper } from "./shared/helpers/config.helper"

export type DragonCityGameOptions = {
    languagePrefix: LanguagePrefix
    cookies?: StoreCookie[] | string
    puppeteerClient?: PuppeteerClient
    puppeteerClientOptions?: PuppeteerClientOptions
    onCookiesChange?: StoreCookiesChangeListener
    autoRefreshToken?: boolean
}

export class DragonCityGame {
    readonly news: NewsService
    readonly store: StoreService
    readonly baseUrl: string
    readonly client: FetchClient

    constructor({
        languagePrefix,
        cookies,
        puppeteerClient,
        puppeteerClientOptions,
        onCookiesChange,
        autoRefreshToken,
    }: DragonCityGameOptions) {
        this.baseUrl = configHelper.baseUrlTemplate.replace("{languagePrefix}", languagePrefix)
        this.client = new FetchClient()

        this.news = new NewsService({
            baseUrl: this.baseUrl,
            client: this.client,
        })

        this.store = new StoreService({
            baseUrl: this.baseUrl,
            client: this.client,
            cookies,
            puppeteerClient,
            puppeteerClientOptions,
            onCookiesChange,
            autoRefreshToken,
        })
    }

    get cookies(): StoreCookie[] {
        return this.store.cookies
    }

    onCookiesChange(listener: StoreCookiesChangeListener): () => void {
        return this.store.onCookiesChange(listener)
    }

    async refreshToken(options?: { cookies?: StoreCookie[] | string }): Promise<StoreRefreshTokenResult> {
        return this.store.refreshToken(options)
    }

    async close(): Promise<void> {
        await this.store.close()
    }
}
