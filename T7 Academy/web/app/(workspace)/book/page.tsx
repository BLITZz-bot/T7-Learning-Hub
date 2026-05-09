"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import BookLibrary from "./components/BookLibrary";
import T7Library from "@/components/knowledge/T7Library";
import Modal from "@/components/common/Modal";

type View = "list" | "detail";

const API = "http://localhost:8001/api/t7";

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center text-[var(--muted-foreground)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      }
    >
      <BookPageInner />
    </Suspense>
  );
}

function BookPageInner() {
  const { t } = useTranslation();
  const [library, setLibrary] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [subjectPrivacy, setSubjectPrivacy] = useState<Record<string, { isPublic: boolean, code?: string }>>({});
  const [userId, setUserId] = useState<string>("global");

  useEffect(() => {
    let id = localStorage.getItem("t7_user_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("t7_user_id", id);
    }
    setUserId(id);

    const saved = localStorage.getItem("t7_subject_privacy");
    if (saved) {
      const privacyData = JSON.parse(saved);
      setSubjectPrivacy(privacyData);
      
      // Initialize library with empty subjects so they don't disappear before upload
      const initialLib: Record<string, string[]> = {};
      Object.keys(privacyData).forEach(sub => {
        initialLib[sub] = [];
      });
      setLibrary(initialLib);
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (userId === "global") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/library/files?owner_id=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch library");
      const data = await res.json();
      setLibrary(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleNewBook = () => {
    setIsModalOpen(true);
  };

  const confirmCreateSubject = () => {
    const sub = newSubjectName.trim();
    if (sub) {
      if (library[sub]) {
        toast.error("Subject already exists");
        return;
      }
      setLibrary({ ...library, [sub]: [] });
      
      let code = "";
      if (isPublic) {
        code = "T7-" + Math.random().toString(36).substring(2, 6).toUpperCase();
        setShareCode(code);
        setIsShareModalOpen(true);
      }
      
      const newPrivacy = { ...subjectPrivacy, [sub]: { isPublic, code } };
      setSubjectPrivacy(newPrivacy);
      localStorage.setItem("t7_subject_privacy", JSON.stringify(newPrivacy));
      
      setSelectedSubject(sub);
      setIsModalOpen(false);
      setNewSubjectName("");
      setIsPublic(false);
      toast.success(`Created ${isPublic ? "Public" : "Private"} subject: ${sub}`);
    }
  };

  const handleSelectBook = (id: string) => {
    setSelectedSubject(id);
    // We don't change view yet, maybe just show the T7Library component for that subject
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm(`Delete subject "${id}" and all its files?`)) return;
    // Implementation for delete would go here
    const newLib = { ...library };
    delete newLib[id];
    setLibrary(newLib);
    toast.success(`Deleted ${id}`);
  };

  // Convert Firebase subjects to "Book" objects for the BookLibrary UI
  const books = Object.entries(library).map(([subject, files]) => ({
    id: subject,
    title: subject,
    description: `${files.length} notes/files`,
    status: "ready" as const,
    chapter_count: files.length,
    page_count: files.length,
    updated_at: Date.now() / 1000,
  }));

  if (selectedSubject) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-[var(--border)] px-6 py-3 bg-[var(--background)]">
          <button 
            onClick={() => setSelectedSubject(null)}
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            &larr; Back to Library
          </button>
          <h1 className="text-lg font-bold">{selectedSubject}</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <T7Library 
            initialSubject={selectedSubject} 
            isPublic={subjectPrivacy[selectedSubject]?.isPublic} 
            initialShareCode={subjectPrivacy[selectedSubject]?.code} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--background)]">
      <main className="flex-1 overflow-hidden">
        <BookLibrary
          books={books}
          loading={loading}
          onNewBook={handleNewBook}
          onSelectBook={handleSelectBook}
          onDeleteBook={handleDeleteBook}
        />
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewSubjectName("");
          setIsPublic(false);
        }}
        title="Create New Shelf"
        titleIcon={<Folder className="w-5 h-5 text-[var(--primary)]" />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmCreateSubject}
              className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Create {isPublic ? "Public" : "Private"} Shelf
            </button>
          </div>
        }
      >
        <div className="p-6">
          <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
            Subject Name
          </label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Mathematics, History, Physics..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmCreateSubject();
            }}
          />

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button 
              onClick={() => setIsPublic(false)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${!isPublic ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]/50 hover:bg-[var(--secondary)]"}`}
            >
              <div className={`p-3 rounded-full ${!isPublic ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
                <Folder size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Private shelf</p>
                <p className="text-[10px] opacity-60">Just for me</p>
              </div>
            </button>

            <button 
              onClick={() => setIsPublic(true)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${isPublic ? "border-amber-500 bg-amber-500/5" : "border-[var(--border)]/50 hover:bg-[var(--secondary)]"}`}
            >
              <div className={`p-3 rounded-full ${isPublic ? "bg-amber-500 text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
                <Folder size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Public shelf</p>
                <p className="text-[10px] opacity-60">Share with code</p>
              </div>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Subject Shared!"
      >
        <div className="p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Share this code with friends to let them join your library!
          </p>
          <div className="bg-[var(--secondary)] px-8 py-4 rounded-2xl border-2 border-dashed border-[var(--primary)]/30 inline-block mb-4">
            <span className="text-3xl font-black tracking-widest text-[var(--foreground)]">{shareCode}</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            They can add notes and download materials from this shelf.
          </p>
        </div>
      </Modal>
    </div>
  );
}
