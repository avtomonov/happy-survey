<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ILoginPayload } from '../types_and_interfaces'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

// Login form - all fields on one step
const loginCompanyName = ref<string>('')
const loginEmail = ref<string>('root@happy-job.wip')
const loginPassword = ref<string>('d2NKGToi5jA8hD8rWs4K')
const loginLoading = ref<boolean>(false)
const loginMessage = ref<string>('')

const onLogin = async (): Promise<void> => {
  loginMessage.value = ''
  
  if (!loginCompanyName.value.trim()) {
    loginMessage.value = 'Укажите название компании'
    return
  }
  
  if (!loginEmail.value.trim()) {
    loginMessage.value = 'Укажите email'
    return
  }
  
  if (!loginPassword.value.trim()) {
    loginMessage.value = 'Укажите пароль'
    return
  }

  loginLoading.value = true

  const payload: ILoginPayload = {
    companyName: loginCompanyName.value,
    email: loginEmail.value,
    password: loginPassword.value,
  }

  const success = await authStore.doLogin(payload)

  if (success) {
    await router.push({ name: 'home' })
  } else {
    loginMessage.value = 'Не удалось авторизоваться. Проверьте данные'
  }

  loginLoading.value = false
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Вход</h1>
      </div>

      <div class="auth-divider"></div>

      <!-- Login Form -->
      <form @submit.prevent="onLogin" class="auth-form">
        <div class="form-group">
          <label for="company" class="form-label">Название компании</label>
          <input
            id="company"
            v-model="loginCompanyName"
            type="text"
            class="form-input"
            autocomplete="organization"
            placeholder="Введите название компании"
            required
          />
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Адрес электронной почты</label>
          <input
            id="email"
            v-model="loginEmail"
            type="email"
            class="form-input"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Пароль</label>
          <input
            id="password"
            v-model="loginPassword"
            type="password"
            class="form-input"
            autocomplete="current-password"
            required
          />
        </div>

        <q-btn
          type="submit"
          :label="loginLoading ? 'Загрузка...' : 'Войти'"
          :loading="loginLoading"
          color="primary"
          unelevated
          no-caps
          class="auth-q-btn auth-q-btn--primary"
        />

        <div v-if="loginMessage" class="auth-message error">{{ loginMessage }}</div>
      </form>

      <hr class="divider">

      <!-- Social Login -->
      <div class="social-section">
        <p class="social-label">или войти через</p>
        <div class="social-grid">
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card sso-link" title="SSO">
            <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-label="logo key" viewBox="0 0 16 16" focusable="false" height="1.2em" width="1.5em" role="img"><g><path d="M5.622 0c3.106 0 5.623 2.44 5.623 5.45a5.29 5.29 0 0 1-.567 2.386l4.836 4.807a.728.728 0 0 1 .19.328l.019.095.27 2.065a.777.777 0 0 1-.753.869l-.114-.006-2.078-.27a.74.74 0 0 1-.353-.144l-.072-.063-5.004-4.972a5.768 5.768 0 0 1-1.997.353C2.517 10.898 0 8.458 0 5.45 0 2.44 2.517 0 5.622 0zm3.404 9.787 4.504 4.477.83.107-.107-.826-4.464-4.437a5.594 5.594 0 0 1-.763.679zm-3.404-8.3c-2.258 0-4.089 1.773-4.089 3.962s1.831 3.963 4.09 3.963c2.258 0 4.088-1.774 4.088-3.963s-1.83-3.963-4.089-3.963zm-.51 1.485c1.128 0 2.044.887 2.044 1.982 0 1.094-.916 1.981-2.045 1.981s-2.044-.887-2.044-1.981c0-1.095.915-1.982 2.044-1.982zm0 1.486a.503.503 0 0 0-.512.496c0 .273.229.495.511.495a.503.503 0 0 0 .511-.495.503.503 0 0 0-.51-.496z" fill-rule="evenodd"></path></g></svg>
            <span>SSO</span>
          </q-card>
          <!-- <a href="#" class="social-link microsoft-link" title="Microsoft">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet" viewBox="0 0 20 20" focusable="false"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="ms-symbollockup_mssymbol_19"><rect id="Rectangle" fill="#F25022" x="0" y="0" width="9.47368421" height="9.47368421"></rect><rect id="Rectangle" fill="#00A4EF" x="0" y="10.5263158" width="9.47368421" height="9.47368421"></rect><rect id="Rectangle" fill="#7FBA00" x="10.5263158" y="0" width="9.47368421" height="9.47368421"></rect><rect id="Rectangle" fill="#FFB900" x="10.5263158" y="10.5263158" width="9.47368421" height="9.47368421"></rect></g></g></svg>
            <span>Microsoft</span>
          </a>
          <a href="#" class="social-link facebook-link" title="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet" viewBox="0 0 14222 14222" focusable="false"><g><path fill="#1977F3" fill-rule="nonzero" d="M14222 7111c0,-3927 -3184,-7111 -7111,-7111 -3927,0 -7111,3184 -7111,7111 0,3549 2600,6491 6000,7025l0 -4969 -1806 0 0 -2056 1806 0 0 -1567c0,-1782 1062,-2767 2686,-2767 778,0 1592,139 1592,139l0 1750 -897 0c-883,0 -1159,548 -1159,1111l0 1334 1972 0 -315 2056 -1657 0 0 4969c3400,-533 6000,-3475 6000,-7025z"></path></g></svg>
            <span>Facebook</span>
          </a>
          <a href="#" class="social-link linkedin-link" title="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet" viewBox="0 0 36 36" focusable="false"><g transform="scale(.7083)" fill="none" fill-rule="evenodd"><rect fill="#FFF" x="1" y="1" width="46" height="46" rx="4"></rect><path fill="#0077B5" d="M0 4.01A4.01 4.01 0 014.01 0h39.98A4.01 4.01 0 0148 4.01v39.98A4.01 4.01 0 0143.99 48H4.01A4.01 4.01 0 010 43.99V4.01zM19 18.3h6.5v3.266C26.437 19.688 28.838 18 32.445 18 39.359 18 41 21.738 41 28.597V41.3h-7V30.159c0-3.906-.937-6.109-3.32-6.109-3.305 0-4.68 2.375-4.68 6.109V41.3h-7v-23zM7 41h7V18H7v23zm8-30.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"></path></g></svg>
            <span>LinkedIn</span>
          </a> -->
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card google-link" title="Google">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet" viewBox="0 0 48 48" focusable="false"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"></path><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"></path><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.991 21.991 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"></path><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"></path><path fill="none" d="M2 2h44v44H2z"></path></svg>
            <span>Google</span>
          </q-card>
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card apple-link" title="Apple">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet" aria-label="logo apple" viewBox="18 16 20 20" focusable="false"><path xmlns="http://www.w3.org/2000/svg" d="M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z" fill="#000000" fill-rule="nonzero"></path></svg>
            <span>Apple</span>
          </q-card>
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card vk-link" title="VK">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" focusable="false"><path fill="rgb(0, 119, 255)" d="M20.911 0h-9.823C2.124 0-.001 2.125-.001 11.089v9.823c0 8.964 2.125 11.089 11.089 11.089h9.823C29.875 32.001 32 29.876 32 20.912v-9.823C32 2.125 29.854 0 20.911 0m4.922 22.828H23.51c-.88 0-1.151-.698-2.734-2.302c-1.375-1.333-1.984-1.51-2.323-1.51c-.479 0-.615.135-.615.792v2.099c0 .563-.177.901-1.667.901c-2.464 0-5.198-1.49-7.115-4.266c-2.891-4.068-3.682-7.115-3.682-7.745c0-.339.135-.656.786-.656h2.328c.589 0 .813.271 1.042.901c1.151 3.323 3.068 6.234 3.859 6.234c.292 0 .427-.135.427-.88v-3.432c-.089-1.583-.922-1.719-.922-2.281c0-.271.224-.542.583-.542h3.661c.495 0 .677.271.677.854v4.63c0 .5.224.677.359.677c.292 0 .542-.177 1.083-.719c1.672-1.875 2.87-4.766 2.87-4.766c.156-.339.427-.656 1.016-.656h2.328c.698 0 .854.359.698.859c-.292 1.354-3.141 5.375-3.141 5.375c-.245.406-.339.583 0 1.036c.25.339 1.063 1.042 1.604 1.672c.995 1.13 1.76 2.078 1.964 2.734c.229.651-.109.99-.766.99z"/></svg>
            <span>VK</span>
          </q-card>
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card max-link social-link--wordmark" title="MAX">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" focusable="false" class="social-logo social-logo--max"><path fill="#231273" d="M350.4,9.6C141.8,20.5,4.1,184.1,12.8,390.4c3.8,90.3,40.1,168,48.7,253.7,2.2,22.2-4.2,49.6,21.4,59.3,31.5,11.9,79.8-8.1,106.2-26.4,9-6.1,17.6-13.2,24.2-22,27.3,18.1,53.2,35.6,85.7,43.4,143.1,34.3,299.9-44.2,369.6-170.3C799.6,291.2,622.5-4.6,350.4,9.6h0ZM269.4,504c-11.3,8.8-22.2,20.8-34.7,27.7-18.1,9.7-23.7-.4-30.5-16.4-21.4-50.9-24-137.6-11.5-190.9,16.8-72.5,72.9-136.3,150-143.1,78-6.9,150.4,32.7,183.1,104.2,72.4,159.1-112.9,316.2-256.4,218.6h0Z"/></svg>
            <span>MAX</span>
          </q-card>
          <q-card tag="a" href="#" flat bordered v-ripple class="social-link social-card gosuslugi-link" title="Госуслуги">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" focusable="false"><defs><linearGradient x1="50.006%" y1="-.009%" x2="50.006%" y2="100.17%" id="gosuslugi-gradient"><stop stop-color="#1466AC" offset="40%"/><stop stop-color="#EF4058" offset="66%"/></linearGradient></defs><g fill="none" fill-rule="evenodd"><path d="M72.872 45.829h-2.72a.183.183 0 0 0-.17.17v8.63c-.594.17-1.19.255-1.869.255-1.785 0-2.21-.552-2.21-2.933v-5.952a.183.183 0 0 0-.17-.17h-2.718a.183.183 0 0 0-.17.17v6.25c0 3.91 1.317 5.399 4.673 5.399 1.912 0 4.079-.51 5.354-.978.042-.043.084-.085.084-.128V46c.085-.085 0-.17-.084-.17Zm-57.613.043h-2.762c-.085 0-.127.042-.127.127-.425 1.7-1.317 4.591-2.507 7.61l-2.761-7.652c-.043-.043-.085-.085-.128-.085H4.17c-.043 0-.085.042-.128.085-.042.042-.042.085 0 .127l4.164 11.394a36.97 36.97 0 0 1-1.19 2.295c-.297.51-.552 1.02-.807 1.573-.042.043-.042.085 0 .128.043.042.085.085.128.085h3.016c.043 0 .128-.043.128-.085a55.123 55.123 0 0 0 1.742-3.741c1.784-4.167 3.186-8.078 4.249-11.649 0-.042 0-.085-.043-.127-.085-.085-.127-.085-.17-.085Zm9.9 8.757a.091.091 0 0 0-.085-.085h-.128c-.68.255-1.912.425-2.762.425-1.911 0-2.804-.51-2.804-3.4 0-2.339.298-3.402 2.804-3.402.723 0 1.36.085 2.21.34.085 0 .127 0 .17-.085l1.104-2.21v-.128a.091.091 0 0 0-.085-.085 12.812 12.812 0 0 0-3.611-.553c-3.951 0-5.736 1.871-5.736 6.08 0 4.251 1.785 6.164 5.736 6.164.977 0 2.974-.212 3.909-.595.085-.043.127-.128.085-.213l-.807-2.253Zm25.874-8.757h-2.761c-.085 0-.128.042-.128.127-.425 1.743-1.317 4.591-2.507 7.61l-2.761-7.652c-.043-.043-.085-.085-.128-.085h-2.804c-.042 0-.085.042-.127.085-.043.042-.043.085 0 .127l4.163 11.394a36.97 36.97 0 0 1-1.19 2.295c-.297.51-.552 1.02-.807 1.573-.042.043-.042.085 0 .128.043.042.085.085.128.085h3.016c.043 0 .128-.043.128-.085a55.123 55.123 0 0 0 1.742-3.741c1.742-4.167 3.186-8.078 4.249-11.649 0-.042 0-.085-.043-.127-.085-.085-.127-.085-.17-.085Zm10.197-.043H53.2a.183.183 0 0 0-.17.17V57.18c0 .085.085.17.17.17h2.72c.084 0 .17-.085.17-.17v-8.673h4.205c.043 0 .128-.042.128-.085.34-.765.637-1.573.977-2.38v-.128c-.085-.042-.127-.085-.17-.085Z" fill="#EF3E58" fill-rule="nonzero"/><path d="M18.488 28.654c-3.909 0-5.438 1.7-5.438 5.994 0 4.379 1.53 6.08 5.438 6.08 3.951 0 5.48-1.701 5.48-6.08 0-4.294-1.529-5.994-5.48-5.994Zm0 9.608c-1.784 0-2.337-.468-2.337-3.529 0-3.23.595-3.528 2.337-3.528 1.785 0 2.38.297 2.38 3.528 0 3.019-.553 3.529-2.38 3.529Zm16.358-.468a.091.091 0 0 0-.085-.085h-.128c-.68.255-1.912.425-2.761.425-1.912 0-2.805-.51-2.805-3.4 0-2.34.255-3.402 2.805-3.402.722 0 1.36.085 2.209.34.085 0 .127 0 .17-.085l1.104-2.21v-.128a.091.091 0 0 0-.085-.085 12.812 12.812 0 0 0-3.61-.553c-3.952 0-5.737 1.87-5.737 6.08 0 4.25 1.785 6.164 5.736 6.164.977 0 2.974-.213 3.909-.595.085-.043.127-.128.085-.213l-.807-2.253Zm-30.676-8.8a.183.183 0 0 0-.17.17v11.18c0 .086.085.17.17.17h2.72c.084 0 .17-.084.17-.17v-8.672h4.205c.043 0 .128-.042.128-.085.34-.765.637-1.573.977-2.38v-.128c-.043-.043-.085-.085-.128-.085H4.17Z" fill="#0F67B1" fill-rule="nonzero"/><path d="M81.575 56.16v-.17c0-.085 0-.213.043-.298.127-1.573.212-3.486.297-5.697v-.17L82 45.064c0-1.658-.042-3.274-.085-4.762v-.17l-.297-5.696c0-.086 0-.213-.043-.298v-.17c0-.17-.042-.298-.042-.468v-.17c-.128-1.658-.213-2.678-.255-2.763 0-.17-.043-.34-.043-.468v-.127a6.023 6.023 0 0 0-.17-.85c0-.043 0-.086-.042-.128-.722-3.444-2.634-7.227-5.014-10.076-.934-1.105-1.912-2.083-2.931-2.848a135.271 135.271 0 0 0-11.94-7.865c-6.245-3.699-11.853-6.25-12.575-6.59-.043 0-.043-.042-.043-.042C46.863.85 44.866.34 42.7.128c-.425-.043-.85-.085-1.275-.085-.383 0-.765-.043-1.147-.043h-.595c-2.932.043-5.608.595-7.733 1.573-.34.128-5.99 2.72-12.406 6.462l-.255.127A154.73 154.73 0 0 0 7.35 16.07c-1.614 1.19-3.059 2.72-4.376 4.676-.297.468-.297 1.573.977 1.573h3.272c1.402 0 1.742-.85 3.314-1.998 1.742-1.275 5.183-3.826 11.471-7.567 4.546-2.678 8.795-4.762 10.834-5.74.043 0 .085-.042.128-.042 0 0 .042 0 .042-.042 0 0 .043 0 .043-.043.042 0 .085-.042.085-.042.042 0 .085-.043.127-.043.51-.255.85-.383.85-.383 1.445-.637 3.484-1.062 5.65-1.105h.85c.638 0 1.275.043 1.87.128 1.317.17 2.507.425 3.484.85.085.042.212.085.297.127a143.63 143.63 0 0 1 12.152 6.377 137.128 137.128 0 0 1 11.471 7.568c.807.595 1.615 1.445 2.38 2.38 1.911 2.466 3.483 5.825 3.738 8.418 0 .043.128 1.063.255 2.806 0 .127 0 .212.043.34v.255c0 .17.042.298.042.468v.17c0 .085 0 .212.043.297 0 .213.042.425.042.638 0 .128 0 .255.043.383v.085c0 .17 0 .297.042.467v.34c.287 5.07.287 10.15 0 15.22v.34c0 .17 0 .298-.042.468v.085c0 .127 0 .255-.043.382 0 .213-.042.426-.042.638 0 .128 0 .213-.043.298v.17c0 .17-.042.297-.042.467v.256c0 .127 0 .255-.043.34-.127 1.743-.255 2.805-.255 2.805-.255 2.594-1.827 5.952-3.739 8.418-.764.978-1.572 1.786-2.379 2.38-.042 0-1.147.851-2.974 2.126a136.965 136.965 0 0 1-20.479 11.734l-.17.085c-.085.043-.212.085-.297.128-.977.382-2.167.68-3.484.85-.595.085-1.232.127-1.87.127h-.85c-2.166-.042-4.205-.425-5.65-1.105 0 0-.297-.127-.85-.383-.042-.042-.127-.042-.17-.085-.042-.042-.085-.042-.127-.085-.043 0-.043-.042-.085-.042-.043 0-.085-.043-.127-.043-.043-.042-.085-.042-.17-.085h-.043a138.21 138.21 0 0 1-10.58-5.611c-6.33-3.699-9.729-6.292-11.47-7.568-1.573-1.148-1.913-1.998-3.315-1.998H3.951c-1.274 0-1.274 1.106-.977 1.53C4.291 71.21 5.736 72.74 7.35 73.93c.213.17 5.396 3.996 11.94 7.865.339.213.679.425 1.061.595 6.076 3.486 11.302 5.867 11.6 6.037 2.081.935 4.8 1.488 7.69 1.573h.594c.383 0 .765 0 1.147-.043.425 0 .85-.042 1.275-.085 2.167-.212 4.206-.722 5.82-1.445 0 0 .043 0 .043-.042.722-.34 6.33-2.934 12.576-6.59a156.319 156.319 0 0 0 8.795-5.612l3.144-2.253c1.02-.765 1.997-1.743 2.932-2.848 2.38-2.849 4.291-6.632 5.013-10.076 0-.042 0-.085.043-.127.042-.298.127-.596.17-.85V59.9c.042-.17.042-.34.042-.468 0-.085.128-1.105.255-2.763v-.17c.085-.043.085-.213.085-.34" fill="url(#gosuslugi-gradient)" transform="translate(4)"/><path d="M37.65 45.829h-8.328c-.085 0-.127.043-.17.128-.212 3.783-.934 7.822-1.954 11.138 0 .042 0 .085.042.127.043.043.085.043.128.043h2.847c.084 0 .127-.043.127-.085.807-2.55 1.445-5.867 1.7-8.673h2.719v8.63c0 .085.085.17.17.17h2.719c.085 0 .17-.085.17-.17v-11.18c0-.043-.085-.128-.17-.128Z" fill="#EF3E58" fill-rule="nonzero"/></g></svg>
            <span>Госуслуги</span>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-width: 100vw;
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  padding: 40px;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }
}

