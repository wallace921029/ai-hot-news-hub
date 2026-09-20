import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitch } from '@/components/LanguageSwitch'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useUserStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      toast.success(t('auth.loginSuccess'))
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Theme & Language controls */}
      <motion.div
        className="absolute top-4 right-4 flex items-center space-x-2 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ThemeToggle />
        <LanguageSwitch />
      </motion.div>

      {/* Login card */}
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="rounded-2xl border bg-card text-card-foreground shadow-lg p-8">
          {/* Logo */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground mb-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-7 h-7 text-background" />
            </motion.div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {t('common.appName')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('auth.loginTitle')}</p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('auth.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                  required
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-xl transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                    {t('common.loading')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    {t('auth.login')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.form>

          {/* Register link */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <p className="text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="text-foreground hover:text-foreground/80 transition-colors font-medium underline underline-offset-4"
              >
                {t('auth.register')}
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-muted-foreground/60 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          AI Hot News Hub &copy; 2026
        </motion.p>
      </motion.div>
    </div>
  )
}
