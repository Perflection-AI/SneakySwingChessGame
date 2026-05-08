import { AppProvider } from './AppProvider'
import IslandContainer from './components/IslandContainer'
import './App.css'

function App() {
  return (
    <AppProvider>
      <IslandContainer />
    </AppProvider>
  )
}

export default App
