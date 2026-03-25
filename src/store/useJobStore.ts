import { create } from 'zustand';
import type { Job, JobVersion, RevisionRequest, BrandKit, PreviewData } from '../types';

interface JobStore {
  currentJob: Job | null;
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  createJob: (formData: FormData) => Promise<string>;
  fetchJob: (jobId: string) => Promise<void>;
  fetchJobs: () => Promise<void>;
  submitRevision: (jobId: string, revision: RevisionRequest) => Promise<void>;
  sendChatEdit: (jobId: string, message: string) => Promise<string>;
  fetchVersions: (jobId: string) => Promise<JobVersion[]>;
  revertToVersion: (jobId: string, versionId: string) => Promise<void>;
  saveBrandKit: (kit: BrandKit) => Promise<void>;
  loadBrandKit: () => Promise<BrandKit | null>;
  fetchPreview: (jobId: string) => Promise<PreviewData | null>;
  approvePreview: (jobId: string) => Promise<void>;
  requestPreviewChange: (jobId: string, message: string) => Promise<PreviewData | null>;
  undoPreviewChange: (jobId: string) => Promise<PreviewData | null>;
}

const useJobStore = create<JobStore>((set, get) => ({
  currentJob: null,
  jobs: [],
  isLoading: false,
  error: null,

  createJob: async (formData: FormData): Promise<string> => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'שגיאה ביצירת הפרויקט' }));
        throw new Error(err.error || 'שגיאה ביצירת הפרויקט');
      }
      const job: Job = await res.json();
      set({ currentJob: job, isLoading: false });
      return job.id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
      throw e;
    }
  },

  fetchJob: async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('שגיאה בטעינת הפרויקט');
      const job: Job = await res.json();
      set({ currentJob: job });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg });
    }
  },

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('שגיאה בטעינת הפרויקטים');
      const jobs: Job[] = await res.json();
      set({ jobs, isLoading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
    }
  },

  submitRevision: async (jobId: string, revision: RevisionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/jobs/${jobId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(revision),
      });
      if (!res.ok) throw new Error('שגיאה בשליחת התיקון');
      const job: Job = await res.json();
      set({ currentJob: job, isLoading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
    }
  },

  sendChatEdit: async (jobId: string, message: string): Promise<string> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('שגיאה בשליחת ההודעה');
      const data = await res.json();
      return data.response || 'קיבלתי! מעדכן את הסרטון...';
    } catch {
      return 'שגיאה בעיבוד ההודעה. נסה שוב.';
    }
  },

  fetchVersions: async (jobId: string): Promise<JobVersion[]> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/versions`);
      if (!res.ok) throw new Error('שגיאה בטעינת הגרסאות');
      return await res.json();
    } catch {
      return [];
    }
  },

  revertToVersion: async (jobId: string, versionId: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/jobs/${jobId}/versions/${versionId}/revert`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('שגיאה בשחזור הגרסה');
      const job: Job = await res.json();
      set({ currentJob: job, isLoading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
    }
  },

  saveBrandKit: async (kit: BrandKit) => {
    localStorage.setItem('brandKit', JSON.stringify(kit));
    try {
      await fetch('/api/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kit),
      });
    } catch {
      // saved locally at least
    }
  },

  loadBrandKit: async (): Promise<BrandKit | null> => {
    const local = localStorage.getItem('brandKit');
    if (local) {
      try {
        return JSON.parse(local) as BrandKit;
      } catch {
        return null;
      }
    }
    try {
      const res = await fetch('/api/brand-kit');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  fetchPreview: async (jobId: string): Promise<PreviewData | null> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/preview`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  approvePreview: async (jobId: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/jobs/${jobId}/preview/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('שגיאה באישור התצוגה המקדימה');
      set({ isLoading: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
      throw e;
    }
  },

  requestPreviewChange: async (jobId: string, message: string): Promise<PreviewData | null> => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/jobs/${jobId}/preview/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('שגיאה בעדכון התצוגה המקדימה');
      const data = await res.json();
      set({ isLoading: false });
      return data.preview;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  undoPreviewChange: async (jobId: string): Promise<PreviewData | null> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/preview/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.preview;
    } catch {
      return null;
    }
  },
}));

export default useJobStore;
