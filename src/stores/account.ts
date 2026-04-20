import { defineStore } from 'pinia'
import CookieRepository from '../services/Repositories/CookieRepository'

interface AccountState {
  selectedStudy: CookieRepository
}

export const useAccountStore = defineStore('AccountStore', {
  state: (): AccountState => ({
    selectedStudy: new CookieRepository('last_study'),
  }),
})
