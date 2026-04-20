import { defineStore } from 'pinia'

import NotifiedError from '../data/NotifiedError'
import CookieRepository from '../services/Repositories/CookieRepository'
import ApiService, { ApiRequestError } from '../services/ApiService'
import TokenStorageService from '../services/TokenStorageService'
import type { ILoginPayload, TokenValue } from '../types_and_interfaces'

import { useAccountStore } from './account'

interface LoginResponse {
  token: string
}

interface IntroduceClientPayload {
  name: string
}

interface AuthStoreState {
  tokenService: TokenStorageService
  currentEmail: CookieRepository
  currentCompanyName: CookieRepository
  api: ApiService
  LAST_STUDY_COOKIE_NAME: string
}

export const useAuthStore = defineStore('AuthStore', {
  state: (): AuthStoreState => ({
    tokenService: new TokenStorageService(null),
    currentEmail: new CookieRepository('df86380c2714'),
    currentCompanyName: new CookieRepository('company_name'),
    api: new ApiService(),
    LAST_STUDY_COOKIE_NAME: 'last_study',
  }),
  getters: {
    isAuthenticated: (state): boolean => Boolean(state.tokenService.tokens.account.value),
    companyName: (state): string => state.currentCompanyName.value ?? '',
  },
  actions: {
    setCompanyName(companyName: string): void {
      this.currentCompanyName.value = companyName.trim() || null
    },

    async createClient(): Promise<void> {
      const token = this.tokenService.tokens.account.value
      const companyName = this.companyName

      if (!token) {
        throw new Error('Не найден токен авторизации для создания клиента')
      }

      if (!companyName) {
        throw new Error('Не указано название компании')
      }

      const adminApiBase =
        import.meta.env.VITE_APP_API

      await this.api.request<unknown>(
        `${adminApiBase}/admin/introduce-client`,
        'POST',
        {
          Authorization: `Bearer ${token}`,
          locale: 'ru',
          Accept: 'application/json',
        },
        JSON.stringify({
          name: companyName,
        } satisfies IntroduceClientPayload),
      )
    },

    async acceptStudyToken(token: TokenValue, studyId: string | null): Promise<void> {
      this.tokenService.tokens.study.value = token
      this.tokenService.saveTokens()

      if (studyId) {
        const studyCookie = new CookieRepository(this.LAST_STUDY_COOKIE_NAME)
        studyCookie.value = studyId
      }
    },
    doLogout(): void {
      const accountStore = useAccountStore()

      this.tokenService.deleteToken(true)

      const studyCookie = new CookieRepository(this.LAST_STUDY_COOKIE_NAME)
      studyCookie.deleteValue()

      accountStore.selectedStudy.deleteValue()
      this.currentEmail.deleteValue()
    },
    async doLogin(loginPayload: ILoginPayload): Promise<boolean> {
      try {
        const loginResult = await this.api.request<LoginResponse>(
          `${import.meta.env.VITE_APP_API ?? ''}/authenticate`,
          'POST',
          {},
          JSON.stringify(loginPayload),
        )

        this.tokenService.tokens.account.value = loginResult.body.token
        this.tokenService.saveTokens()
        this.currentEmail.value = btoa(loginPayload.email)
        await this.createClient()
        await this.api.loadSpec()

        return true
      } catch (e: unknown) {
        console.error(e)

        this.tokenService.deleteToken(true)

        if (e instanceof ApiRequestError && e.statusCode === 401) {
          new NotifiedError(e, 'Неверный логин или пароль')
        } else if (e instanceof ApiRequestError && e.statusCode === 403) {
          new NotifiedError(e, 'Нет доступа к исследованию. Пожалуйста, обратитесь к вашему менеджеру')
        } else if (e instanceof Error && e.message === 'Не указано название компании') {
          new NotifiedError(e, 'Укажите название компании')
        } else if (e instanceof Error && e.message === 'Не найден токен авторизации для создания клиента') {
          new NotifiedError(e, 'Не удалось подготовить авторизацию для создания клиента')
        } else if (e instanceof Error) {
          new NotifiedError(e, 'Не удалось создать клиента после входа')
        }

        return false
      }
    },
  },
})

export type AuthStoreType = ReturnType<typeof useAuthStore>
