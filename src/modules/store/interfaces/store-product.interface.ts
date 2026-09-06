import { FetchClient } from "@xcrap/core"
import { PuppeteerClient, PuppeteerClientOptions } from "@xcrap/puppeteer-client"

import { StoreCookie, StoreCookiesChangeListener } from "./store-automation.interface"

export interface StoreServiceOptions {
    baseUrl: string
    client: FetchClient
    cookies?: StoreCookie[] | string
    puppeteerClient?: PuppeteerClient
    puppeteerClientOptions?: PuppeteerClientOptions
    onCookiesChange?: StoreCookiesChangeListener
    autoRefreshToken?: boolean
}

export interface StoreProductDetail {
    name: string
    quantity: number | null
    description: string | null
    iconUrl: string | null
}

export interface StoreProduct {
    id: string
    title: string
    category: string | null
    skuId: string | null
    externalId: string | null
    originalPrice: number | null
    salePrice: number | null
    currency: string | null
    boxArtUrl: string | null
    purchasable: boolean
    items: StoreProductDetail[]
}