.auth-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 20px 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 12px 14px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
  font-family: inherit;
  color: #333;

  &:focus {
    outline: none;
    border-color: #61c13a;
    background: white;
    box-shadow: 0 0 0 3px rgba(97, 193, 58, 0.1);
  }
}

.form-actions {
  display: flex;
  gap: 12px;

  :deep(.q-btn) {
    flex: 1;
  }
}

.auth-q-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 10px;
}

.auth-q-btn--primary {
  :deep(.q-btn__content) {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
}

.auth-q-btn--secondary {
  :deep(.q-btn__content) {
    font-size: 14px;
    font-weight: 600;
  }
}

.auth-message {
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;

  &.error {
    background: #fde4e6;
    color: #c41e3a;
    border: 1px solid #f5b5bc;
  }
}

.divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 30px 0 20px;
}

.social-section {
  text-align: center;
}

.social-label {
  font-size: 13px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  margin-top: 0;
  font-weight: 500;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.social-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  justify-content: center;
  min-height: 84px;
  padding: 14px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #ffffff;
  text-decoration: none;
  color: #333;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
  overflow: hidden;

  svg {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  span {
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
    color: #666;
  }

  &:hover {
    border-color: #c7ccd4;
    background: #e9edf2;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
    color: #333;

    span {
      color: #333;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
  }
}

.social-logo--max {
  width: 32px;
  height: 32px;
}

.social-logo {
  display: block;
  max-width: 100%;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 24px;
  }

  .auth-header h1 {
    font-size: 24px;
  }

  .social-grid {
    gap: 10px;
  }

  .social-link {
    min-height: 78px;
    padding: 12px 10px;
  }
}

@media (max-width: 360px) {
  .social-grid {
    grid-template-columns: 1fr;
  }
}
</style>
