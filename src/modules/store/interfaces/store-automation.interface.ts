import { PuppeteerClient, PuppeteerClientOptions } from "@xcrap/puppeteer-client"

export interface StoreCookie {
    name: string
    value: string
    domain?: string
    path?: string
    expires?: number
    size?: number
    httpOnly?: boolean
    secure?: boolean
    session?: boolean
    sameSite?: "Strict" | "Lax" | "None"
    url?: string
    [key: string]: any
}

export interface StoreJwtPayload {
    iss?: string
    iat?: number
    exp?: number
    sub?: string
    aud?: string
    [key: string]: any
}

export enum RedeemCodeErrorType {
    INVALID_CODE = "INVALID_CODE",
    ALREADY_REDEEMED = "ALREADY_REDEEMED",
    EXPIRED_OR_INELIGIBLE = "EXPIRED_OR_INELIGIBLE",
    WRONG_FORMAT = "WRONG_FORMAT",
    GENERAL_ERROR = "GENERAL_ERROR",
    UNKNOWN = "UNKNOWN",
}

export interface StoreCookiesChangeContext {
    changedCookieNames: string[]
    reason: "browser_sync" | "token_refresh" | "manual"
}

export type StoreCookiesChangeListener = (
    cookies: StoreCookie[],
    context: StoreCookiesChangeContext,
) => void | Promise<void>

export interface StoreAutomationOptions {
    cookies?: StoreCookie[] | string
    puppeteerClient?: PuppeteerClient
    puppeteerClientOptions?: PuppeteerClientOptions
    timeout?: number
    autoRefreshToken?: boolean
}

export interface StoreRedeemCodeOptions extends StoreAutomationOptions {}

export interface StoreClaimOptions extends StoreAutomationOptions {}

export interface StoreRedeemCodeResult {
    success: boolean
    code: string
    message?: string
    promotionId?: string
}

export interface StoreClaimResult {
    success: boolean
    alreadyClaimed: boolean
    rewardTitle?: string
    message?: string
}

export interface StoreRefreshTokenResult {
    success: boolean
    token: string
    cookies: StoreCookie[]
}
