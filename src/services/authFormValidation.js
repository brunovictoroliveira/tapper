const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

function required(value, label) {
  return String(value || '').trim() ? '' : `Informe ${label}.`
}

export function isValidEmail(value) {
  return emailPattern.test(String(value || '').trim())
}

export function passwordStrength(password) {
  const value = String(password || '')
  if (!value) return { label: '—', tone: 'empty', score: 0 }

  const categories = [/[a-z]/u, /[A-Z]/u, /\d/u, /[^\w\s]/u]
    .filter((pattern) => pattern.test(value)).length
  const score = Math.min(5, (value.length >= 8 ? 1 : 0) + (value.length >= 12 ? 1 : 0) + categories)

  if (score <= 2) return { label: 'Fraca', tone: 'weak', score }
  if (score <= 4) return { label: 'Média', tone: 'medium', score }
  return { label: 'Forte', tone: 'strong', score }
}

export function validateLoginForm({ email, password }) {
  const errors = {
    email: required(email, 'seu e-mail'),
    password: required(password, 'sua senha'),
  }
  if (!errors.email && !isValidEmail(email)) errors.email = 'Informe um e-mail válido.'
  if (!errors.password && password.length < 8) errors.password = 'A senha precisa ter pelo menos 8 caracteres.'
  return errors
}

export function validateRegistrationForm({ name, email, emailConfirmation, password, passwordConfirmation }) {
  const errors = {
    name: required(name, 'seu nome'),
    email: required(email, 'seu e-mail'),
    emailConfirmation: required(emailConfirmation, 'a confirmação do e-mail'),
    password: required(password, 'uma senha'),
    passwordConfirmation: required(passwordConfirmation, 'a confirmação da senha'),
  }
  if (!errors.email && !isValidEmail(email)) errors.email = 'Informe um e-mail válido.'
  if (!errors.emailConfirmation && !isValidEmail(emailConfirmation)) errors.emailConfirmation = 'Informe um e-mail válido.'
  if (!errors.email && !errors.emailConfirmation && email.trim().toLowerCase() !== emailConfirmation.trim().toLowerCase()) {
    errors.emailConfirmation = 'Os e-mails precisam ser iguais.'
  }
  if (!errors.password && password.length < 8) errors.password = 'Use pelo menos 8 caracteres.'
  if (!errors.passwordConfirmation && passwordConfirmation.length < 8) errors.passwordConfirmation = 'Use pelo menos 8 caracteres.'
  if (!errors.password && !errors.passwordConfirmation && password !== passwordConfirmation) {
    errors.passwordConfirmation = 'As senhas precisam ser iguais.'
  }
  return errors
}
