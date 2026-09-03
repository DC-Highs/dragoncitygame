import { FetchClient } from "@xcrap/core"
import { regexHelper } from "../../shared/helpers/regex.helper"
import { StoreNextDataNotFoundError } from "./errors"
import { StoreProduct, StoreServiceOptions } from "./interfaces"

export class StoreService {
    readonly baseUrl: string
    readonly client: FetchClient

    constructor({ baseUrl, client }: StoreServiceOptions) {
        this.baseUrl = baseUrl
        this.client = client
    }

    async getProducts(): Promise<StoreProduct[]> {
        const response = await this.client.fetch({ url: this.baseUrl })
        const nextDataMatch = response.text.match(regexHelper.nextDataScriptRegex)

        if (!nextDataMatch) {
            throw new StoreNextDataNotFoundError()
        }

        const nextData = JSON.parse(nextDataMatch[1])
        const skusMap = nextData.props?.pageProps?.skus || {}
        const layoutItems = nextData.props?.pageProps?.page?.layoutCollection?.items || []

        const products: StoreProduct[] = []

        for (const layoutItem of layoutItems) {
            if (layoutItem.__typename === "LayoutListView" && layoutItem.itemsCollection?.items) {
                const categoryName = layoutItem.header?.text?.trim() || null

                for (const item of layoutItem.itemsCollection.items) {
                    const itemId = item.sys?.id
                    const skuVariants = skusMap[itemId] || []
                    const skuData = skuVariants[0] || null

                    products.push({
                        id: itemId,
                        title: item.title || "",
                        category: categoryName,
                        skuId: skuData?.skuId || null,
                        externalId: skuData?.externalId || item.product?.externalId || null,
                        originalPrice: skuData?.originalPrice ?? null,
                        salePrice: skuData?.salePrice ?? null,
                        currency: skuData?.currency || null,
                        boxArtUrl: skuData?.boxArt || item.boxart?.url || item.square?.url || null,
                        purchasable: skuData?.purchasable ?? true,
                        items: (item.mobileDetailsCollection?.items || []).map((detail: any) => ({
                            name: detail.staticDetailItem?.detailName || detail.detailName || "",
                            quantity: detail.quantity ?? null,
                            description: detail.staticDetailItem?.description || null,
                            iconUrl: detail.staticDetailItem?.art?.url || null,
                        })),
                    })
                }
            }
        }

        return products
    }
}
