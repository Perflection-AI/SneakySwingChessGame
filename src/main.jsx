import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './recovered.css'
import App from './App.jsx'
import { runBatch, analyzeResults } from './simulate.js'
import { preloadAllPhotos } from './imageCache.js'

preloadAllPhotos()

window.runSimulation = function runSimulation({ roles, pars = [3, 4, 5], runsPerConfig = 10000 }) {
  const allResults = runBatch(roles, pars, runsPerConfig)
  const output = []
  for (const { name, par, results } of allResults) {
    const stats = analyzeResults(results)
    output.push({ role: name, par, ...stats })
  }
  console.table(output)
  return output
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
