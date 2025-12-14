
import React, { useMemo, useState, useEffect } from 'react';
import { Territory, Country, UnitType, Animation } from '../types';

interface MapCanvasProps {
  territories: Territory[];
  countries: Country[];
  selectedTerritoryId: string | null;
  movingFromTerritoryId: string | null;
  animations: Animation[];
  onSelectTerritory: (id: string) => void;
}

const AnimatedUnit: React.FC<{ 
    from: {x: number, y: number}, 
    to: {x: number, y: number}, 
    duration: number,
    type: 'MOVE' | 'ATTACK'
}> = ({ from, to, duration, type }) => {
    const [pos, setPos] = useState(from);

    useEffect(() => {
        // Trigger reflow/repaint to ensure transition starts
        requestAnimationFrame(() => {
            setPos(to);
        });
    }, [to]);

    return (
        <div 
            style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: `transform ${duration}ms linear`,
                pointerEvents: 'none',
                zIndex: 50
            }}
        >
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg
                ${type === 'ATTACK' ? 'bg-red-600 animate-pulse' : 'bg-green-600'}
            `}>
                {type === 'ATTACK' ? '⚔️' : '🛡️'}
            </div>
        </div>
    );
};

const MapCanvas: React.FC<MapCanvasProps> = ({ 
  territories, 
  countries, 
  selectedTerritoryId, 
  movingFromTerritoryId,
  animations,
  onSelectTerritory 
}) => {
  const getOwnerColor = (ownerId: string) => {
    const country = countries.find(c => c.id === ownerId);
    return country ? country.color : '#555';
  };

  const mapElements = useMemo(() => {
    return territories.map((t) => {
      const fill = getOwnerColor(t.ownerId);
      const isSelected = selectedTerritoryId === t.id;
      const isMoveSource = movingFromTerritoryId === t.id;
      
      // Calculate total units
      const totalUnits = (Object.values(t.units) as number[]).reduce((a, b) => a + b, 0);
      
      // Determine stroke
      let stroke = '#000';
      let strokeWidth = 1;
      
      if (isSelected) {
        stroke = '#fff';
        strokeWidth = 3;
      }
      if (isMoveSource) {
        stroke = '#4ade80'; // Green ring for moving source
        strokeWidth = 3;
      }

      return (
        <g key={t.id} onClick={() => onSelectTerritory(t.id)} className="cursor-pointer transition-all duration-300 hover:opacity-80">
          <path
            d={t.path}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            className="transition-colors duration-500"
          />
          
          {/* Unit Badge */}
          {totalUnits > 0 && (
             <g>
                <circle cx={t.centerX} cy={t.centerY - 20} r="12" fill="rgba(0,0,0,0.6)" stroke="#fff" strokeWidth="1" />
                <text 
                    x={t.centerX} 
                    y={t.centerY - 16} 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize="11" 
                    fontWeight="bold"
                    pointerEvents="none"
                >
                    {totalUnits}
                </text>
             </g>
          )}

          {/* Territory Name */}
          <text
            x={t.centerX}
            y={t.centerY + 5}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            className="pointer-events-none drop-shadow-md select-none"
            style={{ textShadow: '1px 1px 2px black' }}
          >
            {t.name.split(' ').map((line, i) => (
                <tspan x={t.centerX} dy={i === 0 ? 0 : 12} key={i}>{line}</tspan>
            ))}
          </text>
        </g>
      );
    });
  }, [territories, countries, selectedTerritoryId, movingFromTerritoryId]);

  return (
    <div className="w-full h-full bg-[#0a0a15] rounded-xl overflow-hidden shadow-inner border border-gray-700 relative">
        <svg viewBox="0 0 900 700" className="w-full h-full preserve-3d">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <g transform="translate(0,0)">
                {mapElements}
            </g>
        </svg>

        {/* Animation Layer */}
        {animations.map(anim => {
            const startT = territories.find(t => t.id === anim.fromId);
            const endT = territories.find(t => t.id === anim.toId);
            if (!startT || !endT) return null;

            // Simple scaling to match SVG viewbox to DOM coords approximately
            // Note: In a real responsive app, we'd use getBoundingClientRect or a proper transform matrix.
            // For this fixed SVG viewBox, we can assume percentage based logic or keep it simple if the container aspect ratio matches.
            // Assuming container is filling the relative parent, let's just use the viewbox coordinates directly inside the SVG, 
            // BUT wait, standard DIVs don't live in SVG coordinate space easily.
            // Let's render the animation inside the SVG as a foreignObject or simply animate a Circle element!
            
            // Re-implementation: Using SVG elements for animation
            return null;
        })}
        
        <svg className="absolute inset-0 pointer-events-none w-full h-full" viewBox="0 0 900 700">
            {animations.map(anim => {
                const startT = territories.find(t => t.id === anim.fromId);
                const endT = territories.find(t => t.id === anim.toId);
                if (!startT || !endT) return null;

                return (
                    <circle key={anim.id} r="8" fill={anim.type === 'ATTACK' ? 'red' : 'lightgreen'} stroke="white" strokeWidth="2">
                        <animate 
                            attributeName="cx" 
                            from={startT.centerX} 
                            to={endT.centerX} 
                            dur={`${anim.duration}ms`} 
                            fill="freeze" 
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1"
                        />
                        <animate 
                            attributeName="cy" 
                            from={startT.centerY} 
                            to={endT.centerY} 
                            dur={`${anim.duration}ms`} 
                            fill="freeze" 
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1"
                        />
                    </circle>
                );
            })}
        </svg>


        <div className="absolute bottom-4 left-4 bg-black/50 p-2 rounded text-xs text-gray-400 pointer-events-none">
            {movingFromTerritoryId ? 
                <span className="text-green-400 font-bold">SELECT TARGET TERRITORY TO MOVE ARMY</span> : 
                "Click a territory to inspect"}
        </div>
    </div>
  );
};

export default MapCanvas;
