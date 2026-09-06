export const messagesHelper = {
    errors: {
        nextDataNotFound: "__NEXT_DATA__ script tag not found in store page HTML.",
        tokenMissing: (tokenName = "__Host-AccessToken") =>
            `Essential authentication token "${tokenName}" is missing from cookies.`,
        tokenExpired: (expirationDate: Date) =>
            `The authentication token expired at ${expirationDate.toISOString()}. Please refresh your session cookies.`,
        tokenInvalid: (details?: string) =>
            `The authentication token is invalid or malformed.${details ? ` Details: ${details}` : ""}`,
        tokenMalformedJwt: "JWT token must consist of 3 parts (header, payload, signature).",
        tokenPayloadJsonError: "Could not decode and parse JWT payload JSON.",
        tokenMissingClaims: "Token payload missing required 'sub' or 'iss' claim.",
        tokenRefreshFailed: "Failed to refresh authentication token: session is invalid, expired, or unauthorized.",
        redemptionInputNotFound: "Redemption input field not found on page.",
        redeemFailed: ({ code, errorType, message }: { code: string; errorType: string; message: string }) =>
            `Failed to redeem code "${code}": [${errorType}] ${message}`,
        redeem: {
            invalidCode: "Código inválido. Tente novamente com um código válido.",
            alreadyRedeemed: "O código já foi resgatado. Tente usar outro código.",
            wrongFormat: "O código é inválido ou está no formato errado. Tente inserir o código novamente.",
            expiredOrIneligible: "Código expirado ou não elegível para esta conta.",
            generalError:
                "Houve um erro ao resgatar seu código. Digite o código correto ou entre em contato com a equipe de suporte.",
            unknownError: "Ocorreu um erro desconhecido ao resgatar o código.",
        },
    },
    store: {
        redeemSuccess: "Código resgatado com sucesso.",
        claimDailyGiftSuccess: "Presente diário resgatado com sucesso.",
        claimDailyGiftAlreadyClaimed: "O presente diário já foi resgatado ou não está disponível.",
        claimDailyStreakSuccess: "Recompensa da sequência diária resgatada com sucesso.",
        claimDailyStreakAlreadyClaimed: "A sequência diária já foi resgatada hoje ou ainda não está desbloqueada.",
    },
}
