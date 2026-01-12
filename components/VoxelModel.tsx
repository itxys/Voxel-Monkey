
import React, { useRef, useCallback, useState, useMemo } from 'react';
/* 
 * FIX: Import ThreeElements and augment the global JSX namespace 
 * to resolve 'Property does not exist on type JSX.IntrinsicElements' errors
 * for Three.js elements like <mesh />, <group />, <boxGeometry />, etc.
 */
import { Canvas, useThree, ThreeEvent, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Grid, Bounds, Edges, GizmoHelper, GizmoViewport, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Voxel, ToolType, Vector3 } from '../types';

/* FIX: Type augmentation for React Three Fiber intrinsic elements */
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Click distance threshold in pixels
const CLICK_THRESHOLD = 5;

interface VoxelBoxProps {
  voxel: Voxel;
  index: number;
  showOutlines: boolean;
  isPreview?: boolean;
  currentTool: ToolType;
  scale?: number | [number, number, number];
  onClick?: (e: ThreeEvent<MouseEvent>, index: number) => void;
  onHover?: (pos: Vector3 | null, placementPos: Vector3 | null) => void;
}

interface VoxelModelProps {
  voxels: Voxel[];
  previewVoxels?: Voxel[];
  onAddVoxel: (pos: Vector3, color?: string) => void;
  onRemoveVoxel: (index: number) => void;
  onUpdateVoxelColor: (index: number) => void;
  onPickColor: (index: number) => void;
  onHoverCoord?: (pos: Vector3 | null) => void;
  hoveredCoord: Vector3 | null;
  currentTool: ToolType;
  currentColor: string;
  gridSize: number;
  gridDensity: number;
  showOutlines: boolean;
}

