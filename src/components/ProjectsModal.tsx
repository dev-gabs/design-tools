import React, { useState, useRef } from 'react';
import { X, FolderOpen, Save, Trash2, Copy, Edit2, Upload, Download, Check } from 'lucide-react';
import type { MeshGradientDocument } from '../types/mesh';
import { exportProjectJson, validateAndParseProjectJson, triggerDownload } from '../engine/export';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: MeshGradientDocument;
  onLoadProject: (doc: MeshGradientDocument) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const STORAGE_KEY = 'mesh_gradient_studio_saved_projects';

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  onLoadProject,
  onShowToast,
}) => {
  const [savedProjects, setSavedProjects] = useState<MeshGradientDocument[]>(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const saveToStorage = (projects: MeshGradientDocument[]) => {
    setSavedProjects(projects);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Erro ao salvar', 'O armazenamento local está cheio ou desativado.');
    }
  };

  const handleSaveCurrent = () => {
    const existingIndex = savedProjects.findIndex((p) => p.id === currentDocument.id);
    const updatedDoc: MeshGradientDocument = {
      ...currentDocument,
      updatedAt: Date.now(),
    };

    let newProjects: MeshGradientDocument[];
    if (existingIndex >= 0) {
      newProjects = [...savedProjects];
      newProjects[existingIndex] = updatedDoc;
    } else {
      newProjects = [updatedDoc, ...savedProjects];
    }

    saveToStorage(newProjects);
    onShowToast('success', 'Projeto Salvo', `"${currentDocument.name}" foi salvo localmente.`);
  };

  const handleDuplicate = (project: MeshGradientDocument) => {
    const duplicate: MeshGradientDocument = {
      ...project,
      id: `proj-${Date.now()}`,
      name: `${project.name} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveToStorage([duplicate, ...savedProjects]);
    onShowToast('info', 'Projeto Duplicado', `Criada cópia de "${project.name}".`);
  };

  const handleDelete = (id: string) => {
    const target = savedProjects.find((p) => p.id === id);
    const updated = savedProjects.filter((p) => p.id !== id);
    saveToStorage(updated);
    setDeleteConfirmId(null);
    onShowToast('info', 'Projeto Removido', `"${target?.name || 'Projeto'}" foi excluído.`);
  };

  const handleStartRename = (project: MeshGradientDocument) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleConfirmRename = () => {
    if (!editingId || !editingName.trim()) return;
    const updated = savedProjects.map((p) =>
      p.id === editingId ? { ...p, name: editingName.trim(), updatedAt: Date.now() } : p
    );
    saveToStorage(updated);
    setEditingId(null);
    onShowToast('success', 'Projeto Renomeado');
  };

  const handleExportJson = (project: MeshGradientDocument) => {
    const jsonStr = exportProjectJson(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'mesh_project';
    triggerDownload(url, `${safeName}.json`);
    URL.revokeObjectURL(url);
    onShowToast('success', 'Exportação JSON', 'Arquivo de projeto baixado com sucesso.');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = validateAndParseProjectJson(text);
        
        // Add to saved projects if not duplicate ID
        const updated = [parsed, ...savedProjects.filter((p) => p.id !== parsed.id)];
        saveToStorage(updated);

        // Load into active editor
        onLoadProject(parsed);
        onShowToast('success', 'Projeto Importado', `"${parsed.name}" carregado com sucesso.`);
        onClose();
      } catch (err) {
        onShowToast('error', 'Falha ao importar', err instanceof Error ? err.message : 'Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-100 rounded-lg text-zinc-800">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900">Gerenciador de Projetos</h3>
              <p className="text-xs text-zinc-500">Salvar, carregar, duplicar e exportar composições em JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-2">
          <button
            onClick={handleSaveCurrent}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Atual</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium border border-zinc-200 transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJsonFile}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Project List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {savedProjects.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FolderOpen className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-500">Nenhum projeto salvo ainda</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Clique em "Salvar Atual" para armazenar sua composição no navegador ou importe um arquivo JSON.
              </p>
            </div>
          ) : (
            savedProjects.map((project) => {
              const isCurrent = project.id === currentDocument.id;
              const isDeleting = deleteConfirmId === project.id;
              const isRenaming = editingId === project.id;

              return (
                <div
                  key={project.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-zinc-50 border-zinc-300 shadow-sm'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Small color swatches preview */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 border border-zinc-200 shadow-inner">
                      {project.points.slice(0, 4).map((pt, i) => (
                        <div key={i} style={{ backgroundColor: pt.color }} />
                      ))}
                    </div>

                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                            className="bg-white border border-zinc-300 rounded px-2 py-0.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                            autoFocus
                          />
                          <button
                            onClick={handleConfirmRename}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-zinc-900 truncate">{project.name}</h4>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium">
                              Ativo
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                        <span>{project.dimensions.width} × {project.dimensions.height}px</span>
                        <span>•</span>
                        <span>{project.points.length} pontos</span>
                        <span>•</span>
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                        <span className="text-[10px] text-rose-700 px-1 font-medium">Excluir?</span>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] rounded font-medium"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 bg-zinc-200 text-zinc-700 text-[10px] rounded hover:bg-zinc-300"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onLoadProject(project);
                            onShowToast('success', 'Projeto Carregado', `"${project.name}" foi aberto no editor.`);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
                          title="Abrir no editor"
                        >
                          Abrir
                        </button>

                        <button
                          onClick={() => handleStartRename(project)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Renomear"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(project)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExportJson(project)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Exportar JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(project.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
