'use client';

import { useState, useRef } from 'react';
import { 
  CinemaObject, 
  Shot, 
  SyncPoint, 
  Action, 
  ActionType,
  CameraPath,
  CinemaProperties,
  Keyframe,
  ACTION_TYPE_LABELS,
  createDefaultCinema,
  createDefaultShot,
  createDefaultSyncPoint,
  createDefaultAction,
  createDefaultCameraPath,
  createDefaultKeyframe,
} from '@/types/cinema';
import { exportCinema, exportMultipleCinemas } from '@/utils/exporter';
import { parseCinemaFile } from '@/utils/parser';
import { 
  Plus, 
  Trash2, 
  Camera, 
  MessageSquare, 
  Zap, 
  Eye, 
  Play, 
  Box, 
  Target,
  Download,
  ChevronDown,
  ChevronRight,
  Film,
  Clock,
  Clapperboard,
  Copy,
  Upload,
  Video,
  Settings,
  HelpCircle
} from 'lucide-react';

// Reusable tooltip component for field explanations
function FieldHelp({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group cursor-help ml-1">
      <HelpCircle className="w-4 h-4 text-gray-500 hover:text-gray-300" />
      <span className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-gray-700">
        {text}
      </span>
    </span>
  );
}

const ACTION_ICONS: Record<ActionType, typeof Camera> = {
  camera: Camera,
  dialog: MessageSquare,
  pop: Zap,
  fade: Eye,
  charAnim: Play,
  objAnim: Box,
  trigger: Target,
};

