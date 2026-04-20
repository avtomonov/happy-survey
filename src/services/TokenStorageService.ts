type TokenContainer = {
  value: string | null
}

export interface TokenMap {
  account: TokenContainer
  study: TokenContainer
}

export default class TokenStorageService {
  readonly tokens: TokenMap

  constructor(initialAccountToken: string | null) {
    const persistedAccount = localStorage.getItem('account_token')
    const persistedStudy = localStorage.getItem('study_token')

    this.tokens = {
      account: { value: initialAccountToken ?? persistedAccount },
      study: { value: persistedStudy },
    }
  }

  saveTokens(): void {
    if (this.tokens.account.value) {
      localStorage.setItem('account_token', this.tokens.account.value)
    } else {
      localStorage.removeItem('account_token')
    }

    if (this.tokens.study.value) {
      localStorage.setItem('study_token', this.tokens.study.value)
    } else {
      localStorage.removeItem('study_token')
    }
  }

  deleteToken(clearStudy = false): void {
    this.tokens.account.value = null
    localStorage.removeItem('account_token')

    if (clearStudy) {
      this.tokens.study.value = null
      localStorage.removeItem('study_token')
    }
  }
}
