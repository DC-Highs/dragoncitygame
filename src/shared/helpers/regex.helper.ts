export const regexHelper = {
    nextDataScriptRegex: /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    redeemErrors: {
        alreadyRedeemed:
            /(j[áa] foi resgatado|already.*redeemed|ya.*canjeado|d[ée]j[àa].*utilis[ée]|bereits.*eingel[öo]st|уже.*использован)/i,
        wrongFormat: /(formato errado|wrong format|formato incorrecto|format incorrect|falsches format)/i,
        expiredOrIneligible: /(expir|vencid|abgelaufen|ineligible|n[ãa]o eleg[íi]vel)/i,
        invalidCode:
            /(inv[áa]lid|no v[áa]lid|nicht g[üu]ltig|ung[üu]ltig|ge[çc]ersiz|недействительн|兑换码无效|無効|유효하지)/i,
        generalError: /(erro|error|problema|went wrong)/i,
    },
    storeButtons: {
        dailyGiftClaim: /(presente|gift|gr[áa]tis|free)/i,
        dailyGiftAlreadyClaimed: /(resgatado|claimed)/i,
        dailyStreakClaim: /^(obter|claim|obtener|r[ée]clamer)$/i,
    },
}
