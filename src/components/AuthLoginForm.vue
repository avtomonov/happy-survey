<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ILoginPayload } from '../types_and_interfaces'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const isActive = ref<boolean>(false)

// Login form
const loginCompanyName = ref<string>(authStore.companyName)
const loginEmail = ref<string>('')
const loginPassword = ref<string>('')
const loginLoading = ref<boolean>(false)
const loginMessage = ref<string>('')

// Register form
const registerCompanyName = ref<string>('')
const registerEmail = ref<string>('')
const registerPassword = ref<string>('')
const registerLoading = ref<boolean>(false)
const registerMessage = ref<string>('')
const agreeToTerms = ref<boolean>(true)

const onLogin = async (): Promise<void> => {
  const trimmedCompanyName = loginCompanyName.value.trim()

  if (!trimmedCompanyName) {
    loginMessage.value = 'Укажите название компании'
    return
  }

  loginLoading.value = true
  loginMessage.value = ''

  authStore.setCompanyName(trimmedCompanyName)

  const payload: ILoginPayload = {
    email: loginEmail.value,
    password: loginPassword.value,
  }

  const success = await authStore.doLogin(payload)

  if (success) {
    await router.push('/goal')
  } else {
    loginMessage.value = 'Не удалось авторизоваться. Проверьте данные и API'
  }

  loginLoading.value = false
}

const onRegister = async (): Promise<void> => {
  const trimmedCompanyName = registerCompanyName.value.trim()

  if (!trimmedCompanyName) {
    registerMessage.value = 'Укажите название компании'
    return
  }

  if (!registerEmail.value || !registerPassword.value) {
    registerMessage.value = 'Заполните все поля'
    return
  }

  registerLoading.value = true
  registerMessage.value = ''

  authStore.setCompanyName(trimmedCompanyName)

  const payload: ILoginPayload = {
    email: registerEmail.value,
    password: registerPassword.value,
  }

  const success = await authStore.doLogin(payload)

  if (success) {
    await router.push('/goal')
  } else {
    registerMessage.value = 'Не удалось зарегистрироваться. Проверьте данные и API'
  }

  registerLoading.value = false
}

