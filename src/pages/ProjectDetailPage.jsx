import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import ProjectDetailModal from '@/components/studio/ProjectDetailModal';
import ProjectModal from '@/components/studio/ProjectModal';
import { showToast } from '@/components/studio/StudioToast';
import { addLog, nextProjectId } from '@/lib/studio';

const slideIn = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.16, ease: 'easeIn' } },
};

export default function ProjectDetailPage({ projects, contacts, templates, onUpdate, onDelete, onDuplicate, onSaveAsTemplate, onContactsChange, onProjectsChange, onEdit }) {
  const [retainers, setRetainers] = useState([]);
  useEffect(() => {
    base44.entities.Contract.filter({ type: 'retainer' }, 'title', 100).then(setRetainers).catch(() => {});
  }, []);
  const { id } = useParams();
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const project = projects.find(p => p.id === id);

  if (projects.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#E81A1A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
        <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>🎬</div>
        <div style={{ marginBottom: 12 }}>Project not found.</div>
        <button onClick={() => navigate('/projects')} style={{ padding: '10px 20px', background: '#1E1E1E', border: '1px solid #333', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 }}>← Back to Projects</button>
      </div>
    );
  }

  const handleUpdate = (updated) => onUpdate(updated);

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    onDelete(project.id);
    navigate('/projects');
    showToast('Project deleted', 'red');
    await base44.entities.Project.delete(project.id);
  };

  const handleEditSave = async (form) => {
    const updated = { ...project, ...form, activity: addLog(project, 'Project details updated') };
    onUpdate(updated);
    setEditModalOpen(false);
    showToast('Project updated', 'blue');
    await base44.entities.Project.update(project.id, updated);
  };

  const handleDuplicate = async () => {
    await onDuplicate(project);
  };

  const handleSaveAsTemplate = async () => {
    await onSaveAsTemplate(project);
  };

  const handleEdit = () => {
    // If parent provided an onEdit (to open the shared modal), use it; otherwise open local
    if (onEdit) {
      onEdit(project);
    } else {
      setEditModalOpen(true);
    }
  };

  return (
    <motion.div {...slideIn}>
      <ProjectDetailModal
        open={true}
        onClose={() => navigate('/projects')}
        project={project}
        contacts={contacts}
        projects={projects}
        retainers={retainers}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onSaveAsTemplate={handleSaveAsTemplate}
        onContactsChange={onContactsChange}
        inline={true}
      />
      {/* Fallback local edit modal (used when no onEdit prop) */}
      {!onEdit && (
        <ProjectModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          editingProject={project}
          templates={templates}
          projects={projects}
          onSave={handleEditSave}
        />
      )}
    </motion.div>
  );
}