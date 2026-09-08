/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  FileCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  Link as LinkIcon,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Archive,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { movementService } from '../../services/movementService';
import { storageService } from '../../services/storageService';
import { generateSlug } from '../../utils/slug';
import {
  MovementCampaign,
  MovementEvent,
  MovementEvidence,
  CampaignType,
  CampaignStatus,
  EventStatus,
  EvidenceType,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  EVENT_STATUS_LABELS,
  EVIDENCE_TYPE_LABELS
} from '../../types/movement';

export default function AdminMovementsPage() {
  const { hasRole, role } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN') || role === 'SUPER_ADMIN';

  const [campaigns, setCampaigns] = useState<MovementCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MovementCampaign | null>(null);

  // Sub-management Modals
  const [activeEventsCampaign, setActiveEventsCampaign] = useState<MovementCampaign | null>(null);
  const [activeEvidenceCampaign, setActiveEvidenceCampaign] = useState<MovementCampaign | null>(null);

  // Archive & Permanent Delete Confirm Modals
  const [archivingCampaign, setArchivingCampaign] = useState<MovementCampaign | null>(null);
  const [permanentDeletingCampaign, setPermanentDeletingCampaign] = useState<MovementCampaign | null>(null);
  const [confirmTitleInput, setConfirmTitleInput] = useState('');

  // Campaign Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    cover_image_url: '',
    national_anthem_video_url: '',
    team_song_video_url: '',
    campaign_type: 'theo_dot' as CampaignType,
    start_date: '',
    end_date: '',
    status: 'dang_dien_ra' as CampaignStatus,
    is_featured: false,
    is_published: true,
    display_order: 0,
    academic_year: '2025-2026',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCeremonyVideo, setUploadingCeremonyVideo] = useState<'national' | 'team' | null>(null);
  const [saving, setSaving] = useState(false);

  // Child Event Form State
  const [eventFormData, setEventFormData] = useState({
    id: '',
    title: '',
    description: '',
    event_date: '',
    location: '',
    status: 'sap_dien_ra' as EventStatus,
    summary_result: '',
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Evidence Form State
  const [evidenceFormData, setEvidenceFormData] = useState({
    title: '',
    evidence_type: 'image' as EvidenceType,
    url: '',
    notes: '',
  });
  const [uploadingEvidenceFile, setUploadingEvidenceFile] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await movementService.getAdminCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      console.error('Error loading admin campaigns:', err);
      setError(err.message || 'Không thể tải danh sách phong trào.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Filtered
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchSummary = c.summary?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchSummary) return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.campaign_type !== typeFilter) return false;
      return true;
    });
  }, [campaigns, searchQuery, statusFilter, typeFilter]);

  // Handle open modal create/edit
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData({
      title: '',
      slug: '',
      summary: '',
      content: '',
      cover_image_url: '',
      national_anthem_video_url: '',
      team_song_video_url: '',
      campaign_type: 'theo_dot',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'draft',
      is_featured: false,
      is_published: false,
      display_order: campaigns.length + 1,
      academic_year: '2025-2026',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: MovementCampaign) => {
    setEditingCampaign(c);
    setFormData({
      title: c.title,
      slug: c.slug,
      summary: c.summary || '',
      content: c.content || '',
      cover_image_url: c.cover_image_url || '',
      national_anthem_video_url: c.national_anthem_video_url || '',
      team_song_video_url: c.team_song_video_url || '',
      campaign_type: c.campaign_type,
      start_date: c.start_date ? c.start_date.split('T')[0] : '',
      end_date: c.end_date ? c.end_date.split('T')[0] : '',
      status: c.status,
      is_featured: c.is_featured,
      is_published: c.is_published,
      display_order: c.display_order,
      academic_year: c.academic_year || '2025-2026',
    });
    setIsFormOpen(true);
  };

  // Title change auto generate slug if user hasn't manually edited slug
  const handleTitleChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      title: val,
      slug: editingCampaign ? prev.slug : generateSlug(val)
    }));
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await storageService.uploadImage(file, 'movements');
      setFormData(prev => ({ ...prev, cover_image_url: url }));
      showSuccess('Tải ảnh bìa lên thành công!');
    } catch (err: any) {
      alert(err.message || 'Tải ảnh lên thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCeremonyVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'national' | 'team'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCeremonyVideo(kind);
      const url = await storageService.uploadVideo(file, 'ceremony-videos');
      setFormData(prev => ({
        ...prev,
        [kind === 'national' ? 'national_anthem_video_url' : 'team_song_video_url']: url,
      }));
      showSuccess(kind === 'national' ? 'Đã tải video Quốc ca.' : 'Đã tải video Đội ca.');
    } catch (err: any) {
      alert(err.message || 'Tải video lên thất bại');
    } finally {
      setUploadingCeremonyVideo(null);
      e.target.value = '';
    }
  };

  // Save campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tên phong trào');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<MovementCampaign> = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || generateSlug(formData.title),
        summary: formData.summary.trim() || null,
        content: formData.content.trim() || null,
        cover_image_url: formData.cover_image_url.trim() || null,
        national_anthem_video_url: formData.national_anthem_video_url.trim() || null,
        team_song_video_url: formData.team_song_video_url.trim() || null,
        campaign_type: formData.campaign_type,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        status: formData.status,
        is_featured: formData.is_featured,
        is_published: formData.is_published,
        display_order: Number(formData.display_order) || 0,
        academic_year: formData.academic_year || '2025-2026',
      };

      if (editingCampaign) {
        await movementService.updateCampaign(editingCampaign.id, payload);
        showSuccess('Cập nhật phong trào thành công!');
      } else {
        await movementService.createCampaign(payload);
        showSuccess('Tạo phong trào mới thành công!');
      }

      setIsFormOpen(false);
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Lưu phong trào thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Toggle published quick
  const handleTogglePublished = async (c: MovementCampaign) => {
    try {
      await movementService.updateCampaign(c.id, { is_published: !c.is_published });
      showSuccess(`Đã ${!c.is_published ? 'bật' : 'tắt'} hiển thị phong trào`);
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    }
  };

  // Archive campaign (Soft delete)
  const handleArchiveCampaign = async () => {
    if (!archivingCampaign) return;
    try {
      await movementService.archiveCampaign(archivingCampaign.id);
      showSuccess('Đã lưu trữ phong trào thành công.');
      setArchivingCampaign(null);
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Lưu trữ phong trào thất bại');
    }
  };

  // Permanent Delete campaign (SUPER_ADMIN only)
  const handlePermanentDeleteCampaign = async () => {
    if (!permanentDeletingCampaign) return;
    if (confirmTitleInput.trim() !== permanentDeletingCampaign.title.trim()) {
      alert('Tên phong trào nhập vào không khớp.');
      return;
    }
    try {
      await movementService.deleteCampaign(permanentDeletingCampaign.id);
      showSuccess('Đã xóa vĩnh viễn phong trào thành công.');
      setPermanentDeletingCampaign(null);
      setConfirmTitleInput('');
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Xóa vĩnh viễn phong trào thất bại');
    }
  };

  // Manage Child Events
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventsCampaign || !eventFormData.title.trim()) return;

    try {
      const payload: Partial<MovementEvent> = {
        campaign_id: activeEventsCampaign.id,
        title: eventFormData.title.trim(),
        description: eventFormData.description.trim() || null,
        event_date: eventFormData.event_date ? new Date(eventFormData.event_date).toISOString() : null,
        location: eventFormData.location.trim() || null,
        status: eventFormData.status,
        summary_result: eventFormData.summary_result.trim() || null,
      };

      if (editingEventId) {
        await movementService.updateCampaignEvent(editingEventId, payload);
        showSuccess('Đã cập nhật hoạt động con!');
      } else {
        await movementService.createCampaignEvent(payload);
        showSuccess('Đã thêm hoạt động con!');
      }

      setEventFormData({
        id: '',
        title: '',
        description: '',
        event_date: '',
        location: '',
        status: 'sap_dien_ra',
        summary_result: '',
      });
      setEditingEventId(null);

      // Refresh list
      const updatedList = await movementService.getAdminCampaigns();
      setCampaigns(updatedList);
      const current = updatedList.find(c => c.id === activeEventsCampaign.id);
      if (current) setActiveEventsCampaign(current);
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu hoạt động con');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!activeEventsCampaign) return;
    try {
      await movementService.deleteCampaignEvent(eventId);
      showSuccess('Đã xóa hoạt động con.');
      const updatedList = await movementService.getAdminCampaigns();
      setCampaigns(updatedList);
      const current = updatedList.find(c => c.id === activeEventsCampaign.id);
      if (current) setActiveEventsCampaign(current);
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa hoạt động con');
    }
  };

  // Manage Evidence
  const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingEvidenceFile(true);
      const url = await storageService.uploadImage(file, 'movements/evidence');
      setEvidenceFormData(prev => ({ ...prev, url }));
      showSuccess('Tải ảnh minh chứng lên thành công!');
    } catch (err: any) {
      alert(err.message || 'Tải file thất bại');
    } finally {
      setUploadingEvidenceFile(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvidenceCampaign || !evidenceFormData.title.trim() || !evidenceFormData.url.trim()) return;

    try {
      await movementService.addCampaignEvidence({
        campaign_id: activeEvidenceCampaign.id,
        title: evidenceFormData.title.trim(),
        evidence_type: evidenceFormData.evidence_type,
        url: evidenceFormData.url.trim(),
        notes: evidenceFormData.notes.trim() || null,
      });

      showSuccess('Đã thêm minh chứng phong trào!');
      setEvidenceFormData({
        title: '',
        evidence_type: 'image',
        url: '',
        notes: '',
      });

      const updatedList = await movementService.getAdminCampaigns();
      setCampaigns(updatedList);
      const current = updatedList.find(c => c.id === activeEvidenceCampaign.id);
      if (current) setActiveEvidenceCampaign(current);
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm minh chứng');
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!activeEvidenceCampaign) return;
    try {
      await movementService.deleteCampaignEvidence(evidenceId);
      showSuccess('Đã xóa minh chứng.');
      const updatedList = await movementService.getAdminCampaigns();
      setCampaigns(updatedList);
      const current = updatedList.find(c => c.id === activeEvidenceCampaign.id);
      if (current) setActiveEvidenceCampaign(current);
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa minh chứng');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-600" />
            Quản Lý Hoạt Động Phong Trào
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý chương trình, đợt thi đua, hoạt động con và minh chứng phong trào Đội.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phong trào mới</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên phong trào..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Tất cả loại phong trào</option>
            {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button
            onClick={loadCampaigns}
            title="Làm mới"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Campaign List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang tải danh sách...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Flag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có hoạt động phong trào. Hãy tạo nội dung đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
              <thead className="bg-slate-50/70 dark:bg-slate-900/40">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phong trào / Ảnh</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phân loại</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Hoạt động / Minh chứng</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Hiển thị</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-transparent text-slate-700 dark:text-slate-300 font-sans">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                    
                    {/* Title & Cover */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3.5">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                          {c.cover_image_url ? (
                            <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
                              <Flag className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 flex items-center gap-1.5">
                            {c.title}
                            {c.is_featured && (
                              <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" title="Ghim nổi bật" />
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            /{c.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category & Academic Year */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {CAMPAIGN_TYPE_LABELS[c.campaign_type]}
                        </span>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {c.academic_year}
                        </div>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{c.start_date ? new Date(c.start_date).toLocaleDateString('vi-VN') : '---'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">đến {c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : '---'}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </span>
                    </td>

                    {/* Counts & Manage buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveEventsCampaign(c)}
                          className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Quản lý hoạt động con"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{c.events?.length || 0} HĐ</span>
                        </button>

                        <button
                          onClick={() => setActiveEvidenceCampaign(c)}
                          className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Quản lý minh chứng"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{c.evidence?.length || 0} MC</span>
                        </button>
                      </div>
                    </td>

                    {/* Published toggle */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePublished(c)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          c.is_published
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-slate-600'
                        }`}
                        title={c.is_published ? 'Đang xuất bản (Bấm để ẩn)' : 'Đã ẩn (Bấm để xuất bản)'}
                      >
                        {c.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Chỉnh sửa phong trào"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setArchivingCampaign(c)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
                          title="Lưu trữ phong trào"
                        >
                          <Archive className="w-4 h-4" />
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setPermanentDeletingCampaign(c);
                              setConfirmTitleInput('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors ml-1 border border-red-200/50 dark:border-red-900/50"
                            title="Xóa vĩnh viễn (Chỉ dành cho Super Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Create/Edit Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-600" />
                  {editingCampaign ? 'Chỉnh Sửa Phong Trào' : 'Thêm Phong Trào Mới'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCampaign} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tên phong trào / đợt thi đua <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ví dụ: Thiếu nhi Việt Nam thi đua làm theo 5 điều Bác Hồ dạy"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Đường dẫn (Slug) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="thieu-nhi-viet-nam-thi-dua-lam-theo-5-dieu-bac-ho-day"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Group 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Campaign Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Loại phong trào</label>
                    <select
                      value={formData.campaign_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaign_type: e.target.value as CampaignType }))}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      {Object.entries(CAMPAIGN_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CampaignStatus }))}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Năm học</label>
                    <input
                      type="text"
                      value={formData.academic_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                      placeholder="2025-2026"
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ảnh bìa phong trào</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                      placeholder="https://... hoặc tải ảnh lên"
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer shrink-0 inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Đang tải...' : 'Tải ảnh'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                </div>

                {(formData.slug === 'sinh-hoat-dau-tuan' || formData.title.trim().toLowerCase() === 'sinh hoạt đầu tuần') && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-4">
                    <div className="flex items-start gap-2">
                      <Video className="mt-0.5 h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-xs font-extrabold text-blue-900 dark:text-blue-200">Video nghi lễ chào cờ</div>
                        <div className="mt-0.5 text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
                          Hai video sẽ được tải sẵn trên trang Sinh hoạt đầu tuần. Khi bắt đầu chào cờ, Quốc ca phát trước và Đội ca tự phát tiếp theo.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Video Quốc ca</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={formData.national_anthem_video_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, national_anthem_video_url: e.target.value }))}
                          placeholder="https://... hoặc tải video MP4 lên"
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                        <label className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shrink-0 inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingCeremonyVideo === 'national' ? 'Đang tải...' : 'Tải video'}</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={(e) => handleCeremonyVideoUpload(e, 'national')}
                            className="hidden"
                            disabled={uploadingCeremonyVideo !== null}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Video Đội ca</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={formData.team_song_video_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, team_song_video_url: e.target.value }))}
                          placeholder="https://... hoặc tải video MP4 lên"
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                        <label className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shrink-0 inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingCeremonyVideo === 'team' ? 'Đang tải...' : 'Tải video'}</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={(e) => handleCeremonyVideoUpload(e, 'team')}
                            className="hidden"
                            disabled={uploadingCeremonyVideo !== null}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tóm tắt ngắn gọn</label>
                  <textarea
                    rows={2}
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Tóm tắt ý nghĩa, mục tiêu của phong trào..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nội dung chi tiết phong trào</label>
                  <textarea
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Mô tả kế hoạch, thể lệ, đối tượng tham gia, khen thưởng..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Xuất bản ngay</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Ghim trọng tâm</span>
                  </label>
                </div>

                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm"
                  >
                    {saving ? 'Đang lưu...' : (editingCampaign ? 'Cập nhật' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Child Events Manager Modal */}
      <AnimatePresence>
        {activeEventsCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Quản lý Hoạt động con - {activeEventsCampaign.title}
                </h3>
                <button onClick={() => setActiveEventsCampaign(null)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Form add/edit event */}
                <form onSubmit={handleSaveEvent} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-xs text-blue-700 dark:text-blue-400 uppercase">
                    {editingEventId ? 'Chỉnh sửa hoạt động con' : 'Thêm hoạt động con mới'}
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Tên hoạt động con (Ví dụ: Lễ ra quân, Hội thi rung chuông vàng...)"
                      value={eventFormData.title}
                      onChange={(e) => setEventFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="datetime-local"
                      value={eventFormData.event_date}
                      onChange={(e) => setEventFormData(prev => ({ ...prev, event_date: e.target.value }))}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Địa điểm"
                      value={eventFormData.location}
                      onChange={(e) => setEventFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <select
                      value={eventFormData.status}
                      onChange={(e) => setEventFormData(prev => ({ ...prev, status: e.target.value as EventStatus }))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Mô tả ngắn"
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />

                  <input
                    type="text"
                    placeholder="Kết quả / tổng kết ngắn gọn (nếu đã hoàn thành)"
                    value={eventFormData.summary_result}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, summary_result: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(null);
                          setEventFormData({ id: '', title: '', description: '', event_date: '', location: '', status: 'sap_dien_ra', summary_result: '' });
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      {editingEventId ? 'Cập nhật HĐ' : 'Thêm HĐ'}
                    </button>
                  </div>
                </form>

                {/* List of events */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase">Danh sách hoạt động con hiện có</div>
                  {!activeEventsCampaign.events || activeEventsCampaign.events.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có hoạt động con nào.</p>
                  ) : (
                    activeEventsCampaign.events.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {e.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {EVENT_STATUS_LABELS[e.status]} {e.event_date ? `| ${new Date(e.event_date).toLocaleDateString('vi-VN')}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingEventId(e.id);
                              setEventFormData({
                                id: e.id,
                                title: e.title,
                                description: e.description || '',
                                event_date: e.event_date ? e.event_date.slice(0, 16) : '',
                                location: e.location || '',
                                status: e.status,
                                summary_result: e.summary_result || '',
                              });
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(e.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Evidence Manager Modal */}
      <AnimatePresence>
        {activeEvidenceCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  Quản lý Minh chứng - {activeEvidenceCampaign.title}
                </h3>
                <button onClick={() => setActiveEvidenceCampaign(null)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Form add evidence */}
                <form onSubmit={handleAddEvidence} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase">Thêm minh chứng phong trào</div>

                  <input
                    type="text"
                    required
                    placeholder="Tên minh chứng (Ví dụ: Quyết định thành lập BTC, Ảnh trao thưởng...)"
                    value={evidenceFormData.title}
                    onChange={(e) => setEvidenceFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={evidenceFormData.evidence_type}
                      onChange={(e) => setEvidenceFormData(prev => ({ ...prev, evidence_type: e.target.value as EvidenceType }))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>

                    <label className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 cursor-pointer flex items-center justify-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingEvidenceFile ? 'Đang tải...' : 'Tải file minh chứng'}</span>
                      <input type="file" onChange={handleEvidenceFileUpload} className="hidden" disabled={uploadingEvidenceFile} />
                    </label>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="URL liên kết minh chứng (https://...)"
                    value={evidenceFormData.url}
                    onChange={(e) => setEvidenceFormData(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />

                  <input
                    type="text"
                    placeholder="Ghi chú thêm"
                    value={evidenceFormData.notes}
                    onChange={(e) => setEvidenceFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Thêm minh chứng
                    </button>
                  </div>
                </form>

                {/* Evidence List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase">Danh sách minh chứng hiện có</div>
                  {!activeEvidenceCampaign.evidence || activeEvidenceCampaign.evidence.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có minh chứng nào.</p>
                  ) : (
                    activeEvidenceCampaign.evidence.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-bold text-emerald-600">{EVIDENCE_TYPE_LABELS[ev.evidence_type]}</span>
                            <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-500 underline truncate max-w-xs">
                              {ev.url}
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteEvidence(ev.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Archive Confirm Modal */}
      <AnimatePresence>
        {archivingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                <Archive className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Xác nhận lưu trữ phong trào</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lưu trữ phong trào &lsquo;{archivingCampaign.title}&rsquo;? Nội dung sẽ bị ẩn khỏi trang công khai nhưng vẫn được giữ trong hệ thống.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setArchivingCampaign(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleArchiveCampaign}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
                >
                  Xác nhận lưu trữ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanent Delete Confirm Modal (SUPER_ADMIN only) */}
      <AnimatePresence>
        {permanentDeletingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-red-200 dark:border-red-900/80 shadow-2xl max-w-md w-full space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Xóa vĩnh viễn phong trào</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Xóa vĩnh viễn phong trào &lsquo;{permanentDeletingCampaign.title}&rsquo;? Toàn bộ hoạt động con và minh chứng liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác.
              </p>
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nhập tên phong trào để xác nhận:
                </label>
                <input
                  type="text"
                  value={confirmTitleInput}
                  onChange={(e) => setConfirmTitleInput(e.target.value)}
                  placeholder={permanentDeletingCampaign.title}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setPermanentDeletingCampaign(null);
                    setConfirmTitleInput('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePermanentDeleteCampaign}
                  disabled={confirmTitleInput.trim() !== permanentDeletingCampaign.title.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors"
                >
                  Xác nhận xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