export default function CutsceneEditor() {
  const [cinemas, setCinemas] = useState<CinemaObject[]>([createDefaultCinema()]);
  const [selectedCinemaIndex, setSelectedCinemaIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'shots' | 'syncpoints' | 'actions' | 'camerapaths'>('shots');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [showCinemaProps, setShowCinemaProps] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Current cinema shorthand
  const cinema = cinemas[selectedCinemaIndex];
  
  // Update current cinema helper
  const setCinema = (updater: CinemaObject | ((prev: CinemaObject) => CinemaObject)) => {
    setCinemas(prev => {
      const newCinemas = [...prev];
      newCinemas[selectedCinemaIndex] = typeof updater === 'function' 
        ? updater(prev[selectedCinemaIndex]) 
        : updater;
      return newCinemas;
    });
  };
  
  // Add new cinema
  const addCinema = () => {
    const newCinema = createDefaultCinema();
    newCinema.objName = `Cinema ${cinemas.length + 1}`;
    newCinema.guid = `NEW_GUID_${Date.now().toString(16).toUpperCase()}`;
    setCinemas(prev => [...prev, newCinema]);
    setSelectedCinemaIndex(cinemas.length);
  };
  
  // Delete current cinema
  const deleteCinema = () => {
    if (cinemas.length <= 1) return;
    setCinemas(prev => prev.filter((_, i) => i !== selectedCinemaIndex));
    setSelectedCinemaIndex(Math.max(0, selectedCinemaIndex - 1));
  };
  
  // Duplicate current cinema
  const duplicateCinema = () => {
    const copy = JSON.parse(JSON.stringify(cinema)) as CinemaObject;
    copy.objName = `${cinema.objName} (Copy)`;
    copy.guid = `COPY_GUID_${Date.now().toString(16).toUpperCase()}`;
    setCinemas(prev => [...prev, copy]);
    setSelectedCinemaIndex(cinemas.length);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Cinema header handlers
  const updateCinemaHeader = (field: keyof CinemaObject, value: string | number) => {
    setCinema(prev => ({ ...prev, [field]: value }));
  };

  // Shot handlers
  const addShot = () => {
    const newShot = createDefaultShot(cinema.shots.length);
    setCinema(prev => ({ ...prev, shots: [...prev.shots, newShot] }));
  };

  const updateShot = (id: string, field: keyof Shot, value: string | number) => {
    setCinema(prev => ({
      ...prev,
      shots: prev.shots.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const deleteShot = (id: string) => {
    setCinema(prev => ({
      ...prev,
      shots: prev.shots.filter(s => s.id !== id).map((s, i) => ({ ...s, index: i }))
    }));
  };

  // SyncPoint handlers
  const addSyncPoint = () => {
    const newSP = createDefaultSyncPoint(cinema.syncPoints.length, 0);
    setCinema(prev => ({ ...prev, syncPoints: [...prev.syncPoints, newSP] }));
  };

  const updateSyncPoint = (id: string, field: keyof SyncPoint, value: string | number) => {
    setCinema(prev => ({
      ...prev,
      syncPoints: prev.syncPoints.map(sp => sp.id === id ? { ...sp, [field]: value } : sp)
    }));
  };

  const deleteSyncPoint = (id: string) => {
    setCinema(prev => ({
      ...prev,
      syncPoints: prev.syncPoints.filter(sp => sp.id !== id).map((sp, i) => ({ ...sp, index: i }))
    }));
  };

  // Action handlers
  const addAction = (type: ActionType) => {
    const newAction = createDefaultAction(type, cinema.actions.length);
    setCinema(prev => ({ ...prev, actions: [...prev.actions, newAction] }));
  };

  const updateAction = (id: string, field: string, value: unknown) => {
    setCinema(prev => ({
      ...prev,
      actions: prev.actions.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const deleteAction = (id: string) => {
    setCinema(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== id).map((a, i) => ({ ...a, index: i }))
    }));
  };

  const reorderActions = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setCinema(prev => {
      const actions = [...prev.actions];
      const fromIndex = actions.findIndex(a => a.id === sourceId);
      const toIndex = actions.findIndex(a => a.id === targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }

      const [moved] = actions.splice(fromIndex, 1);
      actions.splice(toIndex, 0, moved);

      const reindexed = actions.map((a, i) => ({ ...a, index: i }));
      return { ...prev, actions: reindexed };
    });
  };

  // Participant handlers
  const addParticipant = () => {
    setCinema(prev => ({
      ...prev,
      participants: [...prev.participants, '00000000_00000000']
    }));
  };

  const updateParticipant = (index: number, value: string) => {
    setCinema(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => i === index ? value : p)
    }));
  };

  const deleteParticipant = (index: number) => {
    setCinema(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  // CameraPath handlers
  const addCameraPath = () => {
    const suffix = (cinema.cameraPaths.length + 1).toString().padStart(8, '1');
    const newCP = createDefaultCameraPath(suffix);
    setCinema(prev => ({ ...prev, cameraPaths: [...prev.cameraPaths, newCP] }));
  };

  const updateCameraPath = (id: string, field: string, value: unknown) => {
    setCinema(prev => ({
      ...prev,
      cameraPaths: prev.cameraPaths.map(cp => cp.id === id ? { ...cp, [field]: value } : cp)
    }));
  };

  const deleteCameraPath = (id: string) => {
    setCinema(prev => ({
      ...prev,
      cameraPaths: prev.cameraPaths.filter(cp => cp.id !== id)
    }));
  };

  // Cinema properties handler
  const updateCinemaProperty = (field: keyof CinemaProperties, value: unknown) => {
    setCinema(prev => ({
      ...prev,
      properties: { ...prev.properties, [field]: value }
    }));
  };

  // Export handler - exports all cinemas
  const handleExport = () => {
    const output = exportMultipleCinemas(cinemas);
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = cinemas.length === 1 
      ? `${cinema.objName.replace(/\s+/g, '_')}.EXPORT.TXT`
      : 'CINEMAS.EXPORT.TXT';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard - copies all cinemas
  const handleCopy = async () => {
    const output = exportMultipleCinemas(cinemas);
    await navigator.clipboard.writeText(output);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Import file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCinemaFile(content);
      if (parsed.length > 0) {
        setCinemas(parsed);
        setSelectedCinemaIndex(0);
        setExpandedItems(new Set());
      } else {
        alert('Failed to parse cinema file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/movie.svg"
              alt="Hobbit Cutscene Editor"
              className="w-8 h-8"
            />
            <h1 className="text-2xl font-bold">Hobbit Cutscene Editor</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".txt,.TXT"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => setShowExport(!showExport)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Cinema Selector Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Cinemas ({cinemas.length}):</span>
          <div className="flex items-center gap-2 flex-wrap">
            {cinemas.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedCinemaIndex(i)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  i === selectedCinemaIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {c.objName || `Cinema ${i + 1}`}
              </button>
            ))}
            <button
              onClick={addCinema}
              className="px-3 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-500 transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={duplicateCinema}
              className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 transition"
            >
              Duplicate
            </button>
            {cinemas.length > 1 && (
              <button
                onClick={deleteCinema}
                className="px-3 py-1.5 text-xs rounded bg-red-600/80 hover:bg-red-500 transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <main className={`flex-1 p-6 ${showExport ? 'w-1/2' : 'w-full'}`}>
          {/* Cinema Header */}
          <section className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowCinemaProps(!showCinemaProps)}
            >
              {showCinemaProps ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <Clapperboard className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Cinema Properties</h2>
              <span className="text-gray-500 text-sm ml-2">- {cinema.objName}</span>
            </div>
            
            {/* Basic Properties - Always Visible */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">GUID</label>
                <input
                  type="text"
                  value={cinema.guid}
                  onChange={e => updateCinemaHeader('guid', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={cinema.objName}
                  onChange={e => updateCinemaHeader('objName', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration</label>
                <input
                  type="number"
                  step="0.1"
                  value={cinema.duration}
                  onChange={e => updateCinemaHeader('duration', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Advanced Properties - Expandable */}
            {showCinemaProps && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Advanced Properties
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Initial Shot</label>
                    <input type="number" value={cinema.properties.initialShot} onChange={e => updateCinemaProperty('initialShot', parseInt(e.target.value) || 0)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Skippable</label>
                    <select value={cinema.properties.skippable} onChange={e => updateCinemaProperty('skippable', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Letterbox</label>
                    <select value={cinema.properties.letterbox} onChange={e => updateCinemaProperty('letterbox', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Repeatable</label>
                    <select value={cinema.properties.repeatable} onChange={e => updateCinemaProperty('repeatable', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bilbo Invisible</label>
                    <select value={cinema.properties.bilboInvisible} onChange={e => updateCinemaProperty('bilboInvisible', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pop At End</label>
                    <select value={cinema.properties.popAtEnd} onChange={e => updateCinemaProperty('popAtEnd', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Has Intro Trans</label>
                    <select value={cinema.properties.hasIntroTrans} onChange={e => updateCinemaProperty('hasIntroTrans', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Has Outro Trans</label>
                    <select value={cinema.properties.hasOutroTrans} onChange={e => updateCinemaProperty('hasOutroTrans', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Force No Weapon</label>
                    <select value={cinema.properties.forceNoWeapon} onChange={e => updateCinemaProperty('forceNoWeapon', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Force Use Stick</label>
                    <select value={cinema.properties.forceUseStick} onChange={e => updateCinemaProperty('forceUseStick', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Force Use Sting</label>
                    <select value={cinema.properties.forceUseSting} onChange={e => updateCinemaProperty('forceUseSting', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Disable Control</label>
                    <select value={cinema.properties.disableControl} onChange={e => updateCinemaProperty('disableControl', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['shots', 'syncpoints', 'actions', 'camerapaths'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedTab === tab 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab === 'shots' && <Camera className="w-4 h-4 inline mr-2" />}
                {tab === 'syncpoints' && <Clock className="w-4 h-4 inline mr-2" />}
                {tab === 'actions' && <Zap className="w-4 h-4 inline mr-2" />}
                {tab === 'camerapaths' && <Video className="w-4 h-4 inline mr-2" />}
                {tab === 'camerapaths' ? 'Camera Paths' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded text-xs">
                  {tab === 'shots' ? cinema.shots.length : 
                   tab === 'syncpoints' ? cinema.syncPoints.length : 
                   tab === 'actions' ? cinema.actions.length :
                   cinema.cameraPaths.length}
                </span>
              </button>
            ))}
          </div>

          {/* Shots Tab */}
          {selectedTab === 'shots' && (
            <section className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold">Shots</h3>
                <button
                  onClick={addShot}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1 text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Shot
                </button>
              </div>
              <div className="divide-y divide-gray-800">
                {cinema.shots.map(shot => (
                  <ShotItem
                    key={shot.id}
                    shot={shot}
                    isExpanded={expandedItems.has(shot.id)}
                    onToggle={() => toggleExpanded(shot.id)}
                    onUpdate={(field, value) => updateShot(shot.id, field, value)}
                    onDelete={() => deleteShot(shot.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SyncPoints Tab */}
          {selectedTab === 'syncpoints' && (
            <section className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold">Sync Points</h3>
                <button
                  onClick={addSyncPoint}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1 text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Add SyncPoint
                </button>
              </div>
              <div className="divide-y divide-gray-800">
                {cinema.syncPoints.map(sp => (
                  <SyncPointItem
                    key={sp.id}
                    syncPoint={sp}
                    shots={cinema.shots}
                    isExpanded={expandedItems.has(sp.id)}
                    onToggle={() => toggleExpanded(sp.id)}
                    onUpdate={(field, value) => updateSyncPoint(sp.id, field, value)}
                    onDelete={() => deleteSyncPoint(sp.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Actions Tab */}
          {selectedTab === 'actions' && (
            <section className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold">Actions</h3>
                <ActionTypeDropdown onSelect={addAction} />
              </div>
              <div className="divide-y divide-gray-800">
                {cinema.actions.map(action => (
                  <div
                    key={action.id}
                    draggable
                    onDragStart={e => {
                      setDraggedActionId(action.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      if (draggedActionId) {
                        reorderActions(draggedActionId, action.id);
                      }
                      setDraggedActionId(null);
                    }}
                    onDragEnd={() => setDraggedActionId(null)}
                    className={draggedActionId === action.id ? 'bg-gray-800/70' : ''}
                  >
                    <ActionItem
                      action={action}
                      shots={cinema.shots}
                      syncPoints={cinema.syncPoints}
                      isExpanded={expandedItems.has(action.id)}
                      expandedItems={expandedItems}
                      onToggle={() => toggleExpanded(action.id)}
                      onToggleAdvanced={(id: string) => toggleExpanded(id)}
                      onUpdate={(field, value) => updateAction(action.id, field, value)}
                      onDelete={() => deleteAction(action.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Camera Paths Tab */}
          {selectedTab === 'camerapaths' && (
            <section className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold">Camera Paths</h3>
                <button
                  onClick={addCameraPath}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1 text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Camera Path
                </button>
              </div>
              <div className="divide-y divide-gray-800">
                {cinema.cameraPaths.map(cp => (
                  <CameraPathItem
                    key={cp.id}
                    cameraPath={cp}
                    isExpanded={expandedItems.has(cp.id)}
                    onToggle={() => toggleExpanded(cp.id)}
                    onUpdate={(field, value) => updateCameraPath(cp.id, field, value)}
                    onDelete={() => deleteCameraPath(cp.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Participants */}
          <section className="bg-gray-900 rounded-xl border border-gray-800 mt-6">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold">Participants</h3>
              <button
                onClick={addParticipant}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1 text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="p-4 space-y-2">
              {cinema.participants.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={e => updateParticipant(i, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="GUID"
                  />
                  <button
                    onClick={() => deleteParticipant(i)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Export Preview */}
        {showExport && (
          <aside className="w-1/2 border-l border-gray-800 bg-gray-950 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Export Preview</h3>
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition ${
                  copySuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <Copy className="w-4 h-4" />
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-gray-900 p-4 rounded-xl text-xs font-mono overflow-auto max-h-[calc(100vh-200px)] text-gray-300 whitespace-pre">
              {exportCinema(cinema)}
            </pre>
          </aside>
        )}
      </div>
    </div>
  );
}

// Shot Item Component
function ShotItem({ 
  shot, 
  isExpanded, 
  onToggle, 
  onUpdate, 
  onDelete 
}: {
  shot: Shot;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof Shot, value: string | number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Camera className="w-5 h-5 text-blue-400" />
        <span className="font-medium">Shot {shot.index}</span>
        <span className="text-gray-500 text-sm">- {shot.name}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="ml-auto p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4 ml-7 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={shot.name}
              onChange={e => onUpdate('name', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Next Shot</label>
            <input
              type="number"
              value={shot.nextShot}
              onChange={e => onUpdate('nextShot', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Skip Shot</label>
            <input
              type="number"
              value={shot.skipShot}
              onChange={e => onUpdate('skipShot', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Time</label>
            <input
              type="number"
              step="0.1"
              value={shot.maxTime}
              onChange={e => onUpdate('maxTime', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// SyncPoint Item Component
function SyncPointItem({ 
  syncPoint, 
  shots,
  isExpanded, 
  onToggle, 
  onUpdate, 
  onDelete 
}: {
  syncPoint: SyncPoint;
  shots: Shot[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof SyncPoint, value: string | number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Clock className="w-5 h-5 text-purple-400" />
        <span className="font-medium">SyncPoint {syncPoint.index}</span>
        <span className="text-gray-500 text-sm">@ {syncPoint.absoluteTimeStart}s</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="ml-auto p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4 ml-7 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={syncPoint.name}
              onChange={e => onUpdate('name', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <input
              type="number"
              value={syncPoint.type}
              onChange={e => onUpdate('type', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Action</label>
            <input
              type="number"
              value={syncPoint.action}
              onChange={e => onUpdate('action', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Shot</label>
            <select
              value={syncPoint.shot}
              onChange={e => onUpdate('shot', parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {shots.map(s => (
                <option key={s.id} value={s.index}>Shot {s.index} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Absolute Time Start</label>
            <input
              type="number"
              step="0.1"
              value={syncPoint.absoluteTimeStart}
              onChange={e => onUpdate('absoluteTimeStart', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Offset</label>
            <input
              type="number"
              step="0.1"
              value={syncPoint.offset}
              onChange={e => onUpdate('offset', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Action Type Dropdown
function ActionTypeDropdown({ onSelect }: { onSelect: (type: ActionType) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1 text-sm transition"
      >
        <Plus className="w-4 h-4" />
        Add Action
        <ChevronDown className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
          {(Object.keys(ACTION_TYPE_LABELS) as ActionType[]).map(type => {
            const Icon = ACTION_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => { onSelect(type); setIsOpen(false); }}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
              >
                <Icon className="w-4 h-4" />
                {ACTION_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Action Item Component
function ActionItem({ 
  action, 
  shots,
  syncPoints,
  isExpanded,
  expandedItems,
  onToggle,
  onToggleAdvanced,
  onUpdate, 
  onDelete 
}: {
  action: Action;
  shots: Shot[];
  syncPoints: SyncPoint[];
  isExpanded: boolean;
  expandedItems: Set<string>;
  onToggle: () => void;
  onToggleAdvanced: (id: string) => void;
  onUpdate: (field: string, value: unknown) => void;
  onDelete: () => void;
}) {
  const Icon = ACTION_ICONS[action.type];
  const advancedId = `${action.id}-advanced`;
  const showAdvanced = expandedItems.has(advancedId);
  
  const colorMap: Record<ActionType, string> = {
    camera: 'text-blue-400',
    dialog: 'text-green-400',
    pop: 'text-yellow-400',
    fade: 'text-purple-400',
    charAnim: 'text-orange-400',
    objAnim: 'text-pink-400',
    trigger: 'text-red-400',
  };

  return (
    <div className="p-4">
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className={`w-5 h-5 ${colorMap[action.type]}`} />
        <span className="font-medium">{action.name}</span>
        <span className="text-gray-500 text-sm">({ACTION_TYPE_LABELS[action.type]})</span>
        <span className="text-gray-600 text-xs">Duration: {action.duration}s</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="ml-auto p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4 ml-7">
          {/* Common fields */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={action.name}
                onChange={e => onUpdate('name', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Shot</label>
              <select
                value={action.shot}
                onChange={e => onUpdate('shot', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {shots.map(s => (
                  <option key={s.id} value={s.index}>Shot {s.index}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Duration</label>
              <input
                type="number"
                step="0.1"
                value={action.duration}
                onChange={e => onUpdate('duration', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">SyncPoint</label>
              <select
                value={action.syncPoint}
                onChange={e => onUpdate('syncPoint', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {syncPoints.map(sp => (
                  <option key={sp.id} value={sp.index}>SyncPoint {sp.index}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type-specific fields */}
          <ActionTypeFields action={action} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// Type-specific action fields
function ActionTypeFields({ 
  action, 
  onUpdate 
}: { 
  action: Action; 
  onUpdate: (field: string, value: unknown) => void;
}) {
  switch (action.type) {
    case 'camera':
      return (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center">
              Target GUID
              <FieldHelp text="GUID of the object the camera should focus on" />
            </label>
            <input
              type="text"
              value={action.target}
              onChange={e => onUpdate('target', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Camera Type</label>
            <input
              type="number"
              value={action.cameraType}
              onChange={e => onUpdate('cameraType', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start FOV</label>
            <input
              type="number"
              step="0.01"
              value={action.startFOV}
              onChange={e => onUpdate('startFOV', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">End FOV</label>
            <input
              type="number"
              step="0.01"
              value={action.endFOV}
              onChange={e => onUpdate('endFOV', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Loop</label>
            <input
              type="number"
              value={action.loop}
              onChange={e => onUpdate('loop', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Transition Pop</label>
            <input
              type="number"
              value={action.transitionPop}
              onChange={e => onUpdate('transitionPop', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );
    
    case 'dialog':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center">
              Speaker GUID
              <FieldHelp text="GUID of the character speaking the dialog" />
            </label>
            <input
              type="text"
              value={action.speaker}
              onChange={e => onUpdate('speaker', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Force End</label>
            <select
              value={action.forceEnd}
              onChange={e => onUpdate('forceEnd', parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1 flex items-center">
              Sample (Dialog Text)
              <FieldHelp text="The dialog text or audio sample name to play" />
            </label>
            <input
              type="text"
              value={action.sample}
              onChange={e => onUpdate('sample', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );
    
    case 'pop':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Object GUID</label>
            <input
              type="text"
              value={action.object}
              onChange={e => onUpdate('object', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Location GUID</label>
            <input
              type="text"
              value={action.location}
              onChange={e => onUpdate('location', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Facing GUID</label>
            <input
              type="text"
              value={action.facing}
              onChange={e => onUpdate('facing', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Animation</label>
            <input
              type="text"
              value={action.anim}
              onChange={e => onUpdate('anim', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );
    
    case 'fade':
      return (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">FX Type</label>
            <input
              type="number"
              value={action.fxType}
              onChange={e => onUpdate('fxType', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Magnitude</label>
            <input
              type="number"
              step="0.01"
              value={action.magnitude}
              onChange={e => onUpdate('magnitude', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Frequency</label>
            <input
              type="number"
              step="0.1"
              value={action.frequency}
              onChange={e => onUpdate('frequency', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fadeout</label>
            <select
              value={action.fadeout}
              onChange={e => onUpdate('fadeout', parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={0}>Fade In</option>
              <option value={1}>Fade Out</option>
            </select>
          </div>
        </div>
      );
    
    case 'charAnim':
      return (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Character GUID</label>
            <input
              type="text"
              value={action.character}
              onChange={e => onUpdate('character', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Animation Name</label>
            <input
              type="text"
              value={action.animName}
              onChange={e => onUpdate('animName', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Anim Group</label>
            <input
              type="text"
              value={action.animGroup}
              onChange={e => onUpdate('animGroup', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Length</label>
            <input
              type="number"
              step="0.1"
              value={action.length}
              onChange={e => onUpdate('length', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Loops</label>
            <input
              type="number"
              value={action.loops}
              onChange={e => onUpdate('loops', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );
    
    case 'objAnim':
      return (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Object GUID</label>
            <input
              type="text"
              value={action.object}
              onChange={e => onUpdate('object', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Animation Name</label>
            <input
              type="text"
              value={action.animName}
              onChange={e => onUpdate('animName', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Looping</label>
            <select
              value={action.looping}
              onChange={e => onUpdate('looping', parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>
        </div>
      );
    
    case 'trigger':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Trigger Name</label>
            <input
              type="text"
              value={action.triggerName}
              onChange={e => onUpdate('triggerName', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );
    
    default:
      return null;
  }
}

// Camera Path Item Component
function CameraPathItem({
  cameraPath,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete
}: {
  cameraPath: CameraPath;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Video className="w-5 h-5 text-cyan-400" />
        <span className="font-medium font-mono text-sm">{cameraPath.guid}</span>
        <span className="text-gray-500 text-sm">Lookat: {cameraPath.lookatGuid}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="ml-auto p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="mt-4 ml-7">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">GUID</label>
              <input
                type="text"
                value={cameraPath.guid}
                onChange={e => onUpdate('guid', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Lookat GUID</label>
              <input
                type="text"
                value={cameraPath.lookatGuid}
                onChange={e => onUpdate('lookatGuid', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Play Speed</label>
              <input
                type="number"
                step="0.1"
                value={cameraPath.playSpeed}
                onChange={e => onUpdate('playSpeed', parseFloat(e.target.value) || 1)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Loops</label>
              <input
                type="number"
                value={cameraPath.loops}
                onChange={e => onUpdate('loops', parseInt(e.target.value) || 1)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Interpolate</label>
              <select
                value={cameraPath.interpolate}
                onChange={e => onUpdate('interpolate', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">From Center</label>
              <select
                value={cameraPath.fromCenter}
                onChange={e => onUpdate('fromCenter', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Camera Position Offset (X, Y, Z)</label>
              <div className="flex gap-1">
                <input type="number" step="0.1" value={cameraPath.camPosOffset[0]} onChange={e => onUpdate('camPosOffset', [parseFloat(e.target.value) || 0, cameraPath.camPosOffset[1], cameraPath.camPosOffset[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.camPosOffset[1]} onChange={e => onUpdate('camPosOffset', [cameraPath.camPosOffset[0], parseFloat(e.target.value) || 0, cameraPath.camPosOffset[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.camPosOffset[2]} onChange={e => onUpdate('camPosOffset', [cameraPath.camPosOffset[0], cameraPath.camPosOffset[1], parseFloat(e.target.value) || 0])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Min (X, Y, Z)</label>
              <div className="flex gap-1">
                <input type="number" step="0.1" value={cameraPath.min[0]} onChange={e => onUpdate('min', [parseFloat(e.target.value) || 0, cameraPath.min[1], cameraPath.min[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.min[1]} onChange={e => onUpdate('min', [cameraPath.min[0], parseFloat(e.target.value) || 0, cameraPath.min[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.min[2]} onChange={e => onUpdate('min', [cameraPath.min[0], cameraPath.min[1], parseFloat(e.target.value) || 0])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Range (X, Y, Z)</label>
              <div className="flex gap-1">
                <input type="number" step="0.1" value={cameraPath.range[0]} onChange={e => onUpdate('range', [parseFloat(e.target.value) || 0, cameraPath.range[1], cameraPath.range[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.range[1]} onChange={e => onUpdate('range', [cameraPath.range[0], parseFloat(e.target.value) || 0, cameraPath.range[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.range[2]} onChange={e => onUpdate('range', [cameraPath.range[0], cameraPath.range[1], parseFloat(e.target.value) || 0])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Lookat Offset (X, Y, Z)</label>
              <div className="flex gap-1">
                <input type="number" step="0.1" value={cameraPath.lookatOffset[0]} onChange={e => onUpdate('lookatOffset', [parseFloat(e.target.value) || 0, cameraPath.lookatOffset[1], cameraPath.lookatOffset[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.lookatOffset[1]} onChange={e => onUpdate('lookatOffset', [cameraPath.lookatOffset[0], parseFloat(e.target.value) || 0, cameraPath.lookatOffset[2]])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                <input type="number" step="0.1" value={cameraPath.lookatOffset[2]} onChange={e => onUpdate('lookatOffset', [cameraPath.lookatOffset[0], cameraPath.lookatOffset[1], parseFloat(e.target.value) || 0])} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
          
          {/* Keyframe Editor */}
          <KeyframeEditor 
            keyframes={cameraPath.keyframes}
            min={cameraPath.min}
            range={cameraPath.range}
            onUpdate={(keyframes) => onUpdate('keyframes', keyframes)}
          />
        </div>
      )}
    </div>
  );
}

// Keyframe Editor Component
function KeyframeEditor({
  keyframes,
  min,
  range,
  onUpdate
}: {
  keyframes: Keyframe[];
  min: [number, number, number];
  range: [number, number, number];
  onUpdate: (keyframes: Keyframe[]) => void;
}) {
  const [curvePoints, setCurvePoints] = useState(36);
  const [showRaw, setShowRaw] = useState(false);
  // Control points in world coordinates (within min to min+range)
  const [controlPoints, setControlPoints] = useState<Array<{x: number, y: number, z: number}>>(() => [
    { x: min[0], y: min[1], z: min[2] },
    { x: min[0] + range[0] * 0.5, y: min[1] + range[1] * 0.5, z: min[2] + range[2] * 0.5 },
    { x: min[0] + range[0], y: min[1] + range[1], z: min[2] + range[2] }
  ]);
  const [showControlPoints, setShowControlPoints] = useState(false);
  
  // Convert keyframe value (-32766 to 32766) to normalized (-1 to 1)
  const toNormalized = (val: number) => val / 32766;
  
  // Convert normalized (-1 to 1) to keyframe value
  const toKeyframeVal = (val: number) => Math.round(val * 32766);
  
  // Bezier curve calculation - de Casteljau's algorithm
  const bezierPoint = (t: number, points: Array<{x: number, y: number, z: number}>): {x: number, y: number, z: number} => {
    if (points.length === 1) return points[0];
    const newPoints: Array<{x: number, y: number, z: number}> = [];
    for (let i = 0; i < points.length - 1; i++) {
      newPoints.push({
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
        z: points[i].z + (points[i + 1].z - points[i].z) * t,
      });
    }
    return bezierPoint(t, newPoints);
  };
  
  // Convert world position to keyframe value
  const worldToKeyframe = (worldVal: number, minVal: number, rangeVal: number) => {
    if (rangeVal === 0) return 0;
    // Normalize to 0-1, then to -1 to 1, then to keyframe
    const normalized = (worldVal - minVal) / rangeVal; // 0 to 1
    return toKeyframeVal(normalized * 2 - 1); // -1 to 1 -> keyframe
  };
  
  // Generate keyframes from Bezier control points
  const generateFromControlPoints = () => {
    if (controlPoints.length < 2) return;
    const newKeyframes: Keyframe[] = [];
    for (let i = 0; i < curvePoints; i++) {
      const t = i / (curvePoints - 1);
      const pos = bezierPoint(t, controlPoints);
      // Convert world coordinates to keyframe values
      newKeyframes.push({
        posX: worldToKeyframe(pos.x, min[0], range[0]),
        posY: worldToKeyframe(pos.y, min[1], range[1]),
        posZ: worldToKeyframe(pos.z, min[2], range[2]),
        oriX: 0,
        oriY: 0,
        oriZ: 0,
        oriW: 0,
      });
    }
    onUpdate(newKeyframes);
  };
  
  const addControlPoint = () => {
    const last = controlPoints[controlPoints.length - 1];
    const first = controlPoints[0];
    // Add a point between the last point and the end of the range
    setControlPoints([...controlPoints, { 
      x: last.x + (min[0] + range[0] - last.x) * 0.3,
      y: last.y + (min[1] + range[1] - last.y) * 0.3,
      z: last.z + (min[2] + range[2] - last.z) * 0.3
    }]);
  };
  
  const removeControlPoint = (index: number) => {
    if (controlPoints.length > 2) {
      setControlPoints(controlPoints.filter((_, i) => i !== index));
    }
  };
  
  const updateControlPoint = (index: number, field: 'x' | 'y' | 'z', value: number) => {
    const newPoints = [...controlPoints];
    // Clamp to min/range boundaries
    const fieldIndex = field === 'x' ? 0 : field === 'y' ? 1 : 2;
    const clampedValue = Math.max(min[fieldIndex], Math.min(min[fieldIndex] + range[fieldIndex], value));
    newPoints[index] = { ...newPoints[index], [field]: clampedValue };
    setControlPoints(newPoints);
  };
  
  // Reset control points when min/range changes
  const resetControlPoints = () => {
    setControlPoints([
      { x: min[0], y: min[1], z: min[2] },
      { x: min[0] + range[0] * 0.5, y: min[1] + range[1] * 0.5, z: min[2] + range[2] * 0.5 },
      { x: min[0] + range[0], y: min[1] + range[1], z: min[2] + range[2] }
    ]);
  };
  
  // Calculate world position from keyframe
  const toWorldPos = (kf: Keyframe) => ({
    x: toNormalized(Number(kf.posX) || 0) * range[0] + min[0],
    y: toNormalized(Number(kf.posY) || 0) * range[1] + min[1],
    z: toNormalized(Number(kf.posZ) || 0) * range[2] + min[2],
  });
  
  const updateKeyframe = (index: number, field: keyof Keyframe, value: number) => {
    const newKeyframes = [...keyframes];
    newKeyframes[index] = { ...newKeyframes[index], [field]: value };
    onUpdate(newKeyframes);
  };
  
  const addKeyframe = () => {
    const lastKf = keyframes[keyframes.length - 1];
    const newKf: Keyframe = {
      posX: Number(lastKf?.posX) || 0,
      posY: (Number(lastKf?.posY) || 0) + 500,
      posZ: Number(lastKf?.posZ) || 0,
      oriX: Number(lastKf?.oriX) || 0,
      oriY: Number(lastKf?.oriY) || 0,
      oriZ: Number(lastKf?.oriZ) || 0,
      oriW: Number(lastKf?.oriW) || 0,
    };
    onUpdate([...keyframes, newKf]);
  };
  
  const removeKeyframe = (index: number) => {
    if (keyframes.length > 1) {
      onUpdate(keyframes.filter((_, i) => i !== index));
    }
  };
  
  // Generate circle path
  const generateCircle = () => {
    const newKeyframes: Keyframe[] = [];
    for (let i = 0; i < curvePoints; i++) {
      const t = i / curvePoints;
      const angle = t * Math.PI * 2;
      newKeyframes.push({
        posX: toKeyframeVal(Math.cos(angle)),
        posY: toKeyframeVal(t * 2 - 1), // Progress from -1 to 1 over the circle
        posZ: toKeyframeVal(Math.sin(angle) * 0.5 + 0.5), // Offset to keep positive
        oriX: 0,
        oriY: 0,
        oriZ: 0,
        oriW: 0,
      });
    }
    onUpdate(newKeyframes);
  };
  
  // Generate linear path (A to B)
  const generateLine = () => {
    const newKeyframes: Keyframe[] = [];
    for (let i = 0; i < curvePoints; i++) {
      const t = i / (curvePoints - 1);
      newKeyframes.push({
        posX: toKeyframeVal(-1 + t * 2), // -1 to 1
        posY: toKeyframeVal(-1 + t * 2),
        posZ: toKeyframeVal(0),
        oriX: 0,
        oriY: 0,
        oriZ: 0,
        oriW: 0,
      });
    }
    onUpdate(newKeyframes);
  };
  
  // Generate figure-8 path
  const generateFigure8 = () => {
    const newKeyframes: Keyframe[] = [];
    for (let i = 0; i < curvePoints; i++) {
      const t = i / curvePoints;
      const angle = t * Math.PI * 2;
      newKeyframes.push({
        posX: toKeyframeVal(Math.sin(angle)),
        posY: toKeyframeVal(t * 2 - 1),
        posZ: toKeyframeVal(Math.sin(angle * 2) * 0.5),
        oriX: 0,
        oriY: 0,
        oriZ: 0,
        oriW: 0,
      });
    }
    onUpdate(newKeyframes);
  };
  
  // Get raw text representation
  const getRawText = () => {
    return keyframes.map(kf => 
      `${kf.posX} ${kf.posY} ${kf.posZ} ${kf.oriX} ${kf.oriY} ${kf.oriZ} ${kf.oriW}`
    ).join('\n');
  };
  
  // Parse raw text
  const parseRawText = (text: string) => {
    const lines = text.trim().split('\n');
    const newKeyframes: Keyframe[] = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/).map(v => parseInt(v) || 0);
      if (parts.length >= 7) {
        newKeyframes.push({
          posX: parts[0],
          posY: parts[1],
          posZ: parts[2],
          oriX: parts[3],
          oriY: parts[4],
          oriZ: parts[5],
          oriW: parts[6],
        });
      }
    }
    if (newKeyframes.length > 0) {
      onUpdate(newKeyframes);
    }
  };
  
  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          Keyframes ({keyframes.length}) - BETA
          <FieldHelp text="Values from -32766 to 32766 map to -1 to 1. Final position = (value/32766) × range + min" />
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
          >
            {showRaw ? 'Visual Editor' : 'Raw Text'}
          </button>
          <button
            onClick={addKeyframe}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>
      
      {/* Curve Generation */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-xs text-gray-400">Output Points:</span>
          <input
            type="number"
            value={curvePoints}
            onChange={e => setCurvePoints(Math.max(2, parseInt(e.target.value) || 36))}
            className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-gray-500">keyframes</span>
        </div>
        
        {/* Preset Curves */}
        <div className="flex gap-2 mb-3">
          <span className="text-xs text-gray-400 self-center">Presets:</span>
          <button onClick={generateCircle} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded transition">
            Circle
          </button>
          <button onClick={generateLine} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 rounded transition">
            Line
          </button>
          <button onClick={generateFigure8} className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded transition">
            Figure-8
          </button>
        </div>
        
        {/* Bezier Control Points */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowControlPoints(!showControlPoints)}
              className="text-xs text-gray-300 hover:text-white flex items-center gap-1"
            >
              {showControlPoints ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Bezier Control Points ({controlPoints.length})
              <FieldHelp text="Define control points in world coordinates (within min/range bounds). The curve smoothly passes through these points." />
            </button>
            <button
              onClick={generateFromControlPoints}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 rounded transition"
            >
              Generate Bezier
            </button>
          </div>
          
          {showControlPoints && (
            <div className="mt-2 space-y-2">
              {/* Show boundaries */}
              <div className="text-[10px] text-gray-600 px-1 mb-2">
                Bounds: X [{min[0].toFixed(1)} to {(min[0] + range[0]).toFixed(1)}] | 
                Y [{min[1].toFixed(1)} to {(min[1] + range[1]).toFixed(1)}] | 
                Z [{min[2].toFixed(1)} to {(min[2] + range[2]).toFixed(1)}]
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 px-1">
                <span>#</span>
                <span>X</span>
                <span>Y</span>
                <span>Z</span>
              </div>
              {controlPoints.map((cp, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 items-center group">
                  <span className="text-xs text-gray-500 px-1">
                    {index === 0 ? 'Start' : index === controlPoints.length - 1 ? 'End' : `P${index}`}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={cp.x.toFixed(2)}
                    onChange={e => updateControlPoint(index, 'x', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={cp.y.toFixed(2)}
                    onChange={e => updateControlPoint(index, 'y', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={cp.z.toFixed(2)}
                      onChange={e => updateControlPoint(index, 'z', parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                    {controlPoints.length > 2 && (
                      <button
                        onClick={() => removeControlPoint(index)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={addControlPoint}
                  className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Point
                </button>
                <button
                  onClick={resetControlPoints}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Reset to Bounds
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showRaw ? (
        /* Raw Text Editor */
        <div>
          <textarea
            defaultValue={getRawText()}
            onBlur={e => parseRawText(e.target.value)}
            className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
            placeholder="PosX PosY PosZ OriX OriY OriZ OriW (one per line)"
          />
          <p className="text-xs text-gray-500 mt-1">Edit raw values and click outside to apply</p>
        </div>
      ) : (
        /* Visual Keyframe List */
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1 text-xs text-gray-500 px-2 sticky top-0 bg-gray-900 py-1">
            <span>#</span>
            <span>PosX</span>
            <span>PosY</span>
            <span>PosZ</span>
            <span>OriX</span>
            <span>OriY</span>
            <span>OriZ</span>
            <span>OriW</span>
          </div>
          {keyframes.map((kf, index) => {
            const worldPos = toWorldPos(kf);
            return (
              <div key={index} className="group">
                <div className="grid grid-cols-8 gap-1 items-center">
                  <span className="text-xs text-gray-500 px-2">{index}</span>
                  <input type="number" value={Number(kf.posX) || 0} onChange={e => updateKeyframe(index, 'posX', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <input type="number" value={Number(kf.posY) || 0} onChange={e => updateKeyframe(index, 'posY', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <input type="number" value={Number(kf.posZ) || 0} onChange={e => updateKeyframe(index, 'posZ', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <input type="number" value={Number(kf.oriX) || 0} onChange={e => updateKeyframe(index, 'oriX', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <input type="number" value={Number(kf.oriY) || 0} onChange={e => updateKeyframe(index, 'oriY', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <input type="number" value={Number(kf.oriZ) || 0} onChange={e => updateKeyframe(index, 'oriZ', parseInt(e.target.value) || 0)} className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={Number(kf.oriW) || 0} onChange={e => updateKeyframe(index, 'oriW', parseInt(e.target.value) || 0)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500" />
                    <button
                      onClick={() => removeKeyframe(index)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 px-2 mt-0.5">
                  World: ({worldPos.x.toFixed(2)}, {worldPos.y.toFixed(2)}, {worldPos.z.toFixed(2)})
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