const toggleForm = (): void => {
  isActive.value = !isActive.value
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-logo" aria-label="Happy Job logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 389.05 67.03" role="img">
        <g>
          <polygon fill="#5d5d5d" points="93.52 15.55 101.4 15.55 101.4 29.74 115.95 29.74 115.95 15.55 123.84 15.55 123.84 51.41 115.95 51.41 115.95 37.02 101.4 37.02 101.4 51.41 93.52 51.41 93.52 15.55" />
          <path fill="#5d5d5d" d="M143.9,15.29h7.27l15.37,36.12h-8.25l-3.28-8H139.85l-3.28,8h-8Zm8.29,21.11-4.76-11.63L142.67,36.4Z" />
          <path fill="#5d5d5d" d="M171.22,15.55h14.65c8.55,0,13.73,5.08,13.73,12.5,0,8.29-6.46,12.6-14.5,12.6h-6V51.41h-7.89Zm14.14,18.08c3.94,0,6.24-2.36,6.24-5.53,0-3.53-2.45-5.43-6.4-5.43h-6.09v11Z" />
          <path fill="#5d5d5d" d="M204.59,15.55h14.65c8.56,0,13.73,5.08,13.73,12.5,0,8.29-6.45,12.6-14.49,12.6h-6V51.41h-7.89Zm14.14,18.08c4,0,6.25-2.36,6.25-5.53,0-3.53-2.46-5.43-6.4-5.43h-6.1v11Z" />
          <polygon fill="#5d5d5d" points="247.55 37.27 233.77 15.55 242.99 15.55 251.55 29.94 260.25 15.55 269.22 15.55 255.44 37.11 255.44 51.41 247.55 51.41 247.55 37.27" />
          <path fill="#5d5d5d" d="M284.24,46.54l5-5.53c2.05,2.25,4.05,3.58,6.56,3.58,3,0,4.81-1.79,4.81-5.94V15.55h8.1V39c0,4.25-1.23,7.43-3.39,9.58s-5.42,3.33-9.31,3.33a14.69,14.69,0,0,1-11.74-5.38" />
          <path fill="#5d5d5d" d="M314.29,33.48c0-10.2,8-18.54,19.11-18.54s19,8.24,19,18.54S344.36,52,333.3,52s-19-8.25-19-18.54m29.87,0c0-6.15-4.51-11.27-10.86-11.27s-10.76,5-10.76,11.27,4.51,11.26,10.86,11.26,10.76-5,10.76-11.26" />
          <path fill="#5d5d5d" d="M358.57,15.55h16.65c4.09,0,7.32,1.13,9.37,3.18a8.29,8.29,0,0,1,2.46,6.2,8.35,8.35,0,0,1-4.71,7.73c4.15,1.59,6.71,4,6.71,8.91,0,6.56-5.33,9.84-13.42,9.84H358.57Zm15,14.5c3.48,0,5.68-1.13,5.68-3.9,0-2.35-1.84-3.69-5.17-3.69h-7.79v7.59Zm2.1,14.44c3.48,0,5.58-1.23,5.58-4,0-2.41-1.79-3.9-5.84-3.9h-9.12v7.89Z" />
          <path fill="#61c13a" d="M56.66,10.17,33.52,0,9.88,9.93,0,34.51l10.17,23L33.12,67,58.21,56.16,67,32.52ZM48.3,47.6A25,25,0,0,1,33,53.29c-8.43.21-14.29-5.36-14.75-5.73a2.13,2.13,0,0,1,2.66-3.34c.46.37,5.46,5,12.32,4.73a20.94,20.94,0,0,0,12.52-4.77A2.13,2.13,0,0,1,48.3,47.6" />
        </g>
      </svg>
    </div>

    <div class="auth-container" :class="{ active: isActive }">
      <!-- Login Form -->
      <div class="form-box login">
        <form @submit.prevent="onLogin">
          <h1>Вход</h1>

          <div class="input-box">
            <q-input
              v-model="loginCompanyName"
              type="text"
              placeholder="Название компании"
              outlined
              dense
              hide-bottom-space
              class="form-input"
            />
            <q-icon name="business" class="input-icon" />
          </div>

          <div class="input-box">
            <q-input
              v-model="loginEmail"
              type="email"
              placeholder="Email"
              outlined
              dense
              hide-bottom-space
              class="form-input"
            />
            <q-icon name="mail" class="input-icon" />
          </div>

          <div class="input-box">
            <q-input
              v-model="loginPassword"
              type="password"
              placeholder="Пароль"
              outlined
              dense
              hide-bottom-space
              class="form-input"
            />
            <q-icon name="lock" class="input-icon" />
          </div>

          <div class="forgot-link">
            <a href="#">Забыли пароль?</a>
          </div>

          <button type="submit" class="btn" :disabled="loginLoading">
            {{ loginLoading ? 'Загрузка...' : 'Войти' }}
          </button>

          <div v-if="loginMessage" class="auth-message error">{{ loginMessage }}</div>

          <p>или войти через</p>
          <div class="social-icons">
            <a href="#" title="Google">
              <i class="fab fa-google"></i>
            </a>
            <a href="#" title="Facebook">
              <i class="fab fa-facebook"></i>
            </a>
            <a href="#" title="GitHub">
              <i class="fab fa-github"></i>
            </a>
            <a href="#" title="LinkedIn">
              <i class="fab fa-linkedin"></i>
            </a>
          </div>
        </form>
      </div>
      <!-- Register Form -->
      <div class="form-box register">
      <form @submit.prevent="onRegister">
        <h1>Регистрация</h1>

        <div class="input-box">
          <q-input
            v-model="registerCompanyName"
            type="text"
            placeholder="Название компании"
            outlined
            dense
            hide-bottom-space
            class="form-input"
          />
          <q-icon name="business" class="input-icon" />
        </div>

        <div class="input-box">
          <q-input
            v-model="registerEmail"
            type="email"
            placeholder="Email"
            outlined
            dense
            hide-bottom-space
            class="form-input"
          />
          <q-icon name="mail" class="input-icon" />
        </div>

        <div class="input-box">
          <q-input
            v-model="registerPassword"
            type="password"
            placeholder="Пароль"
            outlined
            dense
            hide-bottom-space
            class="form-input"
          />
          <q-icon name="lock" class="input-icon" />
        </div>

        <div class="agreements">
          <label class="agreement-item">
            <input v-model="agreeToTerms" type="checkbox" />
            <span>Я согласен с <a href="#">Условиями использования</a> и <a href="#">Политикой конфиденциальности</a></span>
          </label>
        </div>

        <button type="submit" class="btn" :disabled="registerLoading">
          {{ registerLoading ? 'Загрузка...' : 'Зарегистрироваться' }}
        </button>

        <div v-if="registerMessage" class="auth-message error">{{ registerMessage }}</div>

        <p>или зарегистрироваться через</p>
        <div class="social-icons">
          <a href="#" title="Google">
            <i class="fab fa-google"></i>
          </a>
          <a href="#" title="Facebook">
            <i class="fab fa-facebook"></i>
          </a>
          <a href="#" title="GitHub">
            <i class="fab fa-github"></i>
          </a>
          <a href="#" title="LinkedIn">
            <i class="fab fa-linkedin"></i>
          </a>
        </div>
      </form>
    </div>

      <!-- Toggle Panel -->
      <div class="toggle-box">
        <div class="toggle-panel toggle-left">
          <h1>Добро пожаловать!</h1>
          <p>Нет аккаунта?</p>
          <button type="button" class="btn" @click="toggleForm">Создать</button>
        </div>

        <div class="toggle-panel toggle-right">
          <h1>Добро пожаловать!</h1>
          <p>Уже есть аккаунт?</p>
          <button type="button" class="btn" @click="toggleForm">Войти</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-shell {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 112px 16px 24px;
  box-sizing: border-box;
}

.auth-logo {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  z-index: 3;

  svg {
    width: 260px;
    max-width: 100%;
    height: auto;
    display: block;
  }
}

.auth-container {
  position: relative;
  width: 100%;
  max-width: 850px;
  min-height: 600px;
  background: #fff;
  border-radius: 30px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  margin: 0 auto;
}

h1 {
  font-size: 36px;
  margin: -10px 0;
}

p {
  font-size: 14.5px;
  margin: 15px 0;
}

form {
  width: 100%;
}

.form-box {
  position: absolute;
  right: 0;
  width: 50%;
  height: 100%;
  background: #fff;
  display: flex;
  align-items: center;
  color: #333;
  text-align: center;
  padding: 40px;
  z-index: 1;
  transition: 0.6s ease-in-out 1.2s, visibility 0s 1s;
}

.auth-container.active .form-box {
  right: 50%;
}

.form-box.register {
  visibility: hidden;
}

.auth-container.active .form-box.register {
  visibility: visible;
}

.input-box {
  position: relative;
  margin: 30px 0;
}

.input-box :deep(.q-field__native),
.input-box :deep(.q-field__input) {
  font-size: 16px !important;
  color: #333 !important;
  font-weight: 500 !important;
}

.input-box :deep(.q-field__control) {
  background: #eee !important;
}

.input-box :deep(.q-field__control::before) {
  border: none !important;
}

.input-box :deep(input:-webkit-autofill),
.input-box :deep(input:-webkit-autofill:hover),
.input-box :deep(input:-webkit-autofill:focus),
.input-box :deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 30px #fff inset !important;
  box-shadow: 0 0 0 30px #fff inset !important;
  -webkit-text-fill-color: #333 !important;
}

