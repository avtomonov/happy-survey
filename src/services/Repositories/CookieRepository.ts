export default class CookieRepository {
  private readonly key: string

  constructor(key: string) {
    this.key = key
  }

  get value(): string | null {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${encodeURIComponent(this.key)}=`))

    if (!match) {
      return null
    }

    return decodeURIComponent(match.split('=')[1] ?? '')
  }

  set value(newValue: string | null) {
    if (newValue === null) {
      this.deleteValue()
      return
    }

    document.cookie = `${encodeURIComponent(this.key)}=${encodeURIComponent(newValue)}; path=/; samesite=lax`
  }

  deleteValue(): void {
    document.cookie = `${encodeURIComponent(this.key)}=; Max-Age=0; path=/; samesite=lax`
  }
}
