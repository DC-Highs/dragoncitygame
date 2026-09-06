import { FetchClient } from "@xcrap/core"
import { PuppeteerClient, PuppeteerClientOptions } from "@xcrap/puppeteer-client"

import { messagesHelper } from "../../shared/helpers/messages.helper"
import { regexHelper } from "../../shared/helpers/regex.helper"
import {
    StoreAuthenticationError,
    StoreInvalidTokenError,
    StoreNextDataNotFoundError,
    StoreRedeemCodeError,
    StoreTokenExpiredError,
    StoreTokenMissingError,
} from "./errors"
import {
    RedeemCodeErrorType,
    StoreAutomationOptions,
    StoreClaimOptions,
    StoreClaimResult,
    StoreCookie,
    StoreCookiesChangeListener,
    StoreJwtPayload,
    StoreProduct,
    StoreRedeemCodeOptions,
    StoreRedeemCodeResult,
    StoreRefreshTokenResult,
    StoreServiceOptions,
} from "./interfaces"

export class StoreService {
    readonly baseUrl: string
    readonly client: FetchClient
    readonly puppeteerClientOptions?: PuppeteerClientOptions
    readonly autoRefreshToken: boolean

    private currentCookies: StoreCookie[] = []
    private cookiesChangeListeners = new Set<StoreCookiesChangeListener>()
    private internalPuppeteerClient?: PuppeteerClient

    constructor({
        baseUrl,
        client,
        cookies,
        puppeteerClient,
        puppeteerClientOptions,
        onCookiesChange,
        autoRefreshToken = true,
    }: StoreServiceOptions) {
        this.baseUrl = baseUrl
        this.client = client
        this.internalPuppeteerClient = puppeteerClient
        this.puppeteerClientOptions = puppeteerClientOptions
        this.autoRefreshToken = autoRefreshToken

        if (cookies) {
            this.currentCookies = this.parseCookies(cookies)
        }

        if (onCookiesChange) {
            this.cookiesChangeListeners.add(onCookiesChange)
        }
    }

    /**
     * Current cookies stored in this service instance.
     */
    get cookies(): StoreCookie[] {
        return [...this.currentCookies]
    }

    /**
     * Subscribes a listener to cookie changes (Observer pattern).
     * Returns an unsubscribe function.
     */
    onCookiesChange(listener: StoreCookiesChangeListener): () => void {
        this.cookiesChangeListeners.add(listener)
        return () => {
            this.cookiesChangeListeners.delete(listener)
        }
    }

    /**
     * Notifies all registered listeners that cookies have changed.
     */
    private notifyCookiesChange(
        changedCookieNames: string[],
        reason: "browser_sync" | "token_refresh" | "manual",
    ): void {
        const snapshot = [...this.currentCookies]
        const context = { changedCookieNames, reason }
        for (const listener of this.cookiesChangeListeners) {
            try {
                listener(snapshot, context)
            } catch (err) {
                console.error("Error in onCookiesChange listener:", err)
            }
        }
    }

    /**
     * Synchronizes incoming cookies and notifies observers if any cookie value changed or was added.
     */
    syncCookies(
        incomingCookies: StoreCookie[] | string,
        reason: "browser_sync" | "token_refresh" | "manual" = "manual",
        forceNotify = false,
    ): boolean {
        const parsed = this.parseCookies(incomingCookies)
        if (!parsed.length) return false

        const currentMap = new Map<string, StoreCookie>()
        for (const c of this.currentCookies) {
            currentMap.set(c.name, c)
        }

        const changedNames: string[] = []

        for (const incoming of parsed) {
            const existing = currentMap.get(incoming.name)
            if (!existing || existing.value !== incoming.value) {
                changedNames.push(incoming.name)
                currentMap.set(incoming.name, { ...existing, ...incoming })
            }
        }

        if (changedNames.length > 0 || forceNotify) {
            this.currentCookies = Array.from(currentMap.values())
            this.notifyCookiesChange(changedNames.length ? changedNames : ["__Host-AccessToken"], reason)
            return true
        }

        return false
    }

