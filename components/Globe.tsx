import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Station } from '../types';
import { latLongToVector3 } from '../services/api';
import { socialService, Listener, MessageCapsule } from '../services/social';
import { MessageSquare } from 'lucide-react';

interface GlobeProps {
  stations: Station[];
  onStationClick: (station: Station, allNearby: Station[]) => void;
  focusedLocation: { lat: number; lng: number } | null;
}

// ... (Shader code remains same) ...
const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
      gl_FragColor = vec4(0.4, 0.7, 1.0, 1.0) * intensity * 0.8;
    }
  `
};

const GLOBE_RADIUS = 5;

const GlobeScene: React.FC<GlobeProps> = ({ stations, onStationClick, focusedLocation }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Social State
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [capsules, setCapsules] = useState<MessageCapsule[]>([]);
  const [activeCapsule, setActiveCapsule] = useState<MessageCapsule | null>(null);
  const [isAddingCapsule, setIsAddingCapsule] = useState<{lat: number, lng: number} | null>(null);
  const [newMessage, setNewMessage] = useState('');

  // Subscribe to social updates
  useEffect(() => {
    const unsubListeners = socialService.subscribeListeners(setListeners);
    const unsubCapsules = socialService.subscribeCapsules(setCapsules);
    return () => {
      unsubListeners();
      unsubCapsules();
    };
  }, []);

  // ... (Textures & Points Geometry code remains same) ...
  // Load Textures
  // const colorMap = useMemo(() => new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'), []);
  // const bumpMap = useMemo(() => new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-topology.png'), []);
  
  // Create geometry for points
  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(stations.length * 3);
    const colors = new Float32Array(stations.length * 3);
    const color = new THREE.Color(0x00ff88); // Neon green

    stations.forEach((station, i) => {
      if (station.geo_lat !== null && station.geo_long !== null) {
        const pos = latLongToVector3(station.geo_lat, station.geo_long, GLOBE_RADIUS + 0.05);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [stations]);

  // Day/Night Cycle Shader Material
  const dayNightMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg') },
        nightTexture: { value: new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-night.jpg') },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) } // Initial sun position
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          float intensity = dot(vNormal, sunDirection);
          float mixFactor = smoothstep(-0.2, 0.2, intensity);
          vec3 finalColor = mix(nightColor, dayColor, mixFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
  }, []);

  // Update sun direction based on time (or just static for effect)
  // For a true visual, let's just put the sun at a fixed position in the "Universe" 
  // and let the camera/earth rotate.
  // But our controls rotate the CAMERA around the object.
  // To make the sun static relative to the user, we update sunDirection in the frame loop relative to camera?
  // Or just fix it in world space.
  useFrame(({ clock, camera }) => {
      if (globeRef.current) {
          // Optional: Rotate earth slowly if not interacting
          // globeRef.current.rotation.y += 0.001;
      }
      
      // Update sun direction to match the directional light position
      // This ensures the day side faces the light
      // Light is at [5, 3, 5]
      const sunPos = new THREE.Vector3(5, 3, 5).normalize();
      // We need to transform this into View Space because vNormal is in View Space
      sunPos.applyMatrix4(camera.matrixWorldInverse);
      
      dayNightMaterial.uniforms.sunDirection.value.copy(sunPos);
  });

  // Helper to get lat/lon from click point
  const getLatLonFromPoint = (point: THREE.Vector3) => {
    // Inverse of latLongToVector3 roughly
    // x = -r sin(phi) cos(theta)
    // y = r cos(phi)
    // z = r sin(phi) sin(theta)
    const r = GLOBE_RADIUS;
    const phi = Math.acos(point.y / r);
    const theta = Math.atan2(point.z, -point.x); // -x because of the original formula direction
    
    const lat = 90 - (phi * 180 / Math.PI);
    let lon = (theta * 180 / Math.PI) - 180;
    
    // Normalize lon to -180 to 180 if needed, but formula above usually outputs correctly
    // Fix longitude shift if necessary based on visual testing
    // The original formula: theta = (lon + 180) * (PI/180) -> lon = theta*180/PI - 180
    
    return { lat, lon };
  };

  // Handle Clicks
  const handleClick = (event: any) => {
    event.stopPropagation();
    if (!event.point) return;
    
    // Close active capsule if clicking elsewhere
    setActiveCapsule(null);
    setIsAddingCapsule(null);

    // 1. Check if clicking a capsule marker (handled by Html component, but if missed)
    // 2. Check closest station
    const point = event.point;
    let minDist = Infinity;
    let closestStation: Station | null = null;
    
    for (const station of stations) {
      if(station.geo_lat === null || station.geo_long === null) continue;
      const stationPos = latLongToVector3(station.geo_lat, station.geo_long, GLOBE_RADIUS);
      const dist = stationPos.distanceTo(point);
      if (dist < minDist) {
        minDist = dist;
        closestStation = station;
      }
    }

    // If clicked near a station
    if (closestStation && minDist < 0.5) {
        const nearby = stations.filter(s => {
             if (s.geo_lat === null || s.geo_long === null) return false;
             const sPos = latLongToVector3(s.geo_lat, s.geo_long, GLOBE_RADIUS);
             return sPos.distanceTo(point) < 0.2; 
        });
        onStationClick(closestStation, nearby);
    } else if (event.shiftKey) { 
      // SHIFT + CLICK to add a capsule
      const { lat, lon } = getLatLonFromPoint(point);
      setIsAddingCapsule({ lat, lng: lon });
    }
  };

  const handleAddCapsule = () => {
    if (isAddingCapsule && newMessage.trim()) {
      socialService.addCapsule(isAddingCapsule.lat, isAddingCapsule.lng, newMessage);
      setNewMessage('');
      setIsAddingCapsule(null);
    }
  };

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} />
      <directionalLight position={[-5, -3, -5]} intensity={1.0} color="#b0c4de" />
      
      <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />

      <group>
        {/* Atmosphere Glow */}
        <mesh scale={[1.1, 1.1, 1.1]}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <shaderMaterial
            attach="material"
            args={[AtmosphereShader]}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
          />
        </mesh>

        {/* Main Globe */}
        <mesh 
            ref={globeRef} 
            onClick={handleClick}
            onPointerOver={() => { document.body.style.cursor = 'crosshair'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <primitive object={dayNightMaterial} attach="material" />
        </mesh>

        {/* Station Points */}
        <points ref={pointsRef} geometry={pointsGeometry}>
           <pointsMaterial 
              size={0.08} 
              vertexColors 
              sizeAttenuation 
              transparent 
              opacity={0.8}
              map={new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/disc.png')}
              alphaTest={0.5}
           />
        </points>

        {/* Listener Markers (Glowing Dots) */}
        {listeners.map((l) => {
           const pos = latLongToVector3(l.lat, l.lng, GLOBE_RADIUS + 0.02);
           return (
             <mesh key={l.id} position={pos}>
               <sphereGeometry args={[0.03, 8, 8]} />
               <meshBasicMaterial color="#00bfff" transparent opacity={0.8} />
             </mesh>
           );
        })}

        {/* Capsule Markers */}
        {capsules.map((c) => {
           const pos = latLongToVector3(c.lat, c.lng, GLOBE_RADIUS + 0.08);
           return (
             <group key={c.id} position={pos}>
               <Html distanceFactor={10} zIndexRange={[100, 0]}>
                 <div 
                    className="cursor-pointer group"
                    onClick={(e) => { e.stopPropagation(); setActiveCapsule(c); }}
                 >
                   <div className="w-6 h-6 bg-yellow-400/20 backdrop-blur-md rounded-full flex items-center justify-center border border-yellow-400 animate-pulse hover:scale-110 transition-transform">
                     <MessageSquare size={12} className="text-yellow-400" />
                   </div>
                   {/* Hover Preview */}
                   <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black/80 text-xs p-2 rounded text-center whitespace-normal pointer-events-none">
                     {c.author}
                   </div>
                 </div>
               </Html>
             </group>
           );
        })}

        {/* Active Capsule Modal (3D Overlay) */}
        {activeCapsule && (
           <Html position={latLongToVector3(activeCapsule.lat, activeCapsule.lng, GLOBE_RADIUS + 0.2)} center zIndexRange={[1000, 0]}>
             <div className="w-64 bg-black/90 border border-yellow-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl transform scale-100 transition-all">
               <div className="flex justify-between items-start mb-2">
                 <span className="text-yellow-400 text-xs font-bold tracking-wider uppercase">Sound Capsule</span>
                 <button onClick={(e) => { e.stopPropagation(); setActiveCapsule(null); }} className="text-gray-500 hover:text-white"><div className="w-4 h-4">×</div></button>
               </div>
               <p className="text-white text-sm leading-relaxed font-light">"{activeCapsule.message}"</p>
               <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-gray-400">
                  <span>By {activeCapsule.author}</span>
                  <span>{new Date(activeCapsule.timestamp).toLocaleDateString()}</span>
               </div>
             </div>
           </Html>
        )}

        {/* Add Capsule Input (3D Overlay) */}
        {isAddingCapsule && (
           <Html position={latLongToVector3(isAddingCapsule.lat, isAddingCapsule.lng, GLOBE_RADIUS + 0.2)} center zIndexRange={[1000, 0]}>
             <div className="w-64 bg-black/90 border border-green-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
               <h4 className="text-green-400 text-xs font-bold mb-2 uppercase">Leave a Message</h4>
               <textarea 
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder="Write something for the universe..."
                 className="w-full bg-white/10 border border-white/10 rounded p-2 text-sm text-white h-20 mb-2 focus:outline-none focus:border-green-500"
                 onClick={(e) => e.stopPropagation()} // Prevent globe click
               />
               <div className="flex justify-end space-x-2">
                 <button onClick={(e) => { e.stopPropagation(); setIsAddingCapsule(null); }} className="px-3 py-1 text-xs text-gray-400 hover:text-white">Cancel</button>
                 <button onClick={(e) => { e.stopPropagation(); handleAddCapsule(); }} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white">Drop Capsule</button>
               </div>
             </div>
           </Html>
        )}

      </group>

      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        enableZoom={true} 
        minDistance={6} 
        maxDistance={15}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={!focusedLocation && !activeCapsule && !isAddingCapsule} 
        autoRotateSpeed={0.5}
        dampingFactor={0.05}
      />
    </>
  );
};

export default GlobeScene;
