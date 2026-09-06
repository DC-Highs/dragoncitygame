import fs from "fs"
import path from "path"
import { FetchClient } from "@xcrap/core"
import { describe, expect, it } from "vitest"

import {
    DragonCityGame,
    LanguagePrefix,
    RedeemCodeErrorType,
    StoreInvalidTokenError,
    StoreRedeemCodeError,
    StoreService,
    StoreTokenExpiredError,
    StoreTokenMissingError,
} from "../src/index"

describe("StoreService - Automation & Token Validation", () => {
    const baseUrl = "https://www.dragoncitygame.com/pt-BR"
    const client = new FetchClient()

    // Helper to generate a dummy JWT token
    const createDummyJwt = ({
        sub = "5006138:123456",
        iss = "5006138",
        exp = Math.floor(Date.now() / 1000) + 3600,
    }: {
        sub?: string
        iss?: string
        exp?: number
    } = {}) => {
        const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: "1" })).toString("base64")
        const payload = Buffer.from(JSON.stringify({ iss, sub, exp, aud: "63" })).toString("base64")
        const signature = "fake_signature"
        return `JWT.${header}.${payload}.${signature}`
    }

    describe("Token Validation (private validateTokens)", () => {
        it("should throw StoreTokenMissingError when cookies are empty or missing", () => {
            const store = new StoreService({ baseUrl, client })
            expect(() => (store as any).validateTokens()).toThrow(StoreTokenMissingError)
            expect(() => (store as any).validateTokens([])).toThrow(StoreTokenMissingError)
            expect(() => (store as any).validateTokens("")).toThrow(StoreTokenMissingError)
        })

        it("should throw StoreTokenMissingError when __Host-AccessToken is absent", () => {
            const store = new StoreService({ baseUrl, client })
            expect(() =>
                (store as any).validateTokens([{ name: "other_cookie", value: "123" }])
            ).toThrow(StoreTokenMissingError)
        })

        it("should throw StoreInvalidTokenError when token is malformed", () => {
            const store = new StoreService({ baseUrl, client })
            const cookies = [{ name: "__Host-AccessToken", value: "invalid-token" }]
            expect(() => (store as any).validateTokens(cookies)).toThrow(StoreInvalidTokenError)
        })

        it("should throw StoreInvalidTokenError when JWT payload cannot be parsed", () => {
            const store = new StoreService({ baseUrl, client })
            const cookies = [{ name: "__Host-AccessToken", value: "h.not_json_payload.s" }]
            expect(() => (store as any).validateTokens(cookies)).toThrow(StoreInvalidTokenError)
        })

        it("should throw StoreTokenExpiredError when JWT exp timestamp is in the past", () => {
            const store = new StoreService({ baseUrl, client })
            const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
            const expiredJwt = createDummyJwt({ exp: pastExp })
            const cookies = [{ name: "__Host-AccessToken", value: expiredJwt }]

            expect(() => (store as any).validateTokens(cookies)).toThrow(StoreTokenExpiredError)
        })

        it("should successfully validate and decode a valid JWT token", () => {
            const store = new StoreService({ baseUrl, client })
            const validJwt = createDummyJwt({ sub: "5006138:999888", iss: "5006138" })
            const cookies = [{ name: "__Host-AccessToken", value: validJwt }]

            const result = (store as any).validateTokens(cookies)
            expect(result).toBeDefined()
            expect(result.token).toBe(validJwt)
            expect(result.payload.sub).toBe("5006138:999888")
            expect(result.payload.iss).toBe("5006138")
        })

        it("should support raw cookie header strings", () => {
            const store = new StoreService({ baseUrl, client })
            const validJwt = createDummyJwt()
            const cookieString = `_ga=12345; __Host-AccessToken=${validJwt}; other=val`

            const result = (store as any).validateTokens(cookieString)
            expect(result).toBeDefined()
            expect(result.token).toBe(validJwt)
        })
    })

    describe("Cookie Normalization (private normalizeCookies)", () => {
        it("should remove domain and enforce secure and url on __Host- cookies", () => {
            const store = new StoreService({ baseUrl, client })
            const rawCookies = [
                {
                    name: "__Host-AccessToken",
                    value: "token_value",
                    domain: "www.dragoncitygame.com",
                    path: "/",
                },
                {
                    name: "regular_cookie",
                    value: "123",
                    domain: "www.dragoncitygame.com",
                    path: "/",
                },
            ]

            const normalized = (store as any).normalizeCookies(rawCookies, baseUrl)

            const hostCookie = normalized.find((c: any) => c.name === "__Host-AccessToken")
            expect(hostCookie.domain).toBeUndefined()
            expect(hostCookie.secure).toBe(true)
            expect(hostCookie.url).toBe(baseUrl)
            expect(hostCookie.path).toBe("/")

            const regularCookie = normalized.find((c: any) => c.name === "regular_cookie")
            expect(regularCookie.domain).toBe("www.dragoncitygame.com")
        })
    })

    describe("Error Normalization (private normalizeRedeemError)", () => {
        const store = new StoreService({ baseUrl, client })

        it("should normalize API status 404 to INVALID_CODE", () => {
            const result = (store as any).normalizeRedeemError("Not Found", 404)
            expect(result.errorType).toBe(RedeemCodeErrorType.INVALID_CODE)
            expect(result.normalizedMessage).toContain("Código inválido")
        })

        it("should normalize API response with redeemed: true to ALREADY_REDEEMED", () => {
            const result = (store as any).normalizeRedeemError(null, 200, { redeemed: true })
            expect(result.errorType).toBe(RedeemCodeErrorType.ALREADY_REDEEMED)
            expect(result.normalizedMessage).toContain("já foi resgatado")
        })

        it("should normalize API response with eligible: false to EXPIRED_OR_INELIGIBLE", () => {
            const result = (store as any).normalizeRedeemError(null, 200, {
                eligible: false,
                redeemed: false,
            })
            expect(result.errorType).toBe(RedeemCodeErrorType.EXPIRED_OR_INELIGIBLE)
        })

        it("should normalize multilingual DOM error messages", () => {
            const testCases = [
                {
                    text: "Código inválido. Tente novamente com um código válido.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "Invalid code. Please try again with a valid code.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "Código no válido. Vuelve a intentarlo con un código válido.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "Ungültiger Code. Bitte versuche es noch einmal mit einem gültigen Code.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "Code invalide. Veuillez réessayer avec un code valide.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "Geçersiz kod. Lütfen geçerli bir kodla tekrar deneyin.",
                    expected: RedeemCodeErrorType.INVALID_CODE,
                },
                {
                    text: "O código já foi resgatado. Tente usar outro código.",
                    expected: RedeemCodeErrorType.ALREADY_REDEEMED,
                },
                {
                    text: "This code has already been redeemed. Please try another code.",
                    expected: RedeemCodeErrorType.ALREADY_REDEEMED,
                },
                {
                    text: "O código é inválido ou está no formato errado. Tente inserir o código novamente.",
                    expected: RedeemCodeErrorType.WRONG_FORMAT,
                },
                {
                    text: "The code is invalid or in the wrong format. Please try entering the code again.",
                    expected: RedeemCodeErrorType.WRONG_FORMAT,
                },
                {
                    text: "Código expirado",
                    expected: RedeemCodeErrorType.EXPIRED_OR_INELIGIBLE,
                },
            ]

            for (const { text, expected } of testCases) {
                const result = (store as any).normalizeRedeemError(text)
                expect(result.errorType).toBe(expected)
            }
        })
    })

    describe("Cookies Observer Pattern (onCookiesChange & syncCookies)", () => {
        it("should notify registered listeners when a cookie value changes", () => {
            const initialCookies = [
                { name: "__Host-AccessToken", value: "old_token" },
                { name: "_ga", value: "GA1.1" },
            ]
            const store = new StoreService({ baseUrl, client, cookies: initialCookies })

            const changes: any[] = []
            const unsubscribe = store.onCookiesChange((cookies, context) => {
                changes.push({ cookies, context })
            })

            // Sync with a changed token
            const changed = store.syncCookies(
                [{ name: "__Host-AccessToken", value: "new_token" }],
                "manual"
            )

            expect(changed).toBe(true)
            expect(changes.length).toBe(1)
            expect(changes[0].context.changedCookieNames).toEqual(["__Host-AccessToken"])
            expect(changes[0].context.reason).toBe("manual")
            expect(changes[0].cookies.find((c: any) => c.name === "__Host-AccessToken").value).toBe("new_token")

            // Sync with identical value should not trigger
            const changedAgain = store.syncCookies(
                [{ name: "__Host-AccessToken", value: "new_token" }],
                "manual"
            )
            expect(changedAgain).toBe(false)
            expect(changes.length).toBe(1)

            // Unsubscribe
            unsubscribe()
            store.syncCookies([{ name: "__Host-AccessToken", value: "newer_token" }])
            expect(changes.length).toBe(1)
        })

        it("should accept onCookiesChange in constructor options", () => {
            let notified = false
            const store = new StoreService({
                baseUrl,
                client,
                cookies: [{ name: "__Host-AccessToken", value: "t1" }],
                onCookiesChange: () => {
                    notified = true
                },
            })

            store.syncCookies([{ name: "__Host-AccessToken", value: "t2" }])
            expect(notified).toBe(true)
        })
    })

    describe("Token Refresh (/api/refreshtoken)", () => {
        const cookiesPath = path.resolve(__dirname, "../cookies/dragoncitygame.json")
        const hasRealCookies = fs.existsSync(cookiesPath)
        const runTest = hasRealCookies ? it : it.skip

        runTest(
            "should refresh token and notify observers via refreshToken()",
            async () => {
                const rawCookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"))

                let notifiedReason: string | null = null
                const game = new DragonCityGame({
                    languagePrefix: LanguagePrefix.BrazilianPortuguese,
                    cookies: rawCookies,
                    onCookiesChange: (_cookies, context) => {
                        notifiedReason = context.reason
                    },
                })

                try {
                    const result = await game.refreshToken()
                    expect(result.success).toBe(true)
                    expect(result.token).toBeDefined()
                    expect(result.token.startsWith("JWT.")).toBe(true)
                    expect(notifiedReason).toBe("token_refresh")
                } finally {
                    await game.close()
                }
            },
            15000
        )
    })

    describe("Integration: redeemCode('DAGONCITY')", () => {
        const cookiesPath = path.resolve(__dirname, "../cookies/dragoncitygame.json")
        const hasRealCookies = fs.existsSync(cookiesPath)

        const runTest = hasRealCookies ? it : it.skip

        runTest(
            "should attempt to redeem 'DAGONCITY' and throw StoreRedeemCodeError with normalized INVALID_CODE",
            async () => {
                const rawCookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"))

                const game = new DragonCityGame({
                    languagePrefix: LanguagePrefix.BrazilianPortuguese,
                    cookies: rawCookies,
                })

                try {
                    await expect(game.store.redeemCode("DAGONCITY")).rejects.toThrow(
                        StoreRedeemCodeError
                    )
                } finally {
                    await game.close()
                }

                // Check error properties in detail
                try {
                    await game.store.redeemCode("DAGONCITY", { cookies: rawCookies })
                } catch (err: any) {
                    expect(err).toBeInstanceOf(StoreRedeemCodeError)
                    expect(err.code).toBe("DAGONCITY")
                    expect(err.errorType).toBe(RedeemCodeErrorType.INVALID_CODE)
                    expect(err.normalizedMessage).toBe(
                        "Código inválido. Tente novamente com um código válido."
                    )
                    expect(err.rawMessage).toBeDefined()
                } finally {
                    await game.close()
                }
            },
            45000
        )
    })
})