    /**
     * Refreshes the authentication token using Dragon City's /api/refreshtoken endpoint.
     * Updates internal cookies and notifies observers when the token changes.
     */
    async refreshToken(options?: { cookies?: StoreCookie[] | string }): Promise<StoreRefreshTokenResult> {
        const cookiesToUse = options?.cookies ? this.parseCookies(options.cookies) : this.currentCookies
        if (!cookiesToUse.length) {
            throw new StoreTokenMissingError("__Host-AccessToken")
        }

        const cookieHeader = cookiesToUse.map((c) => `${c.name}=${c.value}`).join("; ")
        const urlObj = new URL(this.baseUrl)
        const refreshUrl = `${urlObj.origin}/api/refreshtoken`

        const response = await fetch(refreshUrl, {
            method: "GET",
            headers: {
                cookie: cookieHeader,
                accept: "application/json",
                referer: this.baseUrl,
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            },
        })

        if (!response.ok) {
            throw new StoreAuthenticationError(messagesHelper.errors.tokenRefreshFailed)
        }

        const data = (await response.json()) as { accessToken?: string }
        if (!data || !data.accessToken) {
            throw new StoreInvalidTokenError("Refresh endpoint did not return an accessToken.")
        }

        const updatedCookies = [...cookiesToUse]
        const tokenIndex = updatedCookies.findIndex((c) => c.name === "__Host-AccessToken")
        if (tokenIndex !== -1) {
            updatedCookies[tokenIndex] = { ...updatedCookies[tokenIndex], value: data.accessToken }
        } else {
            updatedCookies.push({
                name: "__Host-AccessToken",
                value: data.accessToken,
                path: "/",
                secure: true,
            })
        }

        this.syncCookies(updatedCookies, "token_refresh", true)

        return {
            success: true,
            token: data.accessToken,
            cookies: this.cookies,
        }
    }

    /**
     * Validates that essential authentication tokens (specifically the __Host-AccessToken JWT)
     * are present, well-formed, not expired, and have valid payload claims.
     */
    private validateTokens(cookies?: StoreCookie[] | string): {
        token: string
        payload: StoreJwtPayload
    } {
        const parsedCookies = this.parseCookies(cookies ?? this.currentCookies)
        const tokenCookie = parsedCookies.find((c) => c.name === "__Host-AccessToken")

        if (!tokenCookie || !tokenCookie.value) {
            throw new StoreTokenMissingError("__Host-AccessToken")
        }

        const rawToken = tokenCookie.value.trim()
        const cleanJwt = rawToken.replace(/^JWT\./i, "")
        const parts = cleanJwt.split(".")

        if (parts.length !== 3) {
            throw new StoreInvalidTokenError(messagesHelper.errors.tokenMalformedJwt)
        }

        let payload: StoreJwtPayload
        try {
            const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
            const decoded = Buffer.from(base64Payload, "base64").toString("utf-8")
            payload = JSON.parse(decoded)
        } catch {
            throw new StoreInvalidTokenError(messagesHelper.errors.tokenPayloadJsonError)
        }

        if (typeof payload.exp === "number") {
            const expDate = new Date(payload.exp * 1000)
            if (Date.now() >= expDate.getTime()) {
                throw new StoreTokenExpiredError(expDate)
            }
        }

        if (!payload.sub && !payload.iss) {
            throw new StoreInvalidTokenError(messagesHelper.errors.tokenMissingClaims)
        }

        return { token: tokenCookie.value, payload }
    }

