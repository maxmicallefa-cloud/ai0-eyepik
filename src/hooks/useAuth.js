import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPER = 'maxmicallefa@gmail.com'
const ALLOWED = ['maxmicallefa@gmail.com', 'leontrebor112@gmail.com']
let lastToken = null

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied,  setDenied]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handle(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      handle(session)
    })
    const t = setTimeout(() => setLoading(false), 5000)
    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  function handle(session) {
    if (!session?.user) { setUser(null); setLoading(false); return }
    if (!ALLOWED.includes(session.user.email)) {
      supabase.auth.signOut()
      setUser(null); setDenied(true); setLoading(false); return
    }
    if (lastToken === session.access_token) { setUser(session.user); setLoading(false); return }
    lastToken = session.access_token
    setUser(session.user)
    setLoading(false)
    localStorage.setItem('ai0-session', JSON.stringify({
      access_token: session.access_token, user: session.user
    }))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    lastToken = null
    setUser(null)
  }

  const isSuperAdmin = user?.email === SUPER

  return { user, loading, denied, signOut, isSuperAdmin }
}
