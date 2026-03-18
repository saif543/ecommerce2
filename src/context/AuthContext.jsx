'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
    createUserWithEmailAndPassword,
    getAuth,
    OAuthProvider,
    onAuthStateChanged,
    onIdTokenChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
} from 'firebase/auth'
import app, { googleProvider } from '../../Firebase/firebase.config'

export const AuthContext = createContext(null)
const auth = getAuth(app)

// Firebase ID tokens expire after 1 hour.
// We proactively refresh at 55 minutes to ensure admins never hit an expired token.
const TOKEN_REFRESH_INTERVAL_MS = 55 * 60 * 1000 // 55 minutes

// Apple Provider
const appleProvider = new OAuthProvider('apple.com')

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState(null)
    const refreshTimerRef = useRef(null)

    // ── Proactive token refresh ─────────────────────────────────
    // Clears any existing timer and starts a new one that force-refreshes
    // the Firebase ID token at 55-minute intervals.
    const scheduleTokenRefresh = useCallback((currentUser) => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
            refreshTimerRef.current = null
        }
        if (!currentUser) return

        refreshTimerRef.current = setInterval(async () => {
            try {
                // forceRefresh: true — always fetches a fresh token from Firebase servers
                await currentUser.getIdToken(true)
            } catch (err) {
                console.error('Token auto-refresh failed:', err.message)
                // If refresh fails the user may need to re-authenticate
            }
        }, TOKEN_REFRESH_INTERVAL_MS)
    }, [])

    // ── Listen for ANY token change (sign-in, sign-out, background refresh) ──
    // onIdTokenChanged fires every time the token changes, including automatic
    // Firebase SDK background refreshes and our proactive force-refreshes.
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            setUser(currentUser)

            if (currentUser) {
                // Start the 55-min proactive refresh schedule
                scheduleTokenRefresh(currentUser)

                // Fetch the user's DB role using the fresh token
                try {
                    const token = await currentUser.getIdToken()
                    const res = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setUserRole(data.role || 'user')
                    }
                } catch (err) {
                    console.error('Error fetching user role:', err.message)
                    setUserRole('user')
                }
            } else {
                // User signed out — clear refresh timer and role
                if (refreshTimerRef.current) {
                    clearInterval(refreshTimerRef.current)
                    refreshTimerRef.current = null
                }
                setUserRole(null)
            }

            setLoading(false)
        })

        return () => {
            unsubscribe()
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }
    }, [scheduleTokenRefresh])

    // ── getToken: always returns a valid (non-expired) token ───────
    // Passes forceRefresh=false — Firebase SDK auto-refreshes if the
    // token has less than ~5 minutes remaining. Combined with the
    // 55-minute proactive interval above, tokens are always fresh.
    const getToken = useCallback(async () => {
        if (!auth.currentUser) return null
        try {
            return await auth.currentUser.getIdToken(false)
        } catch (err) {
            // Token is invalid — try a force refresh as a last resort
            try {
                return await auth.currentUser.getIdToken(true)
            } catch {
                return null
            }
        }
    }, [])

    // ── Google Sign-in ──────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setLoading(true)
        try {
            const result = await signInWithPopup(auth, googleProvider)
            const token = await result.user.getIdToken()
            // Ensure user record exists in MongoDB
            await fetch('/api/auth/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL,
                }),
            }).catch(() => { /* non-critical — user record created on next API call */ })
            return { success: true, user: result.user }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ── Apple Sign-in ───────────────────────────────────────────
    const handleAppleSignIn = async () => {
        setLoading(true)
        try {
            const result = await signInWithPopup(auth, appleProvider)
            return { success: true, user: result.user }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    // ── Email/Password ──────────────────────────────────────────
    const createUser = async (email, password) => {
        setLoading(true)
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password)
            return { success: true, user: result.user }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email, password) => {
        setLoading(true)
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            return { success: true, user: result.user }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const logOut = async () => {
        setLoading(true)
        try {
            await firebaseSignOut(auth)
            setUserRole(null)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const updateUser = async (currentUser, name, photo) => {
        try {
            await updateProfile(currentUser, { displayName: name, photoURL: photo })
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const passwordReset = async (email) => {
        setLoading(true)
        try {
            await sendPasswordResetEmail(auth, email)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const verifyEmail = async () => {
        setLoading(true)
        try {
            await sendEmailVerification(auth.currentUser)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        } finally {
            setLoading(false)
        }
    }

    const authInfo = {
        user,
        userRole,
        loading,
        createUser,
        signIn,
        logOut,
        signOut: logOut,
        handleGoogleSignIn,
        handleAppleSignIn,
        updateUser,
        verifyEmail,
        passwordReset,
        getToken,
    }

    return (
        <AuthContext.Provider value={authInfo}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
