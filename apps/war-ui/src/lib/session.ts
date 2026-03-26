const DEV_SESSION_KEY = 'war.dev_user_email'

export function getDevSessionEmail() {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(DEV_SESSION_KEY)
  return value && value.trim() ? value.trim().toLowerCase() : null
}

export function setDevSessionEmail(email: string) {
  window.localStorage.setItem(DEV_SESSION_KEY, email.trim().toLowerCase())
}

export function clearDevSessionEmail() {
  window.localStorage.removeItem(DEV_SESSION_KEY)
}