const VoxelBox: React.FC<VoxelBoxProps> = ({ 
  voxel, index, showOutlines, isPreview, currentTool, scale = 1, onClick, onHover 
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const downPos = useRef({ x: 0, y: 0 });

  const getEmissive = () => {
    if (!isPreview && hovered) {
      if (currentTool === 'ERASER') return '#ff3333';
      if (currentTool === 'PAINT') return '#ffffff';
      if (currentTool === 'PICKER') return '#ffffff'; 
      if (currentTool === 'DUPLICATE') return '#00ccff';
    }
    return voxel.color;
  };

  const getEmissiveIntensity = () => {
    if (isPreview) return 0.5;
    if (hovered) {
      if (currentTool === 'PICKER') return 2.0; 
      if (currentTool === 'PAINT') return 1.2;
      return 0.8;
    }
    return 0.1;
  };

  const finalScale = useMemo(() => {
    if (hovered && !isPreview) {
      if (currentTool === 'ERASER') return 0.85; 
      if (currentTool === 'PAINT') return 1.05;
      if (currentTool === 'PICKER') return 1.1; 
    }
    return scale;
  }, [hovered, isPreview, currentTool, scale]);

  return (
    <mesh 
      ref={meshRef}
      position={voxel.position} 
      scale={finalScale}
      onPointerDown={(e) => {
        downPos.current = { x: e.screenX, y: e.screenY };
      }}
      onClick={(e) => {
        const dist = Math.hypot(e.screenX - downPos.current.x, e.screenY - downPos.current.y);
        if (dist < CLICK_THRESHOLD && onClick) {
          onClick(e, index);
        }
      }}
      onPointerOver={(e) => { 
        e.stopPropagation(); 
        setHovered(true);
        const normal = e.face?.normal;
        if (normal) {
          const placement: Vector3 = [
            voxel.position[0] + normal.x,
            voxel.position[1] + normal.y,
            voxel.position[2] + normal.z
          ];
          onHover?.(voxel.position, placement);
        } else {
          onHover?.(voxel.position, null);
        }
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        const normal = e.face?.normal;
        if (normal) {
          const placement: Vector3 = [
            voxel.position[0] + normal.x,
            voxel.position[1] + normal.y,
            voxel.position[2] + normal.z
          ];
          onHover?.(voxel.position, placement);
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(null, null);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={voxel.color} 
        roughness={isPreview ? 0.3 : 0.6} 
        metalness={isPreview ? 0.5 : 0.1}
        emissive={getEmissive()}
        emissiveIntensity={getEmissiveIntensity()}
        transparent={isPreview}
        opacity={isPreview ? 0.6 : 1.0}
      />
      {showOutlines && (
        <Edges
          threshold={15}
          color={isPreview ? "#ffffff" : (hovered && currentTool === 'ERASER' ? "#ff0000" : (hovered && currentTool === 'PICKER' ? "#ffffff" : "#000000"))}
          lineWidth={isPreview ? 1 : 1.5}
        />
      )}
    </mesh>
  );
};

const PlacementGhost: React.FC<{ 
  position: Vector3; 
  color: string;
}> = ({ position, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const s = 1.02 + Math.sin(state.clock.elapsedTime * 6) * 0.02;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={0.5} 
        depthWrite={false}
        emissive={color}
        emissiveIntensity={1.0}
      />
      <Edges color="#ffffff" lineWidth={2} />
    </mesh>
  );
};

const SnappingGuide: React.FC<{ position: Vector3; gridSize: number; color: string }> = ({ position, gridSize, color }) => {
  const [x, y, z] = position;
  const half = gridSize / 2;
  
  return (
    <group>
      {/* Horizontal X line on floor */}
      <Line
        points={[[-half, -0.49, z], [half, -0.49, z]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.3}
      />
      {/* Horizontal Z line on floor */}
      <Line
        points={[[x, -0.49, -half], [x, -0.49, half]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.3}
      />
      {/* Vertical tracking line */}
      <Line
        points={[[x, -0.5, z], [x, y, z]]}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.5}
      />
      {/* Target point glow on floor */}
      <mesh position={[x, -0.48, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
};

const InteractiveGrid: React.FC<{ 
  onAdd: (pos: Vector3) => void; 
  onHover: (pos: Vector3 | null, placementPos: Vector3 | null) => void;
  gridSize: number;
  gridDensity: number;
}> = ({ onAdd, onHover, gridSize, gridDensity }) => {
  const downPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    downPos.current = { x: e.screenX, y: e.screenY };
  };

  const handleGridClick = (e: ThreeEvent<MouseEvent>) => {
    const dist = Math.hypot(e.screenX - downPos.current.x, e.screenY - downPos.current.y);
    if (dist >= CLICK_THRESHOLD) return;

    e.stopPropagation();
    const point = e.point;
    const pos: Vector3 = [
      Math.floor(point.x + 0.5),
      Math.floor(point.y + 0.5),
      Math.floor(point.z + 0.5)
    ];
    onAdd(pos);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const point = e.point;
    const pos: Vector3 = [
      Math.floor(point.x + 0.5),
      Math.floor(point.y + 0.5),
      Math.floor(point.z + 0.5)
    ];
    onHover(pos, pos);
  };

  const sectionSize = useMemo(() => Math.max(1, Math.floor(10 / gridDensity)), [gridDensity]);

  return (
    <group>
      <Grid 
        position={[0, -0.52, 0]} 
        infiniteGrid 
        fadeDistance={Math.max(100, gridSize * 2)} 
        cellSize={gridDensity} 
        sectionSize={sectionSize} 
        sectionThickness={1.2} 
        sectionColor="#1a331a" 
        cellColor="#081108"
      />
      
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]} 
        onPointerDown={handlePointerDown}
        onClick={handleGridClick}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null, null)}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial transparent opacity={0} />
        <Grid 
          infiniteGrid={false} 
          fadeDistance={50} 
          cellSize={gridDensity} 
          sectionSize={Math.max(1, Math.floor(gridSize / (8 * gridDensity)))} 
          sectionColor="#33ff00" 
          sectionThickness={1.5}
          cellColor="#222"
          args={[gridSize, gridSize]}
        />
      </mesh>
    </group>
  );
};

const VoxelModel: React.FC<VoxelModelProps> = ({ 
  voxels, previewVoxels = [], onAddVoxel, onRemoveVoxel, onUpdateVoxelColor, onPickColor, onHoverCoord, hoveredCoord, currentTool, currentColor, gridSize, gridDensity, showOutlines 
}) => {
  const [placementPos, setPlacementPos] = useState<Vector3 | null>(null);

  const handleVoxelClick = useCallback((e: ThreeEvent<MouseEvent>, index: number) => {
    // Note: The logic inside handleVoxelClick is already guarded by the CLICK_THRESHOLD in VoxelBox
    e.stopPropagation();
    
    switch (currentTool) {
      case 'ERASER':
        onRemoveVoxel(index);
        break;
      case 'PAINT':
        onUpdateVoxelColor(index);
        break;
      case 'PICKER':
        onPickColor(index);
        break;
      case 'PENCIL':
      case 'DUPLICATE':
        const normal = e.face?.normal;
        if (normal) {
          const sourceVoxel = voxels[index];
          const newPos: Vector3 = [
            sourceVoxel.position[0] + normal.x,
            sourceVoxel.position[1] + normal.y,
            sourceVoxel.position[2] + normal.z
          ];
          
          const colorToUse = currentTool === 'DUPLICATE' ? sourceVoxel.color : undefined;
          onAddVoxel(newPos, colorToUse);
        }
        break;
      default:
        break;
    }
  }, [voxels, currentTool, onRemoveVoxel, onAddVoxel, onUpdateVoxelColor, onPickColor]);

  const handleHoverUpdate = useCallback((pos: Vector3 | null, placement: Vector3 | null) => {
    onHoverCoord?.(pos);
    setPlacementPos(placement);
  }, [onHoverCoord]);

  const ghostColor = useMemo(() => {
    if (currentTool === 'DUPLICATE' && placementPos) {
      const source = voxels.find(v => {
        const dx = Math.abs(v.position[0] - placementPos[0]);
        const dy = Math.abs(v.position[1] - placementPos[1]);
        const dz = Math.abs(v.position[2] - placementPos[2]);
        return (dx + dy + dz) === 1;
      });
      return source ? source.color : currentColor;
    }
    return currentColor;
  }, [currentTool, placementPos, voxels, currentColor]);

  return (
    <Canvas 
      shadows 
      gl={{ antialias: true }}
      camera={{ position: [gridSize * 1.5, gridSize, gridSize * 1.5], fov: 40 }}
      style={{ background: '#050505', width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={['#050505', 30, 180]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[gridSize, gridSize, gridSize]} intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      
      <Bounds clip margin={1.2}>
        <group>
          {voxels.map((v, i) => (
            <VoxelBox 
              key={`vox-${v.position[0]}-${v.position[1]}-${v.position[2]}`} 
              voxel={v} 
              index={i} 
              showOutlines={showOutlines}
              currentTool={currentTool}
              onClick={handleVoxelClick}
              onHover={handleHoverUpdate}
            />
          ))}
          {previewVoxels.map((v, i) => (
            <VoxelBox 
              key={`prev-${v.position[0]}-${v.position[1]}-${v.position[2]}`} 
              voxel={v} 
              index={i} 
              showOutlines={showOutlines}
              currentTool={currentTool}
              isPreview
              scale={0.9} 
            />
          ))}
          
          {placementPos && (currentTool === 'PENCIL' || currentTool === 'DUPLICATE') && !previewVoxels.length && (
            <>
              <PlacementGhost 
                position={placementPos} 
                color={ghostColor}
              />
              <SnappingGuide 
                position={placementPos} 
                gridSize={gridSize} 
                color={ghostColor} 
              />
            </>
          )}
        </group>
      </Bounds>

      <InteractiveGrid 
        onAdd={(pos) => onAddVoxel(pos)} 
        onHover={handleHoverUpdate}
        gridSize={gridSize}
        gridDensity={gridDensity}
      />
      
      <GizmoHelper alignment="bottom-right" margin={[40, 40]}>
        <GizmoViewport axisColors={['#ff4444', '#33ff00', '#4444ff']} labelColor="#ffffff" />
      </GizmoHelper>

      <OrbitControls 
        makeDefault 
        enableDamping={true} 
        dampingFactor={0.05}
        rotateSpeed={0.8}
        zoomSpeed={1.0}
        panSpeed={0.6}
        minDistance={2}
        maxDistance={gridSize * 5}
        enablePan={true}
        screenSpacePanning={true}
      />
    </Canvas>
  );
};

export default VoxelModel;
