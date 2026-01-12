
import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import VoxelModel from './components/VoxelModel';
import RetroButton from './components/UI/RetroButton';
import { Voxel, ToolType, Vector3, Language, Project, ViewType } from './types';
import { translations } from './i18n';
import { PALETTE, DEFAULT_COLOR, DEFAULT_GRID_SIZE, MAX_GRID_SIZE, MIN_GRID_SIZE } from './constants';
import { generateVoxelPrompt } from './services/geminiService';
import { 
  Trash2, Eraser, PenTool, Pipette, Save, Download, RotateCcw, RotateCw, 
  Languages, Sparkles, Move3d, Box, Check, X, Layers, Copy, Palette, 
  Target, FolderOpen, RefreshCw, ChevronUp, ChevronDown, Menu, Hash, Undo2,
  Library, Plus, ArrowLeft, Clock, Database, Terminal
} from 'lucide-react';

const PROJECTS_STORAGE_KEY = 'voxel-monkey-projects-v2';

const App: React.FC = () => {
  // State for Editor
  const [voxels, setVoxels] = useState<Voxel[]>([]);
  const [previewVoxels, setPreviewVoxels] = useState<Voxel[] | null>(null);
  const originalPreviewRef = useRef<Voxel[] | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Tape');
  
  // App Navigation
  const [view, setView] = useState<ViewType>('EDITOR');
  const [projects, setProjects] = useState<Project[]>([]);

  // Editor Settings
  const [currentTool, setCurrentTool] = useState<ToolType>('PENCIL');
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [gridDensity, setGridDensity] = useState(1);
  const [showOutlines, setShowOutlines] = useState(true);
  const [history, setHistory] = useState<Voxel[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOverrideColor, setPreviewOverrideColor] = useState<string | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<Vector3 | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const t = translations[language];

  // History Management
  const recordHistory = useCallback((newVoxels: Voxel[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push([...newVoxels]);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [history, historyStep]);

  const undo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setVoxels([...history[prevStep]]);
      setHistoryStep(prevStep);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setVoxels([...history[nextStep]]);
      setHistoryStep(nextStep);
    }
  };

  // Voxel Operations
  const addVoxel = (pos: Vector3, overrideColor?: string) => {
    const exists = voxels.some(v => v.position[0] === pos[0] && v.position[1] === pos[1] && v.position[2] === pos[2]);
    if (!exists) {
      const newVoxels = [...voxels, { position: pos, color: overrideColor || currentColor }];
      setVoxels(newVoxels);
      recordHistory(newVoxels);
    }
  };

  const removeVoxel = (index: number) => {
    const newVoxels = voxels.filter((_, i) => i !== index);
    setVoxels(newVoxels);
    recordHistory(newVoxels);
  };

  const updateVoxelColor = (index: number) => {
    const newVoxels = [...voxels];
    newVoxels[index].color = currentColor;
    setVoxels(newVoxels);
    recordHistory(newVoxels);
  };

  const handlePickColor = (index: number) => {
    setCurrentColor(voxels[index].color);
    setCurrentTool('PENCIL');
  };

  const handleClear = () => {
    if (confirm("Format memory? All unsaved patterns will be lost.")) {
      setVoxels([]);
      recordHistory([]);
    }
  };

  // Project Management
  const loadProjectsFromStorage = useCallback(() => {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse projects", e);
        setProjects([]);
      }
    }
  }, []);

  const saveProjectsToStorage = (updatedProjects: Project[]) => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const handleSave = () => {
    const name = prompt(t.ui.project_name, currentProjectName) || currentProjectName;
    const newId = currentProjectId || crypto.randomUUID();
    
    const newProject: Project = {
      id: newId,
      name,
      timestamp: Date.now(),
      voxels,
      gridSize,
      gridDensity,
      currentColor
    };

    const updatedProjects = currentProjectId 
      ? projects.map(p => p.id === currentProjectId ? newProject : p)
      : [newProject, ...projects];

    saveProjectsToStorage(updatedProjects);
    setCurrentProjectId(newId);
    setCurrentProjectName(name);
    alert(t.ui.save_success);
  };

  const loadProject = (project: Project) => {
    setVoxels(project.voxels);
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setGridSize(project.gridSize);
    setGridDensity(project.gridDensity);
    setCurrentColor(project.currentColor);
    setHistory([project.voxels]);
    setHistoryStep(0);
    setView('EDITOR');
  };

  const deleteProject = (id: string) => {
    if (confirm(t.ui.confirm_delete)) {
      const updated = projects.filter(p => p.id !== id);
      saveProjectsToStorage(updated);
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setCurrentProjectName('Untitled Tape');
      }
    }
  };

  const startNewProject = () => {
    setVoxels([]);
    setCurrentProjectId(null);
    setCurrentProjectName('Untitled Tape');
    setGridSize(DEFAULT_GRID_SIZE);
    setGridDensity(1);
    setHistory([]);
    setHistoryStep(-1);
    setView('EDITOR');
  };

  // AI Logic
  const handleAiRequest = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setPreviewVoxels(null);
    originalPreviewRef.current = null;
    
    const result = await generateVoxelPrompt(aiPrompt, gridSize);
    if (result) {
      const mapped: Voxel[] = result.map((r: any) => ({
        position: [r.x, r.y, r.z],
        color: r.color
      }));
      originalPreviewRef.current = mapped;
      setPreviewVoxels(mapped);
      setIsConsoleOpen(true); 
    }
    setIsGenerating(false);
  };

  const updatePreviewColor = (hex: string | null) => {
    setPreviewOverrideColor(hex);
    if (!originalPreviewRef.current) return;
    if (!hex) {
      setPreviewVoxels([...originalPreviewRef.current]);
      return;
    }

    const targetColor = new THREE.Color(hex);
    const targetHsl = { h: 0, s: 0, l: 0 };
    targetColor.getHSL(targetHsl);

    const updated = originalPreviewRef.current.map(v => {
      const voxelColor = new THREE.Color(v.color);
      const voxelHsl = { h: 0, s: 0, l: 0 };
      voxelColor.getHSL(voxelHsl);

      const finalColor = new THREE.Color();
      finalColor.setHSL(targetHsl.h, Math.min(targetHsl.s, voxelHsl.s * 1.2), voxelHsl.l);
      return { ...v, color: `#${finalColor.getHexString()}` };
    });
    setPreviewVoxels(updated);
  };

  const applyPreview = (mode: 'replace' | 'append') => {
    if (!previewVoxels) return;
    const newVoxels = mode === 'replace' ? [...previewVoxels] : [...voxels, ...previewVoxels];
    setVoxels(newVoxels);
    recordHistory(newVoxels);
    setPreviewVoxels(null);
  };

  useEffect(() => { loadProjectsFromStorage(); }, [loadProjectsFromStorage]);

  const SidebarContent = () => (
    <div className="flex flex-col gap-6 h-full">
      <div className="bg-[#0a0a0a] p-3 border-2 border-[#444] rounded shadow-inner flex flex-col items-center gap-3">
        {/* Logo/Icon Container */}
        <div className="w-16 h-16 bg-[#1a1a1a] border-2 border-[#33ff00] rounded-lg flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[#33ff00] opacity-5 animate-pulse"></div>
          <img 
            src="/ui/icon.png" 
            alt="VM" 
            className="w-12 h-12 object-contain crt-flicker"
            onError={(e) => {
              // Fallback to a themed icon if image is missing
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
            }}
          />
          <Box className="fallback-icon hidden text-[#33ff00]" size={32} />
        </div>
        
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tighter text-[#33ff00] crt-flicker uppercase">
            {t.title}
          </h1>
          <p className="text-[10px] text-[#33ff00] opacity-60 font-mono uppercase tracking-widest mt-1">
            {currentProjectName.substring(0, 16)} // {currentProjectId ? 'SYNCED' : 'TEMP'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <RetroButton onClick={() => setView('GALLERY')} className="w-full bg-[#3a3a3a] border-[#555] text-white">
          <Library size={16} /> {t.ui.library}
        </RetroButton>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RetroButton active={currentTool === 'PENCIL'} onClick={() => setCurrentTool('PENCIL')}>
          <PenTool size={16} /> <span className="hidden sm:inline">{t.tools.pencil}</span>
        </RetroButton>
        <RetroButton active={currentTool === 'ERASER'} onClick={() => setCurrentTool('ERASER')}>
          <Eraser size={16} /> <span className="hidden sm:inline">{t.tools.eraser}</span>
        </RetroButton>
        <RetroButton active={currentTool === 'PAINT'} onClick={() => setCurrentTool('PAINT')}>
          <Sparkles size={16} /> <span className="hidden sm:inline">{t.tools.paint}</span>
        </RetroButton>
        <RetroButton active={currentTool === 'PICKER'} onClick={() => setCurrentTool('PICKER')}>
          <Pipette size={16} /> <span className="hidden sm:inline">{t.tools.picker}</span>
        </RetroButton>
      </div>

      <div className="bg-[#1a1a1a] p-3 border border-[#444] flex flex-col gap-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-2">
              <Move3d size={12} /> {t.ui.gridSize}
            </label>
            <span className="text-xs font-mono text-[#33ff00]">{gridSize}x{gridSize}</span>
          </div>
          <input 
            type="range" min={MIN_GRID_SIZE} max={MAX_GRID_SIZE} step={2}
            value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#33ff00]"
          />
        </div>
        <RetroButton active={showOutlines} onClick={() => setShowOutlines(!showOutlines)}>
          <Box size={14} /> {t.ui.outlines}: {showOutlines ? 'ON' : 'OFF'}
        </RetroButton>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">{t.ui.colors}</label>
        <div className="grid grid-cols-5 gap-1 p-2 bg-[#1a1a1a] border border-[#444]">
          {PALETTE.map(color => (
            <button
              key={color}
              className={`w-full aspect-square border-2 ${currentColor === color ? 'border-white scale-110 z-10' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-[#333] border-l-4 border-[#33ff00] flex flex-col gap-2">
        <label className="text-[10px] font-bold text-[#33ff00] uppercase tracking-wider">{t.tools.ai_assist}</label>
        {previewVoxels ? (
          <div className="flex flex-col gap-3">
            <div className="text-[10px] text-[#33ff00] font-bold animate-pulse text-center uppercase">{t.ui.ai_preview_title}</div>
            <div className="grid grid-cols-2 gap-2">
              <RetroButton onClick={() => updatePreviewColor(currentColor)} className="text-[8px]"><Palette size={10} /></RetroButton>
              <RetroButton onClick={() => updatePreviewColor(null)} className="text-[8px]"><Undo2 size={10} /></RetroButton>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <RetroButton variant="success" onClick={() => applyPreview('replace')} className="text-[9px]"><Check size={12} /></RetroButton>
              <RetroButton variant="success" onClick={() => applyPreview('append')} className="text-[9px]"><Layers size={12} /></RetroButton>
              <RetroButton variant="danger" onClick={() => setPreviewVoxels(null)} className="text-[9px]"><X size={12} /></RetroButton>
            </div>
          </div>
        ) : (
          <>
            <textarea 
              value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t.ui.ai_prompt_placeholder}
              className="bg-[#1a1a1a] text-[#33ff00] text-xs p-2 border border-[#444] focus:outline-none resize-none h-16"
            />
            <RetroButton variant="success" onClick={handleAiRequest} disabled={isGenerating}>
              <Sparkles size={14} /> {isGenerating ? '...' : t.ui.ai_button}
            </RetroButton>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <RetroButton onClick={undo}><RotateCcw size={14} /></RetroButton>
        <RetroButton onClick={redo}><RotateCw size={14} /></RetroButton>
        <RetroButton variant="success" onClick={handleSave}><Save size={14} /> {t.ui.save}</RetroButton>
        <RetroButton onClick={handleClear} variant="danger"><Trash2 size={14} /></RetroButton>
      </div>

      <div className="flex justify-between items-center border-t border-[#444] pt-4 pb-2">
        <RetroButton onClick={() => setLanguage(l => l === Language.EN ? Language.CN : Language.EN)}>
          <Languages size={14} /> {language.toUpperCase()}
        </RetroButton>
        <span className="text-[8px] opacity-30 font-mono tracking-widest">VM_v.2.1</span>
      </div>
    </div>
  );

  const GalleryView = () => (
    <div className="flex-1 flex flex-col p-4 sm:p-8 bg-[#0a0a0a] overflow-y-auto">
      <div className="flex justify-between items-center mb-8 border-b-2 border-[#33ff00] pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1a1a1a] border border-[#33ff00] rounded flex items-center justify-center">
            <img src="/ui/icon.png" alt="" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=monkey'} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#33ff00] tracking-tighter uppercase flex items-center gap-4">
              <Library size={24} /> {t.ui.library}
            </h2>
            <p className="text-[10px] text-[#33ff00]/60 font-mono uppercase tracking-[0.2em] mt-1">Found {projects.length} recorded tapes</p>
          </div>
        </div>
        <div className="flex gap-4">
          <RetroButton variant="success" onClick={startNewProject}>
            <Plus size={16} /> {t.ui.new_project}
          </RetroButton>
          <RetroButton onClick={() => setView('EDITOR')}>
            <ArrowLeft size={16} /> {t.ui.back_to_editor}
          </RetroButton>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-40">
          <Database size={64} className="mb-4" />
          <p className="font-mono text-sm tracking-widest">{t.ui.no_projects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-[#1a1a1a] border-2 border-[#333] p-4 flex flex-col gap-4 hover:border-[#33ff00] transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                 <Clock size={40} />
              </div>
              <div>
                <h3 className="text-[#33ff00] font-bold text-lg truncate uppercase">{proj.name}</h3>
                <div className="flex gap-4 mt-2 font-mono text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Box size={10} /> {proj.voxels.length} {t.ui.voxels_count}</span>
                  <span className="flex items-center gap-1"><Move3d size={10} /> {proj.gridSize}^3</span>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-[#333] flex justify-between items-center">
                <span className="text-[8px] text-gray-500 font-mono">
                  {t.ui.last_modified}: {new Date(proj.timestamp).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                   <RetroButton onClick={() => loadProject(proj)} className="px-4 py-1">LOAD</RetroButton>
                   <RetroButton variant="danger" onClick={() => deleteProject(proj.id)} className="p-1 px-2"><Trash2 size={12} /></RetroButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#e5e5e5] select-none overflow-hidden lg:flex-row">
      {view === 'EDITOR' ? (
        <>
          <aside className="hidden lg:flex w-80 bg-[#2a2a2a] border-r-4 border-black p-4 flex-col gap-6 z-20 shadow-2xl overflow-y-auto shrink-0">
            <SidebarContent />
          </aside>

          <main className="flex-1 relative flex flex-col min-h-0">
            <header className="lg:hidden flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b-2 border-black z-30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#1a1a1a] border border-[#33ff00] rounded flex items-center justify-center p-1">
                  <img src="/ui/icon.png" alt="" className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=monkey'} />
                </div>
                <span className="font-bold text-xs tracking-tighter text-[#33ff00] uppercase truncate max-w-[120px]">{currentProjectName}</span>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setView('GALLERY')} className="p-2 bg-[#3a3a3a] border border-[#555] rounded text-[#33ff00]"><Library size={14} /></button>
                 <button onClick={handleSave} className="p-2 bg-[#3a3a3a] border border-[#555] rounded"><Save size={14} /></button>
                 <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className={`p-2 border rounded ${isConsoleOpen ? 'bg-[#33ff00] text-black border-white' : 'bg-[#3a3a3a] border-[#555]'}`}>
                   <Menu size={14} />
                 </button>
              </div>
            </header>

            <div className="flex-1 relative cursor-crosshair">
              <VoxelModel 
                voxels={voxels} 
                previewVoxels={previewVoxels || []}
                onAddVoxel={addVoxel} onRemoveVoxel={removeVoxel}
                onUpdateVoxelColor={updateVoxelColor} onPickColor={handlePickColor}
                onHoverCoord={setHoveredCoord} hoveredCoord={hoveredCoord}
                currentTool={currentTool} currentColor={currentColor}
                gridSize={gridSize} gridDensity={gridDensity} showOutlines={showOutlines}
              />
              
              <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none opacity-60 font-mono text-[9px] lg:text-[10px]">
                <div className="bg-black/60 backdrop-blur-sm p-1.5 border border-white/10 flex justify-between gap-4">
                  <span className="text-gray-500 uppercase">Voxels</span>
                  <span className="text-[#33ff00]">{voxels.length.toString().padStart(4, '0')}</span>
                </div>
                <div className="bg-black/60 backdrop-blur-sm p-1.5 border border-white/10 flex justify-between gap-4">
                  <span className="text-gray-500 uppercase">Tool</span>
                  <span className="text-[#33ff00]">{currentTool}</span>
                </div>
              </div>
            </div>

            <div className="lg:hidden flex items-center justify-around bg-[#2a2a2a] border-t-2 border-black p-2 pb-safe z-30 shrink-0">
              <button onClick={() => setCurrentTool('PENCIL')} className={`p-3 rounded-full transition-all ${currentTool === 'PENCIL' ? 'bg-[#33ff00] text-black scale-110 shadow-lg' : 'text-gray-400 hover:bg-white/10'}`}><PenTool size={20} /></button>
              <button onClick={() => setCurrentTool('ERASER')} className={`p-3 rounded-full transition-all ${currentTool === 'ERASER' ? 'bg-[#ff6b6b] text-white scale-110 shadow-lg' : 'text-gray-400 hover:bg-white/10'}`}><Eraser size={20} /></button>
              <button onClick={() => setCurrentTool('PAINT')} className={`p-3 rounded-full transition-all ${currentTool === 'PAINT' ? 'bg-[#ffb000] text-black scale-110 shadow-lg' : 'text-gray-400 hover:bg-white/10'}`}><Sparkles size={20} /></button>
              <div className="w-10 h-10 border-2 border-white rounded-md overflow-hidden relative shrink-0">
                <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="absolute inset-0 w-full h-full scale-150 cursor-pointer" />
              </div>
              <button onClick={() => setIsConsoleOpen(true)} className="p-3 rounded-full text-gray-400 hover:bg-white/10"><ChevronUp size={20} /></button>
            </div>

            {isConsoleOpen && (
              <div className="lg:hidden absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-bold text-[#33ff00] tracking-widest uppercase">System Console</h2>
                  <button onClick={() => setIsConsoleOpen(false)} className="p-2 bg-white/10 rounded-full"><ChevronDown size={20} /></button>
                </div>
                <div className="flex-1">
                  <SidebarContent />
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        <GalleryView />
      )}
    </div>
  );
};

export default App;