    /**
     * Asynchronously ensures the token is valid, attempting an automatic refresh
     * if the token has expired or is within 60 seconds of expiring.
     */
    private async ensureValidTokens(
        cookies?: StoreCookie[] | string,
        autoRefresh = true,
    ): Promise<{ token: string; payload: StoreJwtPayload }> {
        const parsed = this.parseCookies(cookies ?? this.currentCookies)
        const tokenCookie = parsed.find((c) => c.name === "__Host-AccessToken")

        if (!tokenCookie || !tokenCookie.value) {
            throw new StoreTokenMissingError("__Host-AccessToken")
        }

        let isExpiredOrNear = false
        try {
            const rawToken = tokenCookie.value.trim().replace(/^JWT\./i, "")
            const parts = rawToken.split(".")
            if (parts.length === 3) {
                const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
                const decoded = Buffer.from(base64Payload, "base64").toString("utf-8")
                const payload = JSON.parse(decoded)
                if (typeof payload.exp === "number") {
                    const expMs = payload.exp * 1000
                    if (Date.now() >= expMs - 60000) {
                        isExpiredOrNear = true
                    }
                }
            }
        } catch {
            // let validateTokens handle invalid format
        }

        if (isExpiredOrNear && autoRefresh && this.autoRefreshToken) {
            try {
                await this.refreshToken({ cookies: parsed })
            } catch {
                // fall through to validateTokens which throws StoreTokenExpiredError
            }
        }

        return this.validateTokens(cookies ?? this.currentCookies)
    }

    /**
     * Parses cookies into an array of StoreCookie objects.
     */
    private parseCookies(cookies?: StoreCookie[] | string): StoreCookie[] {
        if (!cookies) return []
        if (Array.isArray(cookies)) return [...cookies]
        if (typeof cookies === "string") {
            return cookies
                .split(";")
                .map((part) => {
                    const [name, ...val] = part.trim().split("=")
                    return { name, value: val.join("=") }
                })
                .filter((c) => Boolean(c.name))
        }
        return []
    }

    /**
     * Sanitizes cookie objects for Puppeteer / CDP.
     * RFC 6265bis forbids domain attributes on cookies starting with __Host-.
     */
    private normalizeCookies(cookies: StoreCookie[], targetUrl: string): StoreCookie[] {
        return cookies.map((c) => {
            const copy = { ...c }
            if (copy.name.startsWith("__Host-")) {
                delete copy.domain
                copy.url = targetUrl
                copy.secure = true
                copy.path = "/"
            }
            return copy
        })
    }

    /**
     * Normalizes error messages across multiple languages and Take2Games API response statuses.
     */
    private normalizeRedeemError(
        rawText: string | null,
        apiStatus?: number | null,
        apiData?: any,
    ): { errorType: RedeemCodeErrorType; normalizedMessage: string; rawMessage: string } {
        const text = (rawText || "").trim()

        if (apiStatus === 404) {
            return {
                errorType: RedeemCodeErrorType.INVALID_CODE,
                normalizedMessage: messagesHelper.errors.redeem.invalidCode,
                rawMessage: text || "404 Not Found",
            }
        }

        if (apiData && typeof apiData === "object") {
            if (apiData.redeemed === true) {
                return {
                    errorType: RedeemCodeErrorType.ALREADY_REDEEMED,
                    normalizedMessage: messagesHelper.errors.redeem.alreadyRedeemed,
                    rawMessage: text || "Code already redeemed",
                }
            }
            if (apiData.eligible === false) {
                return {
                    errorType: RedeemCodeErrorType.EXPIRED_OR_INELIGIBLE,
                    normalizedMessage: messagesHelper.errors.redeem.expiredOrIneligible,
                    rawMessage: text || "Code not eligible or expired",
                }
            }
        }

        const lower = text.toLowerCase()

        if (regexHelper.redeemErrors.alreadyRedeemed.test(lower)) {
            return {
                errorType: RedeemCodeErrorType.ALREADY_REDEEMED,
                normalizedMessage: messagesHelper.errors.redeem.alreadyRedeemed,
                rawMessage: text,
            }
        }

        if (regexHelper.redeemErrors.wrongFormat.test(lower)) {
            return {
                errorType: RedeemCodeErrorType.WRONG_FORMAT,
                normalizedMessage: messagesHelper.errors.redeem.wrongFormat,
                rawMessage: text,
            }
        }

        if (regexHelper.redeemErrors.expiredOrIneligible.test(lower)) {
            return {
                errorType: RedeemCodeErrorType.EXPIRED_OR_INELIGIBLE,
                normalizedMessage: messagesHelper.errors.redeem.expiredOrIneligible,
                rawMessage: text,
            }
        }

        if (regexHelper.redeemErrors.invalidCode.test(lower)) {
            return {
                errorType: RedeemCodeErrorType.INVALID_CODE,
                normalizedMessage: messagesHelper.errors.redeem.invalidCode,
                rawMessage: text,
            }
        }

        if (regexHelper.redeemErrors.generalError.test(lower)) {
            return {
                errorType: RedeemCodeErrorType.GENERAL_ERROR,
                normalizedMessage: messagesHelper.errors.redeem.generalError,
                rawMessage: text,
            }
        }

        return {
            errorType: RedeemCodeErrorType.UNKNOWN,
            normalizedMessage: text || messagesHelper.errors.redeem.unknownError,
            rawMessage: text || "Unknown error",
        }
    }

