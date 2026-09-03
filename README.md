# @dchighs/dragoncitygame

SDK / Scraper oficial para integração com a plataforma e loja de **Dragon City** (`dragoncitygame.com`).

---

## 📦 Instalação

```bash
npm install @dchighs/dragoncitygame
```

ou com yarn / pnpm / bun:

```bash
yarn add @dchighs/dragoncitygame
pnpm add @dchighs/dragoncitygame
bun add @dchighs/dragoncitygame
```

---

## 🚀 Como Usar

### 1. Inicializando a SDK

Você pode inicializar a SDK definindo o idioma desejado através do enum `LanguagePrefix`:

```typescript
import { DragonCityGame, LanguagePrefix } from "@dchighs/dragoncitygame"

const game = new DragonCityGame({
    languagePrefix: LanguagePrefix.BrazilianPortuguese,
})
```

Idiomas suportados (`LanguagePrefix`):
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

## 📰 Módulo de Notícias (`news`)

### Obter Notícias Paginadas (`getManyArticles`)

Retorna uma lista de artigos com metadados de paginação.

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

### Obter Notícia Individual em Markdown (`getOneArticle`)

Obtém o conteúdo completo de um artigo pelo `slug`, onde o corpo (`body`) é convertido de Contentful Rich Text para **Markdown**.

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

### Obter o Último Artigo de Próximos Eventos (`getLastUpcomingEventsArticle`)

Busca automaticamente o último artigo de eventos futuros em qualquer idioma configurado, percorrendo as páginas até encontrar.

```typescript
const lastEventArticle = await game.news.getLastUpcomingEventsArticle()

console.log("Último calendário de eventos:", lastEventArticle.title)
```

---

## 🛒 Módulo da Loja (`store`)

### Obter Produtos da Loja (`getProducts`)

Retorna a lista de produtos disponíveis na loja oficial do jogo.

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

## ⚠️ Tratamento de Erros

O pacote possui classes de erro customizadas que estendem erros específicos de cada módulo:

```typescript
import {
    NextDataScriptNotFoundError,
    NewsArticlesCollectionNotFoundError,
    UpcomingEventsArticleNotFoundError,
    ArticleNotFoundError,
    StoreNextDataNotFoundError
} from "@dchighs/dragoncitygame"

try {
    const article = await game.news.getOneArticle("slug-invalido")
} catch (error) {
    if (error instanceof ArticleNotFoundError) {
        console.error("Artigo não encontrado!")
    }
}
```

---

## 📜 Licença

Distribuído sob a licença [MIT](./LICENSE).