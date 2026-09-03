import { describe, expect, it } from "vitest"
import { DragonCityGame, LanguagePrefix, NewsService, StoreService } from "../src/index"

describe("Package Exports", () => {
    it("should export main SDK class and services", () => {
        expect(DragonCityGame).toBeDefined()
        expect(NewsService).toBeDefined()
        expect(StoreService).toBeDefined()
    })

    it("should export shared enums", () => {
        expect(LanguagePrefix).toBeDefined()
        expect(LanguagePrefix.BrazilianPortuguese).toBe("/pt-BR")
    })
})