.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #666;
  pointer-events: none;
}

.forgot-link {
  margin: -15px 0 15px;
}

.forgot-link a {
  font-size: 14.5px;
  color: #333;
  text-decoration: none;
  transition: color 0.3s;
}

.forgot-link a:hover {
  color: #61c13a;
}

.btn {
  width: 100%;
  height: 48px;
  background: #61c13a;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #fff;
  font-weight: 600;
  transition: background 0.3s;
}

.btn:hover:not(:disabled) {
  background: #52a82f;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-message {
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  border-radius: 6px;
}

.auth-message.error {
  color: #c41e3a;
  background: rgba(196, 30, 58, 0.1);
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 15px;
}

.social-icons a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 2px solid #ccc;
  border-radius: 8px;
  font-size: 20px;
  color: #333;
  text-decoration: none;
  transition: all 0.3s;
}

.social-icons a:hover {
  border-color: #61c13a;
  color: #61c13a;
  box-shadow: 0 0 10px rgba(97, 193, 58, 0.2);
}

.toggle-box {
  position: absolute;
  width: 100%;
  height: 100%;
}

.toggle-box::before {
  content: '';
  position: absolute;
  left: -250%;
  width: 300%;
  height: 100%;
  background: #61c13a;
  border-radius: 150px;
  z-index: 2;
  transition: 1.8s ease-in-out;
}

