import { useState } from 'react'
import SignInForm from './components/SignInForm'
import SignUpForm from './components/SignUpForm'
import './App.css'

function App() {
  const [mode, setMode] = useState('signin')

  return (
    <>
      <div className="auth-toggle" role="tablist" aria-label="Authentication forms">
        <button
          type="button"
          className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => setMode('signin')}
          role="tab"
          aria-selected={mode === 'signin'}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => setMode('signup')}
          role="tab"
          aria-selected={mode === 'signup'}
        >
          Sign Up
        </button>
      </div>

      {mode === 'signin' ? <SignInForm /> : <SignUpForm />}
    </>
  )
}

export default App