    /**
     * Resolves the PuppeteerClient instance to use for automation.
     */
    private getPuppeteerClient(options?: StoreAutomationOptions): {
        client: PuppeteerClient
        shouldClose: boolean
    } {
        if (options?.puppeteerClient) {
            return { client: options.puppeteerClient, shouldClose: false }
        }
        if (this.internalPuppeteerClient) {
            return { client: this.internalPuppeteerClient, shouldClose: false }
        }

        const client = new PuppeteerClient(
            options?.puppeteerClientOptions ??
                this.puppeteerClientOptions ?? {
                    headless: true,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                },
        )
        return { client, shouldClose: true }
    }

    /**
     * Redeems a promo code on the Dragon City Web Store.
     * Throws StoreRedeemCodeError if the code is invalid, already used, or expired.
     */
    async redeemCode(code: string, options?: StoreRedeemCodeOptions): Promise<StoreRedeemCodeResult> {
        await this.ensureValidTokens(options?.cookies, options?.autoRefreshToken ?? this.autoRefreshToken)
        const parsedCookies = this.parseCookies(options?.cookies ?? this.currentCookies)
        const cleanCookies = this.normalizeCookies(parsedCookies, this.baseUrl)

        const { client, shouldClose } = this.getPuppeteerClient(options)
        const timeout = options?.timeout ?? 20000

        try {
            let apiStatus: number | null = null
            let apiData: any = null
            let domError: string | null = null
            let isRedeemed = false
            let promotionId: string | undefined = undefined

            await client.fetch({
                url: `${this.baseUrl}/redeem`,
                actions: [
                    {
                        type: "beforeRequest",
                        exec: async (page) => {
                            await page.setViewport({ width: 1280, height: 800 })
                            await page.setCookie(...(cleanCookies as any[]))
                        },
                    },
                    {
                        type: "afterRequest",
                        exec: async (page) => {
                            page.on("response", async (res) => {
                                const url = res.url()
                                if (url.includes("/offer/eligible/") || url.includes("/offer/redeem/")) {
                                    apiStatus = res.status()
                                    try {
                                        apiData = await res.json()
                                    } catch {
                                        try {
                                            apiData = await res.text()
                                        } catch {
                                            // ignore
                                        }
                                    }
                                }
                            })

                            // Wait for hydration and code input
                            await page.waitForFunction(() => document.querySelectorAll("input").length > 0, { timeout })

                            const codeInput = await page.waitForSelector(
                                'input[placeholder*="código"], input[placeholder*="code"], input[id="Código do presente"], input:not([id*="handler"])',
                                { timeout: 10000 },
                            )

                            if (!codeInput) {
                                throw new Error(messagesHelper.errors.redemptionInputNotFound)
                            }

                            await codeInput.click()
                            await page.keyboard.type(code)

                            // Find and click redeem button
                            const buttons = await page.evaluate(() => {
                                return Array.from(document.querySelectorAll("button")).map((b, i) => ({
                                    index: i,
                                    text: b.innerText.trim(),
                                    type: b.type,
                                    disabled: b.disabled,
                                    className: b.className,
                                }))
                            })

                            const redeemBtn = buttons.find(
                                (b) =>
                                    !b.disabled &&
                                    (b.text.toUpperCase() === "RESGATAR" ||
                                        b.text.toUpperCase() === "REDEEM" ||
                                        b.text.toUpperCase() === "CANJEAR" ||
                                        b.className.includes("btn-primary") ||
                                        b.className.includes("bg-primary")),
                            )

                            if (redeemBtn) {
                                const btnElements = await page.$$("button")
                                await btnElements[redeemBtn.index].click()
                            } else {
                                const submitBtn = await page.$('main button[type="submit"], form button[type="submit"]')
                                if (submitBtn) await submitBtn.click()
                            }

                            // Wait for network response or DOM error
                            await new Promise((r) => setTimeout(r, 4500))

                            domError = await page.evaluate(() => {
                                const all = Array.from(document.querySelectorAll("*"))
                                const el = all.find(
                                    (e) =>
                                        e.children.length === 0 &&
                                        (e as HTMLElement).innerText &&
                                        ((e as HTMLElement).innerText.includes("Código inválido") ||
                                            (e as HTMLElement).innerText.includes("código") ||
                                            (e as HTMLElement).innerText.includes("invalid") ||
                                            (e as HTMLElement).innerText.includes("resgatado") ||
                                            (e as HTMLElement).innerText.includes("redeemed")),
                                )
                                return el ? (el as HTMLElement).innerText.trim() : null
                            })

                            if (apiStatus === 200 && apiData && apiData.eligible && !apiData.redeemed) {
                                isRedeemed = true
                                promotionId = apiData.promotionId
                            }

                            // Sync any updated cookies from browser
                            try {
                                const latestCookies = await page.cookies()
                                this.syncCookies(latestCookies as StoreCookie[], "browser_sync")
                            } catch {
                                // ignore
                            }
                        },
                    },
                ],
            })

            // Check if there was an error
            if (apiStatus === 404 || domError || (apiData && (apiData.redeemed || !apiData.eligible))) {
                const normalized = this.normalizeRedeemError(domError, apiStatus, apiData)
                throw new StoreRedeemCodeError({
                    code,
                    errorType: normalized.errorType,
                    rawMessage: normalized.rawMessage,
                    normalizedMessage: normalized.normalizedMessage,
                })
            }

            return {
                success: true,
                code,
                promotionId,
                message: messagesHelper.store.redeemSuccess,
            }
        } finally {
            if (shouldClose) {
                await client.close()
            }
        }
    }

