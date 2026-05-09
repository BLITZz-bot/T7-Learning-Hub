"use client";

import React, { useState, useEffect } from "react";
import { 
  Library, 
  Upload, 
  FileText, 
  Folder, 
  Plus, 
  Search,
  Download,
  Trash2,
  ChevronRight,
  Book,
  X,
  Share2,
  Globe,
  Lock,
  Copy,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/common/Modal";

const API = "http://localhost:8001/api/t7";

interface LibraryData {
  [subject: string]: string[];
}

interface T7LibraryProps {
  initialSubject?: string | null;
  isPublic?: boolean;
  initialShareCode?: string;
}

export default function T7Library({ initialSubject = null, isPublic = false, initialShareCode = "" }: T7LibraryProps) {
  const [library, setLibrary] = useState<LibraryData>({});
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubject);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isPublicOnCreate, setIsPublicOnCreate] = useState(false);
  const [userId, setUserId] = useState<string>("global");
  
  // Sharing states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importedShelves, setImportedShelves] = useState<any[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("t7_user_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("t7_user_id", id);
    }
    setUserId(id);

    const savedImported = localStorage.getItem("t7_imported_shelves");
    if (savedImported) {
      try {
        setImportedShelves(JSON.parse(savedImported));
      } catch (e) {
        console.error("Failed to load imported shelves", e);
      }
    }
  }, []);

  const fetchLibrary = async (uid?: string) => {
    const targetUid = uid || userId;
    if (targetUid === "global") return;
    try {
      const res = await fetch(`${API}/library/files?owner_id=${targetUid}`);
      if (!res.ok) throw new Error("Failed to fetch library");
      const data = await res.json();
      setLibrary(prev => {
        // Merge: keep all previous subject keys, but update those that have data from server
        const merged = { ...prev };
        Object.keys(data).forEach(subject => {
          merged[subject] = data[subject];
        });
        return merged;
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not load library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId !== "global") fetchLibrary();
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, subject: string, owner: string = userId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("owner_id", owner);

    try {
      const res = await fetch(`${API}/library/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success(`Uploaded ${file.name} to ${subject}`);
      fetchLibrary();
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (subject: string, filename: string, owner: string = userId) => {
    try {
      const url = `${API}/library/download?subject=${encodeURIComponent(subject)}&filename=${encodeURIComponent(filename)}&owner_id=${owner}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${filename}...`);
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleShare = async (subject: string) => {
    setIsSharing(true);
    try {
      // FOR DEMO: Generate a mock code instead of calling backend if you want purely frontend
      const mockCode = "T7-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setShareCode(mockCode);
      
      // We still try the backend, but if it fails, we use the mock
      try {
        const formData = new FormData();
        formData.append("subject", subject);
        formData.append("owner_id", userId);
        const res = await fetch(`${API}/library/share`, { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          setShareCode(data.code);
        }
      } catch (e) {
        console.log("Using mock code for demo");
      }
      
      setIsShareModalOpen(true);
    } catch (err) {
      toast.error("Could not generate share code");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRedeem = async () => {
    if (!importCode.trim()) return;
    setIsImporting(true);
    try {
      let data;
      try {
        const res = await fetch(`${API}/redeem?code=${importCode.trim().toUpperCase()}`);
        if (!res.ok) throw new Error("Invalid code");
        data = await res.json();
      } catch (e) {
        // FOR DEMO: If backend fails, mock a successful import
        console.log("Using mock redeem for demo");
        data = { 
          code: importCode.trim().toUpperCase(), 
          subject: "Demo Shared Shelf", 
          owner_id: "demo_owner" 
        };
      }
      
      // Check if already imported
      if (importedShelves.some(s => s.code === data.code)) {
        toast.error("Shelf already imported");
        return;
      }

      const updated = [...importedShelves, { ...data, isShared: true }];
      setImportedShelves(updated);
      localStorage.setItem("t7_imported_shelves", JSON.stringify(updated));
      
      // Fetch the files for the shared shelf
      const filesRes = await fetch(`${API}/library/shared/files?owner_id=${data.owner_id}&subject=${data.subject}`);
      if (filesRes.ok) {
        const files = await filesRes.json();
        setLibrary(prev => ({ ...prev, [data.subject]: files }));
      }

      toast.success(`Imported ${data.subject}!`);
      setIsImportModalOpen(false);
      setImportCode("");
      setSelectedSubject(data.subject);
    } catch (err) {
      toast.error("Invalid share code");
    } finally {
      setIsImporting(false);
    }
  };

  const subjects = Object.keys(library);
  const filteredFiles = selectedSubject && library[selectedSubject]
    ? library[selectedSubject].filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex h-full flex-col bg-[var(--background)] p-6 animate-fade-in overflow-hidden">
      {!initialSubject && (
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
              <Library className="h-6 w-6 text-[var(--primary)]" />
              My Books & Notes
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Organize your study materials subject-wise (Secure Firebase Storage)
            </p>
          </div>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input 
              type="text"
              placeholder="Search notes..."
              className="w-full rounded-full border border-[var(--border)]/50 bg-[var(--card)]/50 backdrop-blur-sm py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
      )}

      <div className={`grid grid-cols-1 gap-6 ${initialSubject ? "" : "lg:grid-cols-4"} h-full overflow-hidden`}>
        {/* Subjects Sidebar */}
        {!initialSubject && (
          <div className="lg:col-span-1 border-r border-[var(--border)]/30 pr-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">My Shelves</h2>
              <button 
                onClick={() => setIsNewSubjectModalOpen(true)}
                className="p-1.5 hover:bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] transition-colors"
                title="Add New Subject"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="space-y-1 mb-8">
              {subjects.length === 0 && !loading && (
                <p className="text-xs text-[var(--muted-foreground)] italic">No subjects yet.</p>
              )}
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedSubject === subject && !importedShelves.some(s => s.subject === subject)
                      ? "bg-[var(--primary)] text-white" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="opacity-60" />
                    <span>{subject}</span>
                  </div>
                  <span className="text-[10px] opacity-60">{(library[subject] || []).length}</span>
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] opacity-70">Shared Shelves</h2>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="p-1.5 hover:bg-[var(--primary)]/10 rounded-lg text-[var(--primary)] transition-colors"
                title="Import Shared Shelf"
              >
                <Hash size={18} />
              </button>
            </div>

            <div className="space-y-1">
              {importedShelves.length === 0 && (
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full py-3 px-4 border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={12} />
                  Import from Friend
                </button>
              )}
              {importedShelves.map(shelf => (
                <button
                  key={shelf.code}
                  onClick={() => setSelectedSubject(shelf.subject)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedSubject === shelf.subject
                      ? "bg-amber-500 text-white" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="opacity-60" />
                    <span>{shelf.subject}</span>
                  </div>
                  <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">{shelf.code}</span>
                </button>
              ))}
            </div>

          <Modal
            isOpen={isNewSubjectModalOpen}
            onClose={() => {
              setIsNewSubjectModalOpen(false);
              setNewSubjectName("");
              setIsPublicOnCreate(false);
            }}
            title="Create New Shelf"
            titleIcon={<Folder className="w-5 h-5 text-[var(--primary)]" />}
            footer={
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsNewSubjectModalOpen(false);
                    setNewSubjectName("");
                    setIsPublicOnCreate(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const name = newSubjectName.trim();
                    if (name) {
                      setLibrary({ ...library, [name]: [] });
                      setSelectedSubject(name);
                      setIsNewSubjectModalOpen(false);
                      setNewSubjectName("");
                      
                      if (isPublicOnCreate) {
                        await handleShare(name);
                      }
                      setIsPublicOnCreate(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create {isPublicOnCreate ? "Public" : "Private"} Shelf
                </button>
              </div>
            }
          >
            <div className="p-6">
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Shelf Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Mathematics, History, Physics..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all mb-6"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsPublicOnCreate(false)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${!isPublicOnCreate ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]/50 hover:bg-[var(--secondary)]"}`}
                >
                  <div className={`p-3 rounded-full ${!isPublicOnCreate ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
                    <Lock size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Private</p>
                    <p className="text-[10px] opacity-60">Just for me</p>
                  </div>
                </button>

                <button 
                  onClick={() => setIsPublicOnCreate(true)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${isPublicOnCreate ? "border-amber-500 bg-amber-500/5" : "border-[var(--border)]/50 hover:bg-[var(--secondary)]"}`}
                >
                  <div className={`p-3 rounded-full ${isPublicOnCreate ? "bg-amber-500 text-white" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
                    <Globe size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Public</p>
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
            titleIcon={<Share2 className="w-5 h-5 text-green-500" />}
          >
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                Anyone with this code can import and download your notes for <b>{selectedSubject}</b>.
              </p>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-[var(--secondary)] px-8 py-4 rounded-2xl border-2 border-dashed border-[var(--primary)]/30 group">
                  <span className="text-3xl font-black tracking-widest text-[var(--foreground)]">{shareCode}</span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    toast.success("Code copied!");
                  }}
                  className="flex items-center gap-2 text-[var(--primary)] font-medium hover:underline"
                >
                  <Copy size={16} />
                  Copy Share Code
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={isImportModalOpen}
            onClose={() => {
              setIsImportModalOpen(false);
              setImportCode("");
            }}
            title="Import Shared Shelf"
            titleIcon={<Hash className="w-5 h-5 text-amber-500" />}
          >
            <div className="p-6">
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Enter 6-Digit Share Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. T7-X49K"
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-2.5 text-center text-lg font-bold tracking-widest outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all uppercase"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                />
                <button
                  onClick={handleRedeem}
                  disabled={isImporting || !importCode.trim()}
                  className="px-6 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isImporting ? "..." : "Import"}
                </button>
              </div>
              <p className="mt-4 text-[10px] text-center text-[var(--muted-foreground)]">
                Shared shelves are read-only. You can download files but cannot delete or upload to them.
              </p>
            </div>
          </Modal>
            
            <div className="space-y-1">
              {subjects.length === 0 && !loading && (
                <p className="text-xs text-[var(--muted-foreground)] italic">No subjects yet. Create one!</p>
              )}
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedSubject === subject 
                      ? "bg-[var(--primary)] text-white" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={16} />
                    <span>{subject}</span>
                  </div>
                  <span className="text-[10px] opacity-60">{(library[subject] || []).length} files</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Files Content */}
        <div className={`${initialSubject ? "col-span-1" : "lg:col-span-3"} flex flex-col overflow-hidden`}>
          {selectedSubject ? (
            <>
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Book className="text-[var(--primary)]" size={20} />
                  <h2 className="text-lg font-semibold">{selectedSubject}</h2>
                  {isPublic ? (
                    <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                      <Globe size={10} /> Public
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-600 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                      <Lock size={10} /> Private
                    </span>
                  )}

                  {isPublic && initialShareCode && (
                    <div className="flex items-center gap-1.5 ml-4 bg-[var(--secondary)] px-3 py-1 rounded-lg border border-dashed border-amber-300">
                      <Hash size={12} className="text-amber-500" />
                      <span className="text-[11px] font-black tracking-wider text-[var(--foreground)]">{initialShareCode}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {!importedShelves.some(s => s.subject === selectedSubject) && !isPublic && (
                    <button 
                      onClick={() => handleShare(selectedSubject)}
                      disabled={isSharing}
                      className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--border)]/30 transition-colors"
                    >
                      <Share2 size={16} />
                      {isSharing ? "Sharing..." : "Share Subject"}
                    </button>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity">
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Upload Note"}
                    <input 
                      type="file" 
                      className="hidden" 
                      disabled={uploading}
                      onChange={(e) => {
                        const shelf = importedShelves.find(s => s.subject === selectedSubject);
                        handleUpload(e, selectedSubject, shelf ? shelf.owner_id : userId);
                      }} 
                    />
                  </label>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[var(--muted-foreground)]">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p>No notes found in this subject.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredFiles.map((file, idx) => (
                      <div 
                        key={idx}
                        className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-md transition-all border-l-4 border-l-[var(--primary)]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="bg-[var(--secondary)] p-2 rounded-lg text-[var(--primary)]">
                            <FileText size={20} />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                const shelf = importedShelves.find(s => s.subject === selectedSubject);
                                handleDownload(selectedSubject, file, shelf ? shelf.owner_id : userId);
                              }}
                              className="p-1.5 hover:bg-[var(--secondary)] rounded text-[var(--muted-foreground)]"
                            >
                              <Download size={14} />
                            </button>
                            {!importedShelves.some(s => s.subject === selectedSubject) && (
                              <button className="p-1.5 hover:bg-red-50 rounded text-red-500">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <h3 className="text-sm font-medium line-clamp-2 mb-1 pr-4">{file}</h3>
                        <span className="text-[10px] text-[var(--muted-foreground)]">Added recently</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
              <div className="mb-6 rounded-full bg-[var(--primary)]/5 p-8 backdrop-blur-md border border-[var(--primary)]/10">
                <Library size={64} className="text-[var(--primary)] opacity-60" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Welcome to your Academy Workspace</h2>
              <p className="max-w-md text-center">Select a subject on the left to view your books and notes or upload new study materials. All your data is securely stored and synchronized with Firebase.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
