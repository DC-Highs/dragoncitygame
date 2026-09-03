import { FetchClient } from "@xcrap/core"

export interface StoreServiceOptions {
    baseUrl: string
    client: FetchClient
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
