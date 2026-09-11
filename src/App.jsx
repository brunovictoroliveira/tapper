import { useEffect, useState } from 'react'
import './App.css'
import AccountPage from './pages/AccountPage.jsx'
import AdminBpmReportPage from './pages/AdminBpmReportPage.jsx'
import CloudDashboardPage from './pages/CloudDashboardPage.jsx'
import CloudProjectsPage from './pages/CloudProjectsPage.jsx'
import CloudProjectDetailPage from './pages/CloudProjectDetailPage.jsx'
import CloudSongDetailPage from './pages/CloudSongDetailPage.jsx'
import CloudSongsPage from './pages/CloudSongsPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import KeyDetectorPage from './pages/KeyDetectorPage.jsx'
import LegalPage from './pages/LegalPage.jsx'
import TapperPage from './pages/TapperPage.jsx'
import SubscriptionPage from './pages/SubscriptionPage.jsx'
import StoragePage from './pages/StoragePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import RegistrationConfirmationPage from './pages/RegistrationConfirmationPage.jsx'

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/tap') return { name: 'tap' }
  if (path === '/key') return { name: 'key' }
  if (path === '/login') return { name: 'login' }
  if (path === '/register') return { name: 'register' }
  if (path === '/confirm-registration') return { name: 'confirm-registration' }
  if (path === '/admin') return { name: 'admin' }
  if (path === '/cloud') return { name: 'cloud' }
  if (path === '/cloud/songs') return { name: 'cloud-songs' }
  if (path === '/cloud/projects') return { name: 'cloud-projects' }
  const projectMatch = path.match(/^\/cloud\/projects\/([0-9a-f-]+)$/i)
  if (projectMatch) return { name: 'cloud-project', projectId: projectMatch[1] }
  const songMatch = path.match(/^\/cloud\/songs\/([0-9a-f-]+)$/i)
  if (songMatch) return { name: 'cloud-song', songId: songMatch[1] }
  if (path === '/account/reset-password') return { name: 'reset-password' }
  if (path === '/account/recovery') return { name: 'recovery' }
  if (path === '/account/subscription') return { name: 'subscription' }
  if (path === '/account/storage') return { name: 'storage' }
  if (path.startsWith('/account')) return { name: 'account' }
  if (path === '/privacy') return { name: 'privacy' }
  if (path === '/terms') return { name: 'terms' }
  return { name: 'home' }
}

export default function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('popstate', updateRoute)
    return () => window.removeEventListener('popstate', updateRoute)
  }, [])

  if (route.name === 'tap') return <TapperPage />
  if (route.name === 'key') return <KeyDetectorPage />
  if (route.name === 'login') return <LoginPage />
  if (route.name === 'register') return <RegisterPage />
  if (route.name === 'confirm-registration') return <RegistrationConfirmationPage />
  if (route.name === 'admin') return <AdminBpmReportPage />
  if (route.name === 'cloud') return <CloudDashboardPage />
  if (route.name === 'cloud-songs') return <CloudSongsPage />
  if (route.name === 'cloud-song') return <CloudSongDetailPage songId={route.songId} />
  if (route.name === 'cloud-projects') return <CloudProjectsPage />
  if (route.name === 'cloud-project') return <CloudProjectDetailPage projectId={route.projectId} />
  if (route.name === 'reset-password') return <AccountPage resetPassword />
  if (route.name === 'recovery') return <AccountPage initialMode="recovery" />
  if (route.name === 'subscription') return <SubscriptionPage />
  if (route.name === 'storage') return <StoragePage />
  if (route.name === 'account') return <AccountPage />
  if (route.name === 'privacy') return <LegalPage type="privacy" />
  if (route.name === 'terms') return <LegalPage type="terms" />
  return <HomePage />
}
