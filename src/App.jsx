import { useEffect, useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import KeyDetectorPage from './pages/KeyDetectorPage.jsx'
import TapperPage from './pages/TapperPage.jsx'

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/tap') return 'tap'
  if (path === '/key') return 'key'
  return 'home'
}

export default function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('popstate', updateRoute)
    return () => window.removeEventListener('popstate', updateRoute)
  }, [])

  if (route === 'tap') return <TapperPage />
  if (route === 'key') return <KeyDetectorPage />
  return <HomePage />
}
