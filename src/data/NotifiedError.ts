export default class NotifiedError extends Error {
  constructor(error: Error, userMessage?: string) {
    super(userMessage ?? error.message)
    this.name = 'NotifiedError'
  }
}
