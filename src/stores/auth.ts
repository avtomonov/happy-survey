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

interface LaunchStudyPayload {
  title: string
  clientId: string
  type: 'happy_survey'
}

interface IntroduceClientResponse {
  id?: string
  clientId?: string
  client?: {
    id?: string
  }
}

const getClientIdFromResponse = (response: IntroduceClientResponse | null): string | null => {
  if (!response) {
    return null
  }

  return response.clientId ?? response.id ?? response.client?.id ?? null
}

interface AuthStoreState {
  tokenService: TokenStorageService
  currentEmail: CookieRepository
  currentCompanyName: CookieRepository
  currentClientId: CookieRepository
  api: ApiService
  LAST_STUDY_COOKIE_NAME: string
}

export const useAuthStore = defineStore('AuthStore', {
  state: (): AuthStoreState => ({
    tokenService: new TokenStorageService(null),
    currentEmail: new CookieRepository('df86380c2714'),
    currentCompanyName: new CookieRepository('company_name'),
    currentClientId: new CookieRepository('client_id'),
    api: new ApiService(),
    LAST_STUDY_COOKIE_NAME: 'last_study',
  }),
  getters: {
    isAuthenticated: (state): boolean => Boolean(state.tokenService.tokens.account.value),
    companyName: (state): string => state.currentCompanyName.value ?? '',
    clientId: (state): string => state.currentClientId.value ?? '',
  },
  actions: {
    setCompanyName(companyName: string): void {
      this.currentCompanyName.value = companyName.trim() || null
    },

    setClientId(clientId: string | null): void {
      this.currentClientId.value = clientId?.trim() || null
    },

    getAdminApiBase(): string {
      return import.meta.env.VITE_APP_API ?? ''
    },

    getAuthHeaders(): Record<string, string> {
      const token = this.tokenService.tokens.account.value

      if (!token) {
        throw new Error('Не найден токен авторизации для выполнения запроса')
      }

      return {
        Authorization: `Bearer ${token}`,
        locale: 'ru',
        Accept: 'application/json',
      }
    },

    async createClient(): Promise<void> {
      const companyName = this.companyName

      if (!companyName) {
        throw new Error('Не указано название компании')
      }

      const clientResult = await this.api.request<IntroduceClientResponse>(
        `${this.getAdminApiBase()}/admin/introduce-client`,
        'POST',
        this.getAuthHeaders(),
        JSON.stringify({
          name: companyName,
        } satisfies IntroduceClientPayload),
      )

      const clientId = getClientIdFromResponse(clientResult.body)

      if (!clientId) {
        throw new Error('Не удалось получить clientId созданного клиента')
      }

      this.setClientId(clientId)
    },

    async launchCustomStudy(): Promise<void> {
      const clientId = this.clientId

      if (!clientId) {
        throw new Error('Не найден clientId для запуска исследования')
      }

      await this.api.request<unknown>(
        `${this.getAdminApiBase()}/admin/launch-study`,
        'POST',
        this.getAuthHeaders(),
        JSON.stringify({
          title: 'Название 1',
          clientId,
          type: 'happy_survey',
        } satisfies LaunchStudyPayload),
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
      this.currentCompanyName.deleteValue()
      this.currentClientId.deleteValue()
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
        this.currentClientId.deleteValue()

        if (e instanceof ApiRequestError && e.statusCode === 401) {
          new NotifiedError(e, 'Неверный логин или пароль')
        } else if (e instanceof ApiRequestError && e.statusCode === 403) {
          new NotifiedError(e, 'Нет доступа к исследованию. Пожалуйста, обратитесь к вашему менеджеру')
        } else if (e instanceof Error && e.message === 'Не указано название компании') {
          new NotifiedError(e, 'Укажите название компании')
        } else if (e instanceof Error && e.message === 'Не найден токен авторизации для выполнения запроса') {
          new NotifiedError(e, 'Не удалось подготовить авторизацию для запроса')
        } else if (e instanceof Error && e.message === 'Не удалось получить clientId созданного клиента') {
          new NotifiedError(e, 'Клиент создан, но clientId не вернулся в ответе API')
        } else if (e instanceof Error) {
          new NotifiedError(e, 'Не удалось создать клиента после входа')
        }

        return false
      }
    },
  },
})

export type AuthStoreType = ReturnType<typeof useAuthStore>
