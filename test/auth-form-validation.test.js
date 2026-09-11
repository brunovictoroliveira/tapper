import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordStrength, validateLoginForm, validateRegistrationForm } from '../src/services/authFormValidation.js'

test('valida campos obrigatórios e e-mail no login', () => {
  assert.deepEqual(validateLoginForm({ email: '', password: '' }), {
    email: 'Informe seu e-mail.',
    password: 'Informe sua senha.',
  })
  assert.equal(validateLoginForm({ email: 'invalido', password: '12345678' }).email, 'Informe um e-mail válido.')
})

test('exige confirmação idêntica de e-mail e senha no cadastro', () => {
  const errors = validateRegistrationForm({
    name: 'Ana',
    email: 'ana@example.com',
    emailConfirmation: 'outra@example.com',
    password: 'senha-segura',
    passwordConfirmation: 'senha-diferente',
  })
  assert.equal(errors.emailConfirmation, 'Os e-mails precisam ser iguais.')
  assert.equal(errors.passwordConfirmation, 'As senhas precisam ser iguais.')
})

test('classifica força sem impor regras além do tamanho mínimo', () => {
  assert.equal(passwordStrength('12345678').label, 'Fraca')
  assert.equal(passwordStrength('Senha123').label, 'Média')
  assert.equal(passwordStrength('Senha!12345').label, 'Forte')
})