    /**
     * Claims the free daily gift on the Dragon City Web Store.
     */
    async claimDailyGift(options?: StoreClaimOptions): Promise<StoreClaimResult> {
        await this.ensureValidTokens(options?.cookies, options?.autoRefreshToken ?? this.autoRefreshToken)
        const parsedCookies = this.parseCookies(options?.cookies ?? this.currentCookies)
        const cleanCookies = this.normalizeCookies(parsedCookies, this.baseUrl)

        const { client, shouldClose } = this.getPuppeteerClient(options)
        const timeout = options?.timeout ?? 20000

        try {
            let alreadyClaimed = false
            let claimed = false
            let rewardTitle: string | undefined = undefined

            await client.fetch({
                url: this.baseUrl,
                actions: [
                    {
                        type: "beforeRequest",
                        exec: async (page) => {
                            await page.setViewport({ width: 1280, height: 800 })
                            await page.setCookie(...(cleanCookies as any[]))
                        },
                    },
                    {
                        type: "afterRequest",
                        exec: async (page) => {
                            await page.waitForFunction(() => document.querySelectorAll("button").length > 0, {
                                timeout,
                            })

                            const giftInfo = await page.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll("button")).map((b, i) => ({
                                    index: i,
                                    text: b.innerText.trim(),
                                    disabled: b.disabled,
                                    className: b.className,
                                }))

                                const claimBtn = buttons.find(
                                    (b) => !b.disabled && /(presente|gift|gr[áa]tis|free)/i.test(b.text),
                                )

                                return { claimBtn }
                            })

                            if (giftInfo.claimBtn) {
                                const btnElements = await page.$$("button")
                                await btnElements[giftInfo.claimBtn.index].click()
                                await new Promise((r) => setTimeout(r, 3000))
                                claimed = true
                                rewardTitle = "Presente Diário"
                            } else {
                                alreadyClaimed = true
                            }

                            // Sync any updated cookies from browser
                            try {
                                const latestCookies = await page.cookies()
                                this.syncCookies(latestCookies as StoreCookie[], "browser_sync")
                            } catch {
                                // ignore
                            }
                        },
                    },
                ],
            })

            return {
                success: claimed,
                alreadyClaimed,
                rewardTitle,
                message: claimed
                    ? messagesHelper.store.claimDailyGiftSuccess
                    : messagesHelper.store.claimDailyGiftAlreadyClaimed,
            }
        } finally {
            if (shouldClose) {
                await client.close()
            }
        }
    }

    /**
     * Claims the daily streak reward on the Dragon City Web Store.
     */
    async claimDailyStreak(options?: StoreClaimOptions): Promise<StoreClaimResult> {
        await this.ensureValidTokens(options?.cookies, options?.autoRefreshToken ?? this.autoRefreshToken)
        const parsedCookies = this.parseCookies(options?.cookies ?? this.currentCookies)
        const cleanCookies = this.normalizeCookies(parsedCookies, this.baseUrl)

        const { client, shouldClose } = this.getPuppeteerClient(options)
        const timeout = options?.timeout ?? 20000

        try {
            let alreadyClaimed = false
            let claimed = false
            let rewardTitle: string | undefined = undefined

            await client.fetch({
                url: `${this.baseUrl}/dragon-city-daily-streak`,
                actions: [
                    {
                        type: "beforeRequest",
                        exec: async (page) => {
                            await page.setViewport({ width: 1280, height: 800 })
                            await page.setCookie(...(cleanCookies as any[]))
                        },
                    },
                    {
                        type: "afterRequest",
                        exec: async (page) => {
                            await page.waitForFunction(() => document.querySelectorAll("button").length > 0, {
                                timeout,
                            })

                            const streakInfo = await page.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll("button")).map((b, i) => ({
                                    index: i,
                                    text: b.innerText.trim(),
                                    disabled: b.disabled,
                                    className: b.className,
                                }))

                                const claimBtn = buttons.find(
                                    (b) => !b.disabled && /^(obter|claim|obtener|r[ée]clamer)$/i.test(b.text),
                                )

                                return { claimBtn }
                            })

                            if (streakInfo.claimBtn) {
                                const btnElements = await page.$$("button")
                                await btnElements[streakInfo.claimBtn.index].click()
                                await new Promise((r) => setTimeout(r, 3000))
                                claimed = true
                                rewardTitle = "Recompensa da Sequência Diária"
                            } else {
                                alreadyClaimed = true
                            }

                            // Sync any updated cookies from browser
                            try {
                                const latestCookies = await page.cookies()
                                this.syncCookies(latestCookies as StoreCookie[], "browser_sync")
                            } catch {
                                // ignore
                            }
                        },
                    },
                ],
            })

            return {
                success: claimed,
                alreadyClaimed,
                rewardTitle,
                message: claimed
                    ? messagesHelper.store.claimDailyStreakSuccess
                    : messagesHelper.store.claimDailyStreakAlreadyClaimed,
            }
        } finally {
            if (shouldClose) {
                await client.close()
            }
        }
    }

    /**
     * Closes any internal Puppeteer client if opened.
     */
    async close(): Promise<void> {
        if (this.internalPuppeteerClient) {
            await this.internalPuppeteerClient.close()
            this.internalPuppeteerClient = undefined
        }
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
