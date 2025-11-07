import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAuth } from '../pages/Login'

type ProtectedRouteProps = {
  children: React.ReactElement
  requiredRole: 'student' | 'professor'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const auth = getAuth()

  if (!auth) {
    return <Navigate to="/login" replace />
  }

  if (auth.role !== requiredRole) {
    // Redirect to their appropriate dashboard
    return <Navigate to={auth.role === 'student' ? '/student' : '/professor'} replace />
  }

  return children
}

