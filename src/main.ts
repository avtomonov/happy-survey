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
	Ripple,
} from 'quasar'
import quasarLang from 'quasar/lang/ru'
import quasarIconSet from 'quasar/icon-set/material-icons'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
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
	},
	directives: {
		Ripple,
	},
})

app.mount('#app')
