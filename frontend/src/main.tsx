import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'
import Home from './pages/Home'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import StudentDashboard from './pages/StudentDashboard'
import ProfessorDashboard from './pages/ProfessorDashboard'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import GroupDiscussionsPage from './pages/GroupDiscussions'
import ProtectedRoute from './components/ProtectedRoute'
import { getAuth } from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor"
          element={
            <ProtectedRoute requiredRole="professor">
              <ProfessorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={<Profile />}
        />
        <Route
          path="/analytics"
          element={<Analytics />}
        />
        <Route
          path="/student/discussions"
          element={
            <ProtectedRoute requiredRole="student">
              <GroupDiscussionsPage role="student" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professor/discussions"
          element={
            <ProtectedRoute requiredRole="professor">
              <GroupDiscussionsPage role="professor" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)


