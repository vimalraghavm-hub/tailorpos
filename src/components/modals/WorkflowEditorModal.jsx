import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Edit3, Check, ChevronUp, ChevronDown, AlertTriangle, GripVertical } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';

export const WorkflowEditorModal = ({ onClose }) => {
  const { 
    productionStatuses, 
    addProductionStatus, 
    editProductionStatus, 
    moveProductionStatus,
    reorderProductionStatuses, 
    deleteProductionStatus 
  } = useShop();

  const [newStatusInput, setNewStatusInput] = useState('');
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingNameInput, setEditingNameInput] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);

  // Delete target state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteWarningInfo, setDeleteWarningInfo] = useState(null);

  useModalDismiss(onClose);
  useModalDismiss(() => { setDeleteTarget(null); setDeleteWarningInfo(null); }, Boolean(deleteTarget));

  const handleAddStatus = (e) => {
    if (e) e.preventDefault();
    if (!newStatusInput.trim()) return;
    addProductionStatus(newStatusInput.trim());
    setNewStatusInput('');
  };

  const handleStartRename = (status) => {
    setEditingStatusId(status.id || status.name);
    setEditingNameInput(status.name);
  };

  const handleSaveRename = (statusId) => {
    if (editingNameInput.trim()) {
      editProductionStatus(statusId, editingNameInput.trim());
    }
    setEditingStatusId(null);
    setEditingNameInput('');
  };

  const handleDeleteAttempt = (status) => {
    const res = deleteProductionStatus(status.id || status.name);
    if (!res.success && res.inUse) {
      setDeleteTarget(status);
      setDeleteWarningInfo(res);
    } else {
      setDeleteTarget(status);
      setDeleteWarningInfo(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteProductionStatus(deleteTarget.id || deleteTarget.name, null, true);
    setDeleteTarget(null);
    setDeleteWarningInfo(null);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      zIndex={10010}
    >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white leading-tight">
                Production Workflow Editor
              </h3>
              <p className="text-xs text-[#777777]">Customize, reorder, or rename workshop task statuses</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-[#777777] hover:bg-[#EEEEEE] dark:hover:bg-[#282828] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlist-style Status List Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

          {/* Add Status Input Form */}
          <form onSubmit={handleAddStatus} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter new status (e.g. EMBROIDERY, ALTERATION)..."
              value={newStatusInput}
              onChange={(e) => setNewStatusInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] text-xs font-bold shadow-xs hover:opacity-90 transition-smooth cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> + Add Status
            </button>
          </form>

          {/* Workflow Status Items */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider block">
              CURRENT WORKFLOW PIPELINE ({productionStatuses.length} STAGES)
            </span>

            <div className="space-y-2">
              {productionStatuses.filter(Boolean).map((st, idx) => {
                const statusId = (st && st.id) ? st.id : (st && st.name ? st.name : `ps-${idx}`);
                const isEditingThis = editingStatusId === statusId;

                return (
                  <div
                    key={statusId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      setDraggedIdx(idx);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                      if (!isNaN(fromIdx) && fromIdx !== idx) {
                        const updated = [...productionStatuses];
                        const [moved] = updated.splice(fromIdx, 1);
                        updated.splice(idx, 0, moved);
                        reorderProductionStatuses(updated);
                      }
                      setDraggedIdx(null);
                    }}
                    className={`p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border transition-smooth flex items-center justify-between gap-3 text-xs shadow-xs cursor-grab active:cursor-grabbing ${
                      draggedIdx === idx 
                        ? 'border-amber-500 opacity-50' 
                        : 'border-[#E3E3E3] dark:border-[#333333]'
                    }`}
                  >
                    {/* Left: Drag Handle + Move Up/Down + Status Name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-[#777777] shrink-0 cursor-grab" title="Click and drag to reorder" />
                      
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveProductionStatus(statusId, 'up')}
                          disabled={idx === 0}
                          className={`p-1 rounded hover:bg-white dark:hover:bg-[#1E1E1E] ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer text-[#777777]'}`}
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProductionStatus(statusId, 'down')}
                          disabled={idx === productionStatuses.length - 1}
                          className={`p-1 rounded hover:bg-white dark:hover:bg-[#1E1E1E] ${idx === productionStatuses.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer text-[#777777]'}`}
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingNameInput}
                            onChange={(e) => setEditingNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(statusId); }}
                            className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(statusId)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-sm text-[#202020] dark:text-white truncate">
                          {st.name}
                        </span>
                      )}
                    </div>

                    {/* Right Action Icons: Edit & Delete */}
                    {!isEditingThis && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartRename(st)}
                          className="p-1.5 rounded-lg text-[#777777] hover:text-[#202020] dark:hover:text-white hover:bg-white dark:hover:bg-[#1E1E1E] cursor-pointer transition-smooth"
                          title="Rename status"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttempt(st)}
                          className="p-1.5 rounded-lg text-[#777777] hover:text-[#B85C5C] hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-smooth"
                          title="Delete status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] bg-white dark:bg-[#1E1E1E] text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-xs shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Delete Confirmation Warning Popup */}
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => { setDeleteTarget(null); setDeleteWarningInfo(null); }}
          maxWidthClass="max-w-md"
          zIndex={10030}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Delete Production Status?</h3>
            </div>

            <p className="text-xs text-[#777777] leading-relaxed">
              Are you sure you want to delete status <strong className="text-[#202020] dark:text-white">"{deleteTarget?.name}"</strong> from the workflow?
            </p>

            {deleteWarningInfo && (
              <p className="text-xs text-amber-700 dark:text-amber-400 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                This status is currently used by <strong>{deleteWarningInfo.count}</strong> existing orders. Existing orders will keep their historical record, but new orders will no longer use this status.
              </p>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E3E3E3] dark:border-[#333333]">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteWarningInfo(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#252525]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-[#B85C5C] hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Delete Status
              </button>
            </div>
          </div>
        </Modal>

    </Modal>
  );
};
