export class StoreModuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

export class StoreNextDataNotFoundError extends StoreModuleError {
    constructor() {
        super("__NEXT_DATA__ script tag not found in store page HTML.")
    }
}
