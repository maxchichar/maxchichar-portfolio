import { useState } from 'react'
import { CustomCursor } from './components/ui/CustomCursor'
import { ScrollProgress } from './components/ui/ScrollProgress'
import { GalaxyBackground } from './components/ui/GalaxyBackground'
import { GateController } from './components/gate/GateController'

function App() {
  const [gateComplete, setGateComplete] = useState(false)

  return (
    <div className="film-grain min-h-screen">
      <GalaxyBackground />
      <CustomCursor />
      <ScrollProgress />

      {/* Entrance sequence */}
      {!gateComplete && (
        <GateController onComplete={() => setGateComplete(true)} />
      )}

      {/* Main content - revealed after gate completes */}
      <div className={`relative z-10 transition-opacity duration-1000 ${gateComplete ? 'opacity-100' : 'opacity-0'}`}>
        <h1 className="text-white text-4xl font-display text-center pt-20">
          MAXCHICHAR
        </h1>
        <p className="text-zinc text-center mt-4">
          Portfolio coming soon...
        </p>
        {/* Add some content to enable scrolling */}
        <div className="h-[200vh]" />
      </div>
    </div>
  )
}

export default App
