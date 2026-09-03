export class NewsModuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

export class NextDataScriptNotFoundError extends NewsModuleError {
    constructor() {
        super("__NEXT_DATA__ script tag not found in page HTML.")
    }
}

export class NewsArticlesCollectionNotFoundError extends NewsModuleError {
    constructor() {
        super("newsArticlesCollection not found in __NEXT_DATA__.")
    }
}

export class UpcomingEventsArticleNotFoundError extends NewsModuleError {
    constructor() {
        super("No upcoming events article was found.")
    }
}

export class ArticleNotFoundError extends NewsModuleError {
    constructor(slug: string) {
        super(`Article with slug "${slug}" was not found.`)
    }
}
