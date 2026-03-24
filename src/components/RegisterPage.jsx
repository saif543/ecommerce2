"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Swal from "sweetalert2";

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter()
  const { handleGoogleSignIn, loading } = useAuth()
  const [signInLoading, setSignInLoading] = useState(false)

  const handleGoogleRegister = async () => {
    setSignInLoading(true)
    try {
      const result = await handleGoogleSignIn()
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Welcome to ZenTech!',
          text: 'Your account has been created successfully',
          timer: 1500,
          showConfirmButton: false,
          confirmButtonColor: '#4C1D95',
        })
        
        // Redirect to home page after successful registration
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        // Check for specific Firebase errors
        let errorMessage = result.error || 'Failed to sign up with Google'
        
        if (result.error.includes('operation-not-allowed')) {
          errorMessage = 'Google Sign-In is not enabled. Please contact the administrator.'
        } else if (result.error.includes('popup-closed-by-user')) {
          errorMessage = 'Sign-up was cancelled'
        } else if (result.error.includes('network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection'
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: errorMessage,
          confirmButtonColor: '#4C1D95',
        })
      }
    } catch (error) {
      console.error('Google registration error:', error)
      
      let errorMessage = 'An error occurred during sign up'
      
      // Handle Firebase error codes
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google Sign-In is not enabled in Firebase. Please contact the administrator.'
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-up was cancelled'
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: errorMessage,
        confirmButtonColor: '#4C1D95',
      })
    } finally {
      setSignInLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md px-8 py-10"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F47B20] to-[#111111] flex items-center justify-center">
            <span className="text-[#FF9F43] font-bold text-sm">Z</span>
          </div>
          <span className="font-serif text-2xl tracking-tight text-purple-dark">ZenTech</span>
        </Link>

        <h1 className="font-serif text-2xl text-text-primary text-center mb-2">
          Create your account
        </h1>
        <p className="text-sm text-text-secondary text-center mb-8">
          Join ZenTech to start shopping the best electronics.
        </p>

        {/* Google button */}
        <button 
          onClick={handleGoogleRegister}
          disabled={signInLoading || loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-semibold text-text-primary hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signInLoading || loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-dark"></div>
          ) : (
            <>
              <GoogleIcon />
              Sign up with Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <p className="text-xs text-text-secondary text-center">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-purple-mid font-semibold hover:text-purple-dark transition-colors"
          >
            Sign in
          </Link>
        </p>

        <p className="text-[11px] text-text-muted text-center mt-5 leading-relaxed">
          By continuing you agree to ZenTech&apos;s{" "}
          <span className="underline cursor-pointer hover:text-text-secondary">Terms of Service</span>{" "}
          and{" "}
          <span className="underline cursor-pointer hover:text-text-secondary">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
