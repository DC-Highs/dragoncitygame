# @dchighs/dragoncitygame

Official SDK / Scraper for integration with the **Dragon City** official website and store (`dragoncitygame.com`).

---

## 📦 Installation

```bash
npm install @dchighs/dragoncitygame
```

or using yarn / pnpm / bun:

```bash
yarn add @dchighs/dragoncitygame
pnpm add @dchighs/dragoncitygame
bun add @dchighs/dragoncitygame
```

---

## 🚀 Usage

### 1. Initializing the SDK

You can initialize the SDK by specifying the desired language via the `LanguagePrefix` enum:

```typescript
import { DragonCityGame, LanguagePrefix } from "@dchighs/dragoncitygame"

const game = new DragonCityGame({
    languagePrefix: LanguagePrefix.BrazilianPortuguese,
})
```

Supported languages (`LanguagePrefix`):
- `LanguagePrefix.English` (`""`)
- `LanguagePrefix.BrazilianPortuguese` (`"/pt-BR"`)
- `LanguagePrefix.Spanish` (`"/es"`)
- `LanguagePrefix.French` (`"/fr"`)
- `LanguagePrefix.German` (`"/de"`)
- `LanguagePrefix.Italian` (`"/it"`)
- `LanguagePrefix.Japanese` (`"/ja"`)
- `LanguagePrefix.Russian` (`"/ru"`)
- `LanguagePrefix.Korean` (`"/ko"`)
- `LanguagePrefix.Turkish` (`"/tr"`)

---

## 📰 News Module (`news`)

### Get Paginated News (`getManyArticles`)

Returns a list of article previews along with pagination metadata.

```typescript
const { meta, data: articles } = await game.news.getManyArticles({ page: 1 })

console.log(meta)
// {
//   total: 113,
//   lastPage: 3,
//   currentPage: 1,
//   prevPage: null,
//   nextPage: 2
// }

console.log(articles[0])
// {
//   slug: 'upcoming-events-september-2026',
//   createdAt: '2026-09-01T00:00:00.000+02:00',
//   title: 'UPCOMING EVENTS: SEPTEMBER 2026',
//   thumbnailUrl: 'https://images.ctfassets.net/...'
// }
```

### Get Single Article in Markdown (`getOneArticle`)

Fetches the complete content of an article by its `slug`, converting the body from Contentful Rich Text to **Markdown**.

```typescript
const article = await game.news.getOneArticle("upcoming-events-september-2026")

console.log(article)
// {
//   slug: 'upcoming-events-september-2026',
//   createdAt: '2026-09-01T00:00:00.000+02:00',
//   title: 'UPCOMING EVENTS: SEPTEMBER 2026',
//   thumbnailUrl: 'https://images.ctfassets.net/...',
//   body: '# September Calendar\n\n**28 Aug - 3 Sep: Maze Island**\n\n...'
// }
```

### Get Latest Upcoming Events Article (`getLastUpcomingEventsArticle`)

Automatically searches for the latest upcoming events calendar article across any configured language, traversing pages until found.

```typescript
const lastEventArticle = await game.news.getLastUpcomingEventsArticle()

console.log("Latest events calendar:", lastEventArticle.title)
```

---

## 🛒 Store Module (`store`)

### Get Store Products (`getProducts`)

Returns the list of available products from the official webstore.

```typescript
const products = await game.store.getProducts()

console.log(products[0])
// {
//   id: '6q9G4LXlDa0GXtALgGFwQO',
//   title: 'First-Time Buyers Bargain',
//   category: 'Promotions',
//   skuId: '2iow1iWrG7He5glrRSUJs9',
//   externalId: 'es.socialpoint.dragoncity.first_bonus_webstore_1',
//   originalPrice: 10,
//   salePrice: 5,
//   currency: 'BRL',
//   boxArtUrl: 'https://images.ctfassets.net/...',
//   purchasable: true,
//   items: [
//     {
//       name: 'Gems',
//       quantity: 65,
//       description: 'Gems are the most valuable resource in Dragon City.',
//       iconUrl: 'https://images.ctfassets.net/...'
//     }
//   ]
// }
```

---

## ⚠️ Error Handling

The package provides custom error classes for module-specific error handling:

```typescript
import {
    NextDataScriptNotFoundError,
    NewsArticlesCollectionNotFoundError,
    UpcomingEventsArticleNotFoundError,
    ArticleNotFoundError,
    StoreNextDataNotFoundError
} from "@dchighs/dragoncitygame"

try {
    const article = await game.news.getOneArticle("invalid-slug")
} catch (error) {
    if (error instanceof ArticleNotFoundError) {
        console.error("Article not found!")
    }
}
```

---

## 📜 License

Distributed under the [MIT](./LICENSE) License.