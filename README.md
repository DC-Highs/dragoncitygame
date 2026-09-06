# @dchighs/dragoncitygame

Comprehensive TypeScript SDK and automation client for Dragon City's official website and webstore ([dragoncitygame.com](https://www.dragoncitygame.com)).

Features high-performance news extraction with Contentful-to-Markdown conversion, official webstore product catalog parsing, automated reward claims (daily gifts & streaks), promo code redemption with multi-lingual error normalization, and session persistence with an **observer pattern** for automatic token renewals.

---

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Authentication & Session Management](#-authentication--session-management)
  - [Cookie Format](#cookie-format)
  - [Token Validation](#token-validation)
  - [Cookie Observer Pattern (`onCookiesChange`)](#cookie-observer-pattern-oncookieschange)
  - [Token Renewal (`refreshToken`)](#token-renewal-refreshtoken)
- [Store Module (`store`)](#-store-module-store)
  - [Redeem Promo Code (`redeemCode`)](#redeem-promo-code-redeemcode)
  - [Claim Daily Gift (`claimDailyGift`)](#claim-daily-gift-claimdailygift)
  - [Claim Daily Streak (`claimDailyStreak`)](#claim-daily-streak-claimdailystreak)
  - [Fetch Store Products (`getProducts`)](#fetch-store-products-getproducts)
  - [Closing Browser Resources (`close`)](#closing-browser-resources-close)
- [News Module (`news`)](#-news-module-news)
  - [Get Paginated Articles (`getManyArticles`)](#get-paginated-articles-getmanyarticles)
  - [Get Article in Markdown (`getOneArticle`)](#get-article-in-markdown-getonearticle)
  - [Get Latest Upcoming Events Calendar (`getLastUpcomingEventsArticle`)](#get-latest-upcoming-events-calendar-getlastupcomingeventsarticle)
- [Error Handling](#-error-handling)
  - [Store & Authentication Errors](#store--authentication-errors)
  - [Redeem Code Error Types](#redeem-code-error-types)
  - [News Scraping Errors](#news-scraping-errors)
- [Supported Languages](#-supported-languages)
- [License](#-license)

---

## ✨ Features

- ⚡ **Lightweight & Fast**: Uses `@xcrap/core` HTTP client for instant data extraction without overhead.
- 🤖 **Smart Headless Automation**: Browser actions powered by `@xcrap/puppeteer-client` for seamless interaction with dynamic Next.js components.
- 🎁 **Store Rewards**: Redeem promo codes, claim daily free gifts, and claim daily login streaks.
- 🔄 **Automatic Token Refresh**: Built-in detection and renewal via `/api/refreshtoken`.
- 👁️ **Cookie Observer**: Hook into token changes (`onCookiesChange`) to synchronize and persist updated cookies to disk or database automatically.
- 🌐 **Multi-Language Error Normalization**: Standardizes promo code errors (invalid, expired, already redeemed) across English, Portuguese, Spanish, French, German, Italian, and more.
- 📝 **Rich Contentful Markdown**: Converts news rich-text structures into clean, ready-to-use Markdown.

---

## 📦 Installation

```bash
npm install @dchighs/dragoncitygame
```

Or using yarn, pnpm, or bun:

```bash
yarn add @dchighs/dragoncitygame
# or
pnpm add @dchighs/dragoncitygame
# or
bun add @dchighs/dragoncitygame
```

> **Note**: `@dchighs/dragoncitygame` requires `@xcrap/puppeteer-client` and `puppeteer` (installed automatically as dependencies) for automation tasks such as code redemption and gift claiming.

---

## 🚀 Quick Start

### Basic Initialization (Public Data)

```typescript
import { DragonCityGame, LanguagePrefix } from "@dchighs/dragoncitygame"

const game = new DragonCityGame({
    languagePrefix: LanguagePrefix.English,
})

// Fetch current news articles
const { data: articles } = await game.news.getManyArticles({ page: 1 })
console.log(articles[0].title)

// Fetch store products
const products = await game.store.getProducts()
console.log(`Found ${products.length} products on webstore`)
```

---

## 🔐 Authentication & Session Management

Actions such as **redeeming codes**, **claiming daily gifts**, and **claiming streaks** require an active Dragon City web session. The session is identified by the `__Host-AccessToken` JWT cookie.

### Cookie Format

You can pass cookies as an array of objects (exported from browser DevTools / cookie extensions) or as a raw JSON string:

```typescript
import fs from "node:fs"
import { DragonCityGame, LanguagePrefix } from "@dchighs/dragoncitygame"

// Read cookies from file
const cookies = JSON.parse(fs.readFileSync("./cookies/dragoncitygame.json", "utf-8"))

const game = new DragonCityGame({
    languagePrefix: LanguagePrefix.English,
    cookies,
    autoRefreshToken: true, // Default: true (automatically renews before expiration)
})
```

### Token Validation

The SDK verifies that essential authentication tokens exist, are well-formed JWTs, have not expired, and contain valid claims (`sub`, `iss`):

```typescript
try {
    game.store.validateTokens()
    console.log("Tokens are valid and active!")
} catch (error) {
    console.error("Token error:", error.message)
}
```

### Cookie Observer Pattern (`onCookiesChange`)

Web tokens and cookies frequently change or renew. To avoid losing the updated session, register a listener with `onCookiesChange`. Whenever cookies are synchronized from the browser or renewed via `/api/refreshtoken`, your listener is notified immediately:

```typescript
import fs from "node:fs/promises"

// Register an observer to persist updated cookies
const unsubscribe = game.onCookiesChange(async (updatedCookies, context) => {
    console.log(`[Cookies Updated] Reason: ${context.reason}`)
    console.log(`[Cookies Updated] Changed: ${context.changedCookieNames.join(", ")}`)

    // Save updated cookies to file or database
    await fs.writeFile(
        "./cookies/dragoncitygame.json",
        JSON.stringify(updatedCookies, null, 2),
        "utf-8",
    )
})

// Later, if you want to stop listening:
// unsubscribe()
```

#### Change Context Reasons:
- `"browser_sync"`: Cookies were updated during page interactions inside Puppeteer.
- `"token_refresh"`: Tokens were refreshed through the API endpoint.
- `"manual"`: Cookies were updated programmatically.

### Token Renewal (`refreshToken`)

You can renew the JWT access token at any time without opening a browser:

```typescript
const result = await game.refreshToken()

console.log("Refresh successful:", result.success)
console.log("New Token:", result.token)
// Listeners registered via onCookiesChange will also be triggered automatically
```

---

## 🛒 Store Module (`store`)

### Redeem Promo Code (`redeemCode`)

Redeems a promotional code on `dragoncitygame.com`. All errors from the underlying Take2Games API and UI are normalized into the `RedeemCodeErrorType` enum regardless of the website's language.

```typescript
import { StoreRedeemCodeError, RedeemCodeErrorType } from "@dchighs/dragoncitygame"

try {
    const result = await game.store.redeemCode("DRAGONCITY")
    console.log("Success:", result.success)
    console.log("Promotion ID:", result.promotionId)
} catch (error) {
    if (error instanceof StoreRedeemCodeError) {
        console.error("Code:", error.code)
        console.error("Normalized Error Type:", error.errorType)
        console.error("Message:", error.normalizedMessage)

        if (error.errorType === RedeemCodeErrorType.INVALID_CODE) {
            console.log("The code entered does not exist.")
        } else if (error.errorType === RedeemCodeErrorType.ALREADY_REDEEMED) {
            console.log("You have already redeemed this code.")
        } else if (error.errorType === RedeemCodeErrorType.EXPIRED_OR_INELIGIBLE) {
            console.log("This code has expired or your account is ineligible.")
        }
    }
}
```

### Claim Daily Gift (`claimDailyGift`)

Claims the daily free gift available in the webstore:

```typescript
const result = await game.store.claimDailyGift()

if (result.alreadyClaimed) {
    console.log("Daily gift has already been claimed today!")
} else if (result.success) {
    console.log("Daily gift successfully claimed! Reward:", result.rewardTitle)
}
```

### Claim Daily Streak (`claimDailyStreak`)

Claims the daily consecutive login streak reward:

```typescript
const result = await game.store.claimDailyStreak()

if (result.alreadyClaimed) {
    console.log("Daily streak already claimed for today!")
} else if (result.success) {
    console.log("Daily streak successfully claimed! Reward:", result.rewardTitle)
}
```

### Fetch Store Products (`getProducts`)

Fetches all active offers, gem packs, dragon bundles, and items from the webstore:

```typescript
const products = await game.store.getProducts()

for (const product of products) {
    console.log(`[${product.category}] ${product.title}`)
    console.log(`Price: ${product.currency} ${product.salePrice ?? product.originalPrice}`)
    console.log(`Purchasable: ${product.purchasable}`)
    console.log("Items:", product.items.map((item) => `${item.quantity}x ${item.name}`))
    console.log("---")
}
```

### Closing Browser Resources (`close`)

When you are done performing browser automation tasks, close the browser instance to release system resources:

```typescript
await game.close()
```

---

## 📰 News Module (`news`)

### Get Paginated Articles (`getManyArticles`)

Retrieves article previews along with pagination metadata:

```typescript
const { meta, data: articles } = await game.news.getManyArticles({ page: 1 })

console.log(meta)
// Output:
// {
//   total: 113,
//   lastPage: 3,
//   currentPage: 1,
//   prevPage: null,
//   nextPage: 2
// }

console.log(articles[0])
// Output:
// {
//   slug: 'upcoming-events-september-2026',
//   createdAt: '2026-09-01T00:00:00.000+02:00',
//   title: 'UPCOMING EVENTS: SEPTEMBER 2026',
//   thumbnailUrl: 'https://images.ctfassets.net/...'
// }
```

### Get Article in Markdown (`getOneArticle`)

Fetches the full article by its `slug` and converts Contentful rich-text into clean Markdown:

```typescript
const article = await game.news.getOneArticle("upcoming-events-september-2026")

console.log(article.title)
console.log(article.body) // Markdown content
```

### Get Latest Upcoming Events Calendar (`getLastUpcomingEventsArticle`)

Searches across pages to automatically find the latest upcoming events calendar post:

```typescript
const lastEventArticle = await game.news.getLastUpcomingEventsArticle()

console.log("Calendar:", lastEventArticle.title)
console.log("Content:\n", lastEventArticle.body)
```

---

## ⚠️ Error Handling

### Store & Authentication Errors

| Error Class | Description |
| :--- | :--- |
| `StoreAuthenticationError` | Base error for any authentication/session failure. |
| `StoreTokenMissingError` | Thrown when `__Host-AccessToken` is missing from the cookie list. |
| `StoreTokenExpiredError` | Thrown when the JWT access token has expired (contains `expirationDate`). |
| `StoreInvalidTokenError` | Thrown when the JWT structure is malformed or invalid. |
| `StoreRedeemCodeError` | Thrown when promo code redemption fails (contains `code`, `errorType`, `normalizedMessage`, `rawMessage`). |

### Redeem Code Error Types

The `RedeemCodeErrorType` enum standardizes redemption errors regardless of website language:

```typescript
export enum RedeemCodeErrorType {
    INVALID_CODE = "INVALID_CODE",                   // Code does not exist or was typed incorrectly
    ALREADY_REDEEMED = "ALREADY_REDEEMED",           // Code has already been redeemed on this account
    EXPIRED_OR_INELIGIBLE = "EXPIRED_OR_INELIGIBLE", // Promotion period ended or account ineligible
    WRONG_FORMAT = "WRONG_FORMAT",                   // Code format is invalid
    GENERAL_ERROR = "GENERAL_ERROR",                 // Server or network error
    UNKNOWN = "UNKNOWN",                             // Unrecognized response
}
```

### News Scraping Errors

| Error Class | Description |
| :--- | :--- |
| `ArticleNotFoundError` | Thrown when an article with the given slug cannot be found. |
| `NewsArticlesCollectionNotFoundError` | Thrown if news articles collection is missing from page data. |
| `UpcomingEventsArticleNotFoundError` | Thrown if no upcoming events article is found. |
| `NextDataScriptNotFoundError` | Thrown if the `__NEXT_DATA__` script tag is missing from the page. |

---

## 🌐 Supported Languages

Pass the `languagePrefix` in `DragonCityGame` options to localize API requests and URLs:

```typescript
import { LanguagePrefix } from "@dchighs/dragoncitygame"
```

| Enum Member | Path Prefix | Language |
| :--- | :--- | :--- |
| `LanguagePrefix.English` | `""` | English (Default) |
| `LanguagePrefix.BrazilianPortuguese` | `"/pt-BR"` | Português (Brasil) |
| `LanguagePrefix.Spanish` | `"/es"` | Español |
| `LanguagePrefix.French` | `"/fr"` | Français |
| `LanguagePrefix.German` | `"/de"` | Deutsch |
| `LanguagePrefix.Italian` | `"/it"` | Italiano |
| `LanguagePrefix.Japanese` | `"/ja"` | 日本語 |
| `LanguagePrefix.Russian` | `"/ru"` | Русский |
| `LanguagePrefix.Korean` | `"/ko"` | 한국어 |
| `LanguagePrefix.Turkish` | `"/tr"` | Türkçe |

---

## 📜 License

Distributed under the [MIT](./LICENSE) License.