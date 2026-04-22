import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
	Quasar,
	QLayout,
	QHeader,
	QToolbar,
	QToolbarTitle,
	QPageContainer,
	QPage,
	QCard,
	QCardSection,
	QSeparator,
	QCardActions,
	QBtn,
	QBtnDropdown,
	QInput,
	QDialog,
	QSpinner,
	QIcon,
	QList,
	QItem,
	QItemSection,
	QItemLabel,
	QMenu,
	QSelect,
	QBadge,
	QTabs,
	QTab,
	QTabPanels,
	QTabPanel,
	QFile,
	Ripple,
} from 'quasar'
import quasarLang from 'quasar/lang/ru'
import quasarIconSet from 'quasar/icon-set/material-icons'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && isAuthenticated) {
		return '/home'
  }

  return true
})

app.use(pinia)
app.use(router)
app.use(Quasar, {
	lang: quasarLang,
	iconSet: quasarIconSet,
	components: {
		QLayout,
		QHeader,
		QToolbar,
		QToolbarTitle,
		QPageContainer,
		QPage,
		QCard,
		QCardSection,
		QSeparator,
		QCardActions,
		QBtn,
		QBtnDropdown,
		QInput,
		QDialog,
		QSpinner,
		QIcon,
		QList,
		QItem,
		QItemSection,
		QItemLabel,
		QMenu,
		QSelect,
		QBadge,
		QTabs,
		QTab,
		QTabPanels,
		QTabPanel,
		QFile,
	},
	directives: {
		Ripple,
	},
})

app.mount('#app')
