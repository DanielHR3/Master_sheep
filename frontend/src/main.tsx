import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'

// Auto-cleanup stale pinggy urls
const savedUrl = localStorage.getItem('backend_url');
if (savedUrl && savedUrl.includes('pinggy.link')) {
    localStorage.removeItem('backend_url');
}

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)
