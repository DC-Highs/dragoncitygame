import { messagesHelper } from "../../../shared/helpers/messages.helper"
import { RedeemCodeErrorType } from "../interfaces/store-automation.interface"

export class StoreModuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

export class StoreNextDataNotFoundError extends StoreModuleError {
    constructor() {
        super(messagesHelper.errors.nextDataNotFound)
    }
}

export class StoreAuthenticationError extends StoreModuleError {
    constructor(message: string) {
        super(message)
    }
}

export class StoreTokenMissingError extends StoreAuthenticationError {
    constructor(tokenName = "__Host-AccessToken") {
        super(messagesHelper.errors.tokenMissing(tokenName))
    }
}

export class StoreTokenExpiredError extends StoreAuthenticationError {
    readonly expirationDate: Date

    constructor(expirationDate: Date) {
        super(messagesHelper.errors.tokenExpired(expirationDate))
        this.expirationDate = expirationDate
    }
}

export class StoreInvalidTokenError extends StoreAuthenticationError {
    constructor(details?: string) {
        super(messagesHelper.errors.tokenInvalid(details))
    }
}

export class StoreRedeemCodeError extends StoreModuleError {
    readonly code: string
    readonly errorType: RedeemCodeErrorType
    readonly rawMessage: string
    readonly normalizedMessage: string

    constructor({
        code,
        errorType,
        rawMessage,
        normalizedMessage,
    }: {
        code: string
        errorType: RedeemCodeErrorType
        rawMessage: string
        normalizedMessage: string
    }) {
        super(
            messagesHelper.errors.redeemFailed({
                code,
                errorType,
                message: normalizedMessage || rawMessage,
            }),
        )
        this.code = code
        this.errorType = errorType
        this.rawMessage = rawMessage
        this.normalizedMessage = normalizedMessage
    }
}