.auth-container.active .toggle-box::before {
  left: 50%;
}

.toggle-panel {
  position: absolute;
  width: 50%;
  height: 100%;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2;
  transition: 0.6s ease-in-out;
}

.toggle-panel.toggle-left {
  left: 0;
  transition-delay: 1.2s;
}

.auth-container.active .toggle-panel.toggle-left {
  left: -50%;
  transition-delay: 0.6s;
}

.toggle-panel.toggle-right {
  right: -50%;
  transition-delay: 0.6s;
}

.auth-container.active .toggle-panel.toggle-right {
  right: 0;
  transition-delay: 1.2s;
}

.toggle-panel p {
  margin-bottom: 20px;
}

.toggle-panel .btn {
  width: 160px;
  height: 46px;
  background: transparent;
  border: 2px solid #fff;
  box-shadow: none;
}

.toggle-panel .btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

:deep(.q-field--outlined .q-field__control) {
  padding: 0 12px !important;
  background-color: #fff !important;

  &::before {
    border: 2px solid #61c13a !important;
  }

  &::after {
    border: 2px solid #61c13a !important;
  }

  input {
    background-color: #fff !important;
  }
}

.agreements {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 15px 0;
  font-size: 13px;
  color: #333;
}

.agreement-item {
  display: flex;
  align-items: flex-start;
  cursor: pointer;

  span {
    text-align: left;
  }

  input {
    accent-color: #61c13a;
    margin-top: 2px;
    cursor: pointer;
    flex-shrink: 0;
    margin-right: 10px;
  }

  span {
    line-height: 1.4;

    a {
      color: #61c13a;
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

@media screen and (max-width: 650px) {
  .auth-shell {
    justify-content: flex-start;
    padding-top: 92px;
  }

  .auth-container {
    height: calc(100vh + 40px);
    margin-top: 0;
  }

  .form-box {
    bottom: 0;
    width: 100%;
    height: 70%;
  }

  .auth-container.active .form-box {
    right: 0;
    bottom: 30%;
  }

  .toggle-box::before {
    left: 0;
    top: -270%;
    width: 100%;
    height: 300%;
    border-radius: 20vw;
  }

  .auth-container.active .toggle-box::before {
    left: 0;
    top: 70%;
  }

  .auth-container.active .toggle-panel.toggle-left {
    left: 0;
    top: -30%;
  }

  .toggle-panel {
    width: 100%;
    height: 30%;
  }

  .toggle-panel.toggle-left {
    top: 0;
  }

  .toggle-panel.toggle-right {
    right: 0;
    bottom: -30%;
  }

  .auth-container.active .toggle-panel.toggle-right {
    bottom: 0;
  }
}

@media screen and (max-width: 400px) {
  .auth-shell {
    padding: 84px 10px 16px;
  }

  .form-box {
    padding: 20px;
  }

  .auth-logo {
    top: 10px;

    svg {
      width: 180px;
    }
  }

  .toggle-panel h1 {
    font-size: 30px;
  }
}
</style>
