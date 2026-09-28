import { useMemo, useState, type FormEvent, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { supabase, type Board, type ChecklistDefinition, type NonConformity } from "./lib/supabase";
import bcrypt from 'bcryptjs';

// Type for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { useBoards, useChecklistDefinitions, useInspections, useNonConformities, useCreateBoard, useUpdateBoard, useCreateInspection, useCreateNonConformities, useUpdateNonConformity, useProfiles, useDeleteProfile, useUpdateProfile } from "./hooks/useSupabase";
import { useAuthContext } from "./contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

type ChecklistType = "QLF" | "CM" | "QE-AC" | "CT";
type BoardType = ChecklistType | "CD" | "QF" | "QLC" | "QCR" | "QRC" | "QE-CAG" | "Outros";
type InspectionAnswer = "Conforme" | "Não conforme" | "N/A";
type UserRole = "supervisor" | "tecnico";

type NonConformityStatus = "Aberta" | "Em tratamento" | "Resolvida";

type ChecklistItem = {
  id: string;
  label: string;
  answer: InspectionAnswer;
  note: string;
  photo?: string;
  definitionId?: string;
};

type InspectionRecord = {
  id: string;
  boardId: string;
  board: string;
  date: string;
  performedBy: string;
};

const checklistByType: Record<ChecklistType, string[]> = {
  QLF: [
    "Acesso livre ao quadro",
    "Aterramento das portas",
    "DPS",
    "Identificação do quadro",
    "Identificação de tensão",
    "Padrão de cores, barramento, terra e neutro",
    "Isolações bem feitas e fiação aparente",
    "Identificação de circuitos com anilhas",
    "Identificação dos disjuntores e circuitos",
    "Folha de circuitos",
    "Painel bem fixo e sem buracos",
    "Disjuntor de iluminação de emergência identificado",
    "Fechadura e miolo das portas",
    "Adesivo PERIGO CHOQUE ELÉTRICO",
    "Limpeza do quadro",
    "Projeto aprovado na porta do painel",
    "LEDs do painel",
    "Borracha de vedação",
    "Pintura",
    "Porta documentos",
  ],
  CM: [
    "Acesso livre ao quadro",
    "Aterramento das portas",
    "Identificação do quadro",
    "Identificação de tensão",
    "Isolações bem feitas e fiação aparente",
    "Painel bem fixo e sem buracos",
    "Fechadura e miolo das portas",
    "Adesivo PERIGO CHOQUE ELÉTRICO",
    "Limpeza do quadro",
    "Projeto aprovado na porta do painel",
    "Medidor de tensão",
    "Borracha de vedação",
    "Pintura",
    "Vidros",
    "Porta documentos",
  ],
  "QE-AC": [
    "Acesso livre ao quadro",
    "Aterramento das portas",
    "Identificação do quadro",
    "Identificação de tensão",
    "Isolações bem feitas e fiação aparente",
    "Painel bem fixo e sem buracos",
    "Fechadura e miolo das portas",
    "Adesivo PERIGO CHOQUE ELÉTRICO",
    "Limpeza do quadro",
    "Projeto aprovado na porta do painel",
    "Borracha de vedação",
    "Pintura",
    "Porta documentos",
  ],
  CT: [
    "Acesso livre ao quadro",
    "Aterramento das portas",
    "Identificação do quadro",
    "Identificação de tensão",
    "Painel bem fixo e sem buracos",
    "Fechadura e miolo das portas",
    "Adesivo PERIGO CHOQUE ELÉTRICO",
    "Limpeza do quadro",
    "Projeto aprovado na porta do painel",
    "Borracha de vedação",
    "Pintura",
    "Porta documentos",
  ],
};

const monthLabels = ["Abr", "Mai", "Jun", "Jul", "Ago", "Set"];

const normalizeBoardCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

const parseBrDate = (value: string) => {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return Number.NaN;
  return new Date(year, month - 1, day).getTime();
};

const isBoardUpToDate = (lastInspectionDate: string | null, frequency: Board['frequency']): boolean => {
  if (!lastInspectionDate) return false;
  const lastDate = parseBrDate(lastInspectionDate);
  if (isNaN(lastDate)) return false;
  
  const now = Date.now();
  const monthsMap: Record<Board['frequency'], number> = {
    monthly: 1,
    semester: 6,
    annual: 12,
  };
  const monthsAllowed = monthsMap[frequency] || 6;
  const nextDue = new Date(lastDate);
  nextDue.setMonth(nextDue.getMonth() + monthsAllowed);
  
  return now <= nextDue.getTime();
};

const getFrequencyLabel = (frequency: Board['frequency']): string => {
  switch (frequency) {
    case 'monthly': return 'Mensal';
    case 'semester': return 'Semestral (6 meses)';
    case 'annual': return 'Anual';
    default: return 'Semestral (6 meses)';
  }
};

const formatActivityDate = (value: string) => {
  const timestamp = parseBrDate(value);
  if (Number.isNaN(timestamp)) return value;
  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const defaultChecklistFor = (type: BoardType): ChecklistType =>
  type in checklistByType ? (type as ChecklistType) : "QE-AC";

const makeChecklist = (type: ChecklistType, definitions: ChecklistDefinition[]): ChecklistItem[] => {
  const labels = checklistByType[type] || checklistByType["QE-AC"];
  return labels.map((label, index) => ({
    id: definitions[index]?.id || String(index),
    label,
    answer: "Conforme" as InspectionAnswer,
    note: "",
    definitionId: definitions[index]?.id,
  }));
};

function App() {
  const { user: currentUser, loading: authLoading } = useAuthContext();
  const { data: boardsData } = useBoards();
  const { data: checklistData } = useChecklistDefinitions(currentUser ? (boardsData?.[0]?.checklist_type as ChecklistType) || "QE-AC" : "QE-AC");
  const { data: inspectionsData } = useInspections();
  const { data: nonConformitiesData } = useNonConformities();
  const { data: profilesData } = useProfiles();
  const queryClient = useQueryClient();

  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard();
  const createInspectionMutation = useCreateInspection();
  const createNonConformitiesMutation = useCreateNonConformities();
  const updateNonConformityMutation = useUpdateNonConformity();
  const deleteProfileMutation = useDeleteProfile();
  const updateProfileMutation = useUpdateProfile();

  const [activeView, setActiveView] = useState<
    "overview" | "boards" | "editBoards" | "inspection" | "issues" | "users" | "history"
  >("overview");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newBoard, setNewBoard] = useState<Partial<Board>>({});
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [search, setSearch] = useState("");
  const [boardTypeFilter, setBoardTypeFilter] = useState<"Todos" | BoardType>("Todos");
  const [boardStatusFilter, setBoardStatusFilter] = useState<"Todos" | Board["status"]>("Todos");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completed, setCompletionModal] = useState(false);
  const [issueFilter, setIssueFilter] = useState<"Todas" | NonConformityStatus>("Todas");
  const [issueTypeFilter, setIssueTypeFilter] = useState<"Todos" | "Todos os tipos" | BoardType>("Todos");
  const [historyBoardFilter, setHistoryBoardFilter] = useState<string>("Todos");
  const [historyPersonFilter, setHistoryPersonFilter] = useState<string>("Todos");
  const [newTechnicianName, setNewTechnicianName] = useState("");
  const [newTechnicianUsername, setNewTechnicianUsername] = useState("");
  const [newTechnicianPassword, setNewTechnicianPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("tecnico");
  
  // User editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<UserRole>("tecnico");
  const [editUserPassword, setEditUserPassword] = useState("");

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const cameraRef = useRef<HTMLVideoElement>(null);

  // Swipe state for checklist navigation
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);

  // PWA Install handling
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after a delay if not on iOS
      if (!isIOSDevice) {
        setTimeout(() => setShowInstallBanner(true), 30000);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });
      setCameraStream(stream);
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraStream) return null;
    
    const video = cameraRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
    });
    
    stopCamera();
    
    // Upload to Supabase Storage
    try {
      const ext = 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `inspections/${fileName}`;
      
      const { error } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      alert('Erro ao enviar foto: ' + err.message);
      return null;
    }
  }, [cameraStream, stopCamera]);

  const flipCamera = useCallback(() => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Swipe handlers for checklist navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX === null) return;
    const swipeEndX = e.changedTouches[0].clientX;
    const diff = swipeStartX - swipeEndX;
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      // Could add swipe navigation here if needed
      // For now just reset
    }
    setSwipeStartX(null);
  }, [swipeStartX]);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
  }, []);

  const boards: Board[] = useMemo(() => {
    if (!boardsData) return [];
    console.log('boardsData:', boardsData);
    return boardsData.map((b: typeof boardsData[0]) => ({
      ...b,
      id: b.id,
      code: b.code,
      location: b.location,
      type: b.type as BoardType,
      checklist_type: b.checklist_type,
      description: b.description,
      last_inspection: b.last_inspection,
      status: (b.status || "Pendente") as "Em dia" | "Pendente",
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));
  }, [boardsData]);

  const selectedBoard = useMemo(() => {
    return boards.find((b) => b.id === selectedBoardId) || boards[0];
  }, [boards, selectedBoardId]);

  const nonConformityList = useMemo(() => {
    if (!nonConformitiesData) return [];
    return nonConformitiesData as unknown as NonConformity[];
  }, [nonConformitiesData]);

  const inspectionHistory: InspectionRecord[] = useMemo(() => {
    if (!inspectionsData) return [];
    return inspectionsData.map((i: typeof inspectionsData[0]) => {
      const board = boards.find((b) => b.id === i.board_id);
      return {
        id: i.id,
        boardId: i.board_id,
        board: board?.code || "",
        date: i.date,
        performedBy: i.performed_by_name,
      };
    });
  }, [inspectionsData, boards]);

  // Filtered history for history view
  const filteredHistory = useMemo(() => {
    return inspectionHistory
      .sort((a, b) => parseBrDate(b.date) - parseBrDate(a.date))
      .filter((inspection) => {
        const matchesBoard = historyBoardFilter === "Todos" || inspection.board === historyBoardFilter;
        const matchesPerson = historyPersonFilter === "Todos" || inspection.performedBy === historyPersonFilter;
        return matchesBoard && matchesPerson;
      });
  }, [inspectionHistory, historyBoardFilter, historyPersonFilter]);

  // Load checklist when board changes
  useEffect(() => {
    if (selectedBoard && checklistData) {
      const type = selectedBoard.checklist_type as ChecklistType;
      setChecklist(makeChecklist(type, checklistData));
    }
  }, [selectedBoard, checklistData]);

  // Locations
  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const board of boards) {
      if (!board.location) continue;
      counts.set(board.location, (counts.get(board.location) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => {
        const numA = a[0].match(/(\d+)/);
        const numB = b[0].match(/(\d+)/);
        if (numA && numB && a[0].startsWith("GT") && b[0].startsWith("GT")) {
          return Number(numA[1]) - Number(numB[1]);
        }
        if (numA && !numB) return -1;
        if (!numA && numB) return 1;
        return a[0].localeCompare(b[0], "pt-BR");
      })
      .map(([location, count]) => ({ location, count }));
  }, [boards]);

  const locationCount = locationOptions.length;
  const hasActiveFilters =
    search.trim() !== "" ||
    boardTypeFilter !== "Todos" ||
    boardStatusFilter !== "Todos" ||
    locationFilter !== "Todos";

  const activeLocationFilter =
    locationFilter === "Todos" ||
    locationOptions.some((option) => option.location === locationFilter)
      ? locationFilter
      : "Todos";

  const lastInspectionByBoard = useMemo(() => {
    const latest = new Map<string, string>();
    for (const inspection of inspectionHistory) {
      if (!inspection.boardId) continue;
      const current = latest.get(inspection.boardId);
      if (!current || parseBrDate(inspection.date) > parseBrDate(current)) {
        latest.set(inspection.boardId, inspection.date);
      }
    }
    return latest;
  }, [inspectionHistory]);

  const filteredBoards = useMemo(
    () => {
      const result = boards
        .map((board) => {
          const last = lastInspectionByBoard.get(board.id);
          const upToDate = last ? isBoardUpToDate(last, board.frequency) : false;
          return last
            ? { ...board, status: upToDate ? "Em dia" as const : "Pendente" as const, last_inspection: last }
            : { ...board, status: "Pendente" as const };
        })
        .filter((board) => {
          const matchesSearch = `${board.code} ${board.location}`
            .toLowerCase()
            .includes(search.toLowerCase());
          const matchesType = boardTypeFilter === "Todos" || board.type === boardTypeFilter;
          const matchesStatus = boardStatusFilter === "Todos" || board.status === boardStatusFilter;
          const matchesLocation = activeLocationFilter === "Todos" || board.location === activeLocationFilter;
          return matchesSearch && matchesType && matchesStatus && matchesLocation;
        });
      return result;
    },
    [activeLocationFilter, boardStatusFilter, boardTypeFilter, boards, lastInspectionByBoard, search]
  );

  const chooseBoard = (board: Board) => {
    setSelectedBoardId(board.id);
    setShowBoardForm(false);
    setActiveView("inspection");
  };

  const updateBoardField = async (id: string, field: string, value: any) => {
    await updateBoardMutation.mutateAsync({ id, [field]: value });
    queryClient.invalidateQueries({ queryKey: ['boards'] });
  };

  const updateNewBoardField = (field: string, value: any) => {
    setNewBoard((board) => {
      const next = { ...board, [field]: value };
      if (field === "type") next.checklist_type = defaultChecklistFor(value as BoardType);
      return next;
    });
  };

  const registerBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = newBoard.code?.trim();
    if (!code) return;
    await createBoardMutation.mutateAsync({
      code,
      location: newBoard.location || "",
      type: newBoard.type || "QLF",
      checklist_type: newBoard.checklist_type || "QLF",
      description: newBoard.description || "",
      status: "Pendente" as const,
      last_inspection: null,
      frequency: newBoard.frequency || "semester",
    });
    setNewBoard({});
    setShowBoardForm(false);
  };

  const updateAnswer = (id: string, answer: InspectionAnswer) => {
    setChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, answer } : item))
    );
  };

  const updateNote = (id: string, note: string) => {
    setChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const updatePhoto = async (id: string, file?: File) => {
    if (!file) return;

    // Show loading state
    setChecklist((items) =>
      items.map((item) =>
        item.id === id ? { ...item, photo: 'loading' } : item
      )
    );

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `inspections/${fileName}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update checklist with the public URL
      setChecklist((items) =>
        items.map((item) =>
          item.id === id ? { ...item, photo: publicUrl } : item
        )
      );
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      alert('Erro ao enviar foto: ' + err.message);
      // Reset on error
      setChecklist((items) =>
        items.map((item) =>
          item.id === id ? { ...item, photo: undefined } : item
        )
      );
    }
  };

  const nonConformities = checklist.filter(
    (item) => item.answer === "Não conforme",
  ).length;
  const filteredIssues = useMemo(() => {
    const groups = nonConformityList.reduce<Record<string, NonConformity[]>>(
      (result, issue) => {
        const inspectionId = issue.inspection_id || 'unknown';
        const groupKey = `${inspectionId}-${issue.board_id || normalizeBoardCode(issue.board_code)}`;
        result[groupKey] = [...(result[groupKey] || []), issue];
        return result;
      },
      {}
    );
    return Object.values(groups)
      .map((items) => ({ ...items[0], items }))
      .filter(
        (issue) =>
          (issueFilter === "Todas" ||
            issue.items?.some((item) => item.status === issueFilter)) &&
          (issueTypeFilter === "Todos" ||
            issueTypeFilter === "Todos os tipos" ||
            issue.type === issueTypeFilter),
      );
  }, [issueFilter, issueTypeFilter, nonConformityList]);

  const openIssues = nonConformityList.filter(
    (issue) => issue.status !== "Resolvida",
  ).length;
  const inspectedBoardIds = new Set(inspectionHistory.map((inspection) => inspection.boardId).filter(Boolean));
  const uniqueInspections = new Set(inspectionHistory.map((inspection) => inspection.id));
  const pendingBoards = boards.length - inspectedBoardIds.size;
  const resolvedIssues = nonConformityList.filter((issue) => issue.status === "Resolvida").length;
  const conformityRate = nonConformityList.length === 0
    ? 100
    : Math.round((resolvedIssues / nonConformityList.length) * 100);
  const inspectionChart = monthLabels.map((month, index) => {
    const monthNumber = String(index + 4).padStart(2, "0");
    const count = new Set(
      inspectionHistory
        .filter((inspection) => inspection.date.slice(3, 5) === monthNumber)
        .map((inspection) => inspection.id),
    ).size;
    return { month, count };
  });
  const chartMax = Math.max(...inspectionChart.map((item) => item.count), 1);

  const recentActivity = useMemo(() => {
    const inspections = inspectionHistory.map((inspection) => ({
      key: `inspection-${inspection.id}`,
      icon: "✓",
      title: "Preventiva concluída",
      description: `${inspection.board} · ${inspection.performedBy}`,
      date: inspection.date,
      tone: "green",
    }));
    const issues = nonConformityList.flatMap((issue) => [
      {
        key: `issue-${issue.id}`,
        icon: "!",
        title: "Não conformidade registrada",
        description: `${issue.board_code} · ${issue.item}`,
        date: issue.date,
        tone: "red",
      },
      ...(issue.resolved_at
        ? [{
          key: `resolved-${issue.id}`,
          icon: "✓",
          title: "Não conformidade resolvida",
          description: `${issue.board_code} · ${issue.item}`,
          date: issue.resolved_at,
          tone: "green",
        }]
        : []),
    ]);
    return [...inspections, ...issues]
      .map((event) => ({ ...event, sortKey: parseBrDate(event.date) }))
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, 5)
      .map(({ sortKey: _sortKey, ...event }) => ({
        ...event,
        time: formatActivityDate(event.date),
      }));
  }, [inspectionHistory, nonConformityList]);

  const isSupervisor = currentUser?.role === "supervisor";
  const { signOut: authSignOut, createUser } = useAuthContext();

  const handleLogout = async () => {
    await authSignOut();
    queryClient.clear();
  };

  const addTechnician = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTechnicianName || !newTechnicianUsername || !newTechnicianPassword) return;
    await createUser(newTechnicianName, newTechnicianUsername, newTechnicianPassword, newUserRole);
    setNewTechnicianName("");
    setNewTechnicianUsername("");
    setNewTechnicianPassword("");
    setNewUserRole("tecnico");
  };

  const setCompleted = async (value: boolean) => {
    if (!selectedBoard || !currentUser) return;

    // Check if all items have an answer
    const unanswered = checklist.filter((item) => !item.answer);
    if (unanswered.length > 0) {
      alert(`${unanswered.length} item(ns) sem resposta. Por favor, responda todos os itens.`);
      return;
    }

    try {
      // First create the inspection (DB generates UUID)
      const inspectionRecord = {
        board_id: selectedBoard.id,
        performed_by: currentUser?.id || null,
        performed_by_name: currentUser?.name || "",
        date: new Date().toISOString().split('T')[0],
      };

      const inspection = await createInspectionMutation.mutateAsync(inspectionRecord as any);
      const inspectionId = inspection.id; // Use the DB-generated UUID

      // Then create non-conformities with the real inspection UUID
      if (value && nonConformities > 0) {
        const newIssues = checklist
          .filter((item) => item.answer === "Não conforme")
          .map((item) => ({
            inspection_id: inspectionId,
            board_id: selectedBoard.id,
            board_code: selectedBoard.code,
            location: selectedBoard.location,
            type: selectedBoard.checklist_type,
            item: item.label,
            description: item.note || "Item reprovado durante a inspeção.",
            photo: item.photo || null,
            performed_by: currentUser.id,
            performed_by_name: currentUser.name,
            date: new Date().toISOString().split('T')[0],
            priority: "Alta" as const,
            status: "Aberta" as const,
          }));
        await createNonConformitiesMutation.mutateAsync(newIssues as any);
      }

      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setCompletionModal(value);
    } catch (err: any) {
      alert("Erro ao finalizar: " + (err.message || "Erro desconhecido"));
      console.error(err);
    }
  };

  const updateIssueStatus = async (id: string, status: NonConformityStatus) => {
    const resolvedAt = new Date().toISOString().split('T')[0];
    await updateNonConformityMutation.mutateAsync({
      id,
      status,
      resolved_after_inspection: status === "Resolvida",
      resolved_at: status === "Resolvida" ? resolvedAt : null,
      resolved_by: status === "Resolvida" && currentUser ? currentUser.id : null,
      resolved_by_name: status === "Resolvida" && currentUser ? currentUser.name : null,
    });
  };

  if (authLoading) return <div className="loading">Carregando...</div>;
  if (!currentUser) return <LoginScreen />;

  const navigate = (view: "overview" | "boards" | "editBoards" | "inspection" | "issues" | "users" | "history") => {
    if (!isSupervisor && (view === "editBoards" || view === "users")) {
      setActiveView("overview");
      return;
    }
    setActiveView(view);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>Preventiva</span>
        </div>
        <div className="site-label">
          BARRA SHOPPING SUL <span className="online-dot" />
        </div>
        <nav className="navigation" aria-label="Navegação principal">
          <button
            className={
              activeView === "overview" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("overview")}
          >
            <span>▦</span> Visão geral
          </button>
          <button
            className={activeView === "boards" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("boards")}
          >
            <span>▤</span> Quadros e locais
          </button>
          {isSupervisor && <button
            className={activeView === "editBoards" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("editBoards")}
          ><span>✎</span> Editar quadros</button>}
          <button
            className={
              activeView === "inspection" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("inspection")}
          >
            <span>✓</span> Nova preventiva
          </button>
          <>
            <button
              className={activeView === "issues" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("issues")}
            ><span>!</span> Não conformidades <b className="nav-count">{openIssues}</b></button>
            <button
              className={activeView === "history" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("history")}
            ><span>⏱</span> Histórico de preventivas</button>
            {isSupervisor && (
            <button
              className={activeView === "users" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("users")}
            ><span>♙</span> Usuários e técnicos</button>
            )}
          </>
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{currentUser?.name?.[0]}{currentUser?.name?.split(' ').slice(-1)[0]?.[0] || ''}</span>
          <div>
            <strong>{currentUser?.name}</strong>
            <small>{currentUser?.role === "supervisor" ? "Supervisor técnico" : "Técnico"}</small>
          </div>
          <span className="dots">•••</span>
        </div>
      </aside>

      <main className="main-content">
        {activeView === "issues" && (
          <section className="issues-view">
            <div className="view-toolbar">
              <div>
                <h2>Resolver problemas encontrados</h2>
                <p>Preventivas concluídas que geraram não conformidades</p>
              </div>
              <div className="issue-counter">
                <strong>{openIssues}</strong>
                <span>pendentes</span>
              </div>
            </div>
            <div className="issue-overview">
              <IssueStat
                tone="red"
                value={String(nonConformityList.length)}
                label="Total registrado"
                icon="!"
              />
              <IssueStat
                tone="amber"
                value={String(
                  nonConformityList.filter((issue) => issue.status === "Aberta").length
                )}
                label="Aguardando ação"
                icon="◷"
              />
              <IssueStat
                tone="blue"
                value={String(
                  nonConformityList.filter(
                    (issue) => issue.status === "Em tratamento",
                  ).length,
                )}
                label="Em tratamento"
                icon="↗"
              />
              <IssueStat
                tone="green"
                value={String(
                  nonConformityList.filter(
                    (issue) => issue.status === "Resolvida",
                  ).length,
                )}
                label="Resolvidas após preventiva"
                icon="✓"
              />
            </div>
            <div className="issue-toolbar">
              <div>
                <h3>Ocorrências por preventiva</h3>
                <p>
                  Abra uma ocorrência para acompanhar a solução individualmente.
                </p>
              </div>
              <div className="issue-filters">
                <select
                  value={issueTypeFilter}
                  onChange={(event) =>
                    setIssueTypeFilter(
                      event.target.value as "Todos" | "Todos os tipos" | BoardType,
                    )
                  }
                  aria-label="Filtrar por tipo de preventiva"
                >
                  <option>Todos os tipos</option>
                  <option value="Todos">Todos</option>
                  <option value="QLF">QLF</option>
                  <option value="CM">CM</option>
                  <option value="QE-AC">QE-AC</option>
                  <option value="CT">CT Automação</option>
                  <option value="CD">CD</option>
                  <option value="QF">QF</option>
                  <option value="QLC">QLC</option>
                <option value="QCR">QCR</option>
                <option value="QRC">QRC</option>
                  <option value="QE-CAG">QE-CAG</option>
                  <option value="Outros">Outros</option>
                </select>
                <div className="issue-tabs">
                  {(
                    ["Todas", "Aberta", "Em tratamento", "Resolvida"] as const
                  ).map((filter) => (
                    <button
                      className={
                        issueFilter === filter
                          ? "issue-tab active"
                          : "issue-tab"
                      }
                      onClick={() => setIssueFilter(filter)}
                      key={filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="issue-list">
              {filteredIssues.map((issue) => (
                <IssueCard
                  issue={issue}
                  onStatusChange={updateIssueStatus}
                  key={issue.id}
                />
              ))}
              {filteredIssues.length === 0 && (
                <div className="empty-state">
                  <span>✓</span>
                  <strong>Nenhuma ocorrência nesta categoria</strong>
                  <p>
                    As não conformidades aparecerão aqui ao finalizar uma
                    preventiva.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        <header className="topbar">
          <div>
            <p className="eyebrow">MANUTENÇÃO PREDIAL / {new Date().toLocaleDateString("pt-BR")}</p>
            <h1>
              {activeView === "inspection"
                ? "Executar preventiva"
                : activeView === "boards"
                  ? "Quadros e locais"
                  : activeView === "editBoards"
                    ? "Editar quadros"
                    : activeView === "users"
                      ? "Usuários e técnicos"
                    : activeView === "issues"
                      ? "Não conformidades"
                      : `Bom dia, ${currentUser?.name?.split(' ')[0] || "Usuário"}`}
            </h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificações">
              ♢<span className="notification-dot" />
            </button>
            <button className="user-button" onClick={handleLogout} title="Sair">
              <span className="avatar small">{currentUser?.name?.[0]}{currentUser?.name?.split(' ').slice(-1)[0]?.[0] || ''}</span>
              <span>{currentUser?.name}</span>⌄
            </button>
          </div>
        </header>

        {activeView === "overview" && (
          <>
            <section className="welcome-row">
              <div>
                <h2>Painel de preventivas</h2>
                <p>
                  Acompanhe a saúde dos quadros elétricos e as inspeções da
                  equipe.
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => setActiveView("boards")}
              >
                + Iniciar inspeção
              </button>
            </section>
            <section className="metrics-grid">
              <Metric
                label="Preventivas concluídas"
                value={String(uniqueInspections.size)}
                detail={`${inspectedBoardIds.size} quadros inspecionados`}
                tone="blue"
                icon="✓"
              />
              <Metric
                label="Quadros pendentes"
                value={String(pendingBoards)}
                detail="Sem preventiva registrada"
                tone="amber"
                icon="!"
              />
              <Metric
                label="Itens resolvidos"
                value={`${conformityRate}%`}
                detail={`${resolvedIssues} de ${nonConformityList.length} ocorrências`}
                tone="green"
                icon="↗"
              />
              <Metric
                label="Não conformidades"
                value={String(openIssues)}
                detail="Pendentes de resolução"
                tone="red"
                icon="!"
              />
            </section>
            <section className="content-grid">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Execução das preventivas</h3>
                    <p>Preventivas registradas nos últimos 6 meses</p>
                  </div>
                  <span className="chart-total">{uniqueInspections.size} registrada(s)</span>
                </div>
                <div className="chart">
                  <div className="chart-axis">
                    <span>{chartMax}</span>
                    <span>{Math.ceil(chartMax * 0.75)}</span>
                    <span>{Math.ceil(chartMax * 0.5)}</span>
                    <span>{Math.ceil(chartMax * 0.25)}</span>
                    <span>0</span>
                  </div>
                  <div className="bars">
                    {inspectionChart.map(({ month, count }) => (
                      <div className="bar-group" key={month}>
                        <div className="bar-track">
                          <div
                            className="bar"
                            style={{ height: `${count === 0 ? 2 : (count / chartMax) * 100}%` }}
                          />
                        </div>
                        <span>{month} <b>{count}</b></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h3>Atividade recente</h3>
                  <p>Últimas movimentações no sistema</p>
                </div>
              </div>
              <div className="activity-list">
                {recentActivity.map((event) => (
                  <Activity
                    key={event.key}
                    icon={event.icon}
                    title={event.title}
                    description={event.description}
                    time={event.time}
                    tone={event.tone}
                  />
                ))}
                {recentActivity.length === 0 && (
                  <div className="empty-state">
                    <span>◷</span>
                    <strong>Nenhuma movimentação registrada</strong>
                    <p>
                      As preventivas concluídas e as não conformidades
                      encontradas aparecem aqui.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeView === "boards" && (
          <section className="boards-view">
            <div className="view-toolbar">
              <div>
                <h2>Catálogo de ativos</h2>
                <p>
                  {hasActiveFilters
                    ? `${filteredBoards.length} de ${boards.length} quadros`
                    : `${boards.length} quadros cadastrados em ${locationCount} locais`}
                </p>
              </div>
              {isSupervisor && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setNewBoard({});
                    setShowBoardForm((value) => !value);
                  }}
                >
                  {showBoardForm ? "Cancelar" : "+ Cadastrar quadro"}
                </button>
              )}
            </div>
            {showBoardForm && isSupervisor && (
              <form className="panel board-form" onSubmit={registerBoard}>
                <h3>Cadastrar quadro</h3>
                <div className="board-form-grid">
                  <label>
                    Código do quadro
                    <input
                      value={newBoard.code || ""}
                      onChange={(event) => updateNewBoardField("code", event.target.value)}
                      placeholder="QLF-1A"
                      required
                    />
                  </label>
                  <label>
                    Local
                    <input
                      value={newBoard.location || ""}
                      onChange={(event) => updateNewBoardField("location", event.target.value)}
                      placeholder="GT 01"
                    />
                  </label>
                  <label>
                    Descrição
                    <input
                      value={newBoard.description || ""}
                      onChange={(event) => updateNewBoardField("description", event.target.value)}
                      placeholder="Quadro de força e luz"
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={newBoard.type || "QLF"}
                      onChange={(event) =>
                        updateNewBoardField("type", event.target.value as BoardType)
                      }
                    >
                      <option value="QLF">QLF</option>
                      <option value="CM">CM</option>
                      <option value="QE-AC">QE-AC</option>
                      <option value="CT">CT Automação</option>
                      <option value="CD">CD</option>
                      <option value="QF">QF</option>
                      <option value="QLC">QLC</option>
                      <option value="QCR">QCR</option>
                      <option value="QRC">QRC</option>
                      <option value="QE-CAG">QE-CAG</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </label>
                  <label>
                    Checklist
                    <select
                      value={newBoard.checklist_type || "QLF"}
                      onChange={(event) =>
                        updateNewBoardField(
                          "checklist_type",
                          event.target.value as ChecklistType,
                        )
                      }
                    >
                      <option value="QLF">QLF</option>
                      <option value="CM">CM</option>
                      <option value="QE-AC">QE-AC</option>
                      <option value="CT">CT Automação</option>
                    </select>
                  </label>
                  <label>
                    Frequência
                    <select
                      value={newBoard.frequency || "semester"}
                      onChange={(event) =>
                        updateNewBoardField(
                          "frequency",
                          event.target.value as Board['frequency'],
                        )
                      }
                    >
                      <option value="semester">Semestral (6 meses)</option>
                      <option value="monthly">Mensal</option>
                      <option value="annual">Anual</option>
                    </select>
                  </label>
                </div>
                <button className="primary-button" type="submit">
                  Salvar quadro
                </button>
              </form>
            )}
            <div className="filters">
              <div className="search-field">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por código ou local..."
                />
              </div>
              <select
                className="filter-button"
                value={boardTypeFilter}
                onChange={(event) =>
                  setBoardTypeFilter(
                    event.target.value as "Todos" | BoardType,
                  )
                }
                aria-label="Filtrar quadros por tipo"
              >
                <option value="Todos">Todos os tipos</option>
                <option value="QLF">QLF</option>
                <option value="CM">CM</option>
                <option value="QE-AC">QE-AC</option>
                <option value="CT">CT Automação</option>
                <option value="CD">CD</option>
                <option value="QF">QF</option>
                <option value="QLC">QLC</option>
                <option value="QCR">QCR</option>
                <option value="QRC">QRC</option>
                <option value="QE-CAG">QE-CAG</option>
                <option value="Outros">Outros</option>
              </select>
              <select
                className="filter-button location-filter"
                value={activeLocationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                aria-label="Filtrar quadros por local"
              >
                <option value="Todos">Todos os locais</option>
                {locationOptions.map(({ location, count }) => (
                  <option key={location} value={location}>
                    {location} ({count})
                  </option>
                ))}
              </select>
              <select
                className="filter-button"
                value={boardStatusFilter}
                onChange={(event) =>
                  setBoardStatusFilter(
                    event.target.value as "Todos" | Board["status"],
                  )
                }
                aria-label="Filtrar quadros por status"
              >
                <option value="Todos">Todos os status</option>
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <div className="board-table">
              <div className="table-header">
                <span>Quadro / descrição</span>
                <span>Local</span>
                <span>Tipo</span>
                <span>Última inspeção</span>
                <span>Status</span>
                <span />
              </div>
              {filteredBoards.map((board) => (
                <button
                  className="table-row"
                  key={board.id}
                  onClick={() => chooseBoard(board)}
                >
                  <span className="board-name">
                    <strong>{board.code}</strong>
                    <small>{board.description}</small>
                  </span>
                  <span>{board.location}</span>
                  <span>
                    <span className="type-pill">{board.type}</span>
                  </span>
                  <span>{board.last_inspection || "-"}</span>
                  <span className={board.status === "Em dia" ? "status good" : "status pending"}>
                    <i />
                    {board.status}
                  </span>
                  <span className="row-arrow">→</span>
                </button>
              ))}
              {filteredBoards.length === 0 && (
                <div className="empty-state">
                  <span>⌕</span>
                  <strong>Nenhum quadro encontrado</strong>
                  <p>
                    {boards.length === 0
                      ? "Nenhum quadro cadastrado. Use "+'"'+'+ Cadastrar quadro'+'"'+" para começar."
                      : "Ajuste a busca ou os filtros para ver outros quadros."}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {isSupervisor && activeView === "editBoards" && (
          <section className="boards-view">
            <div className="view-toolbar">
              <div>
                <p className="eyebrow">CADASTRO DE ATIVOS</p>
                <h2>Editar quadros cadastrados</h2>
                <p>Altere os dados diretamente nesta tela. Esta área não abre preventivas.</p>
              </div>
            </div>
            <div className="filters">
              <div className="search-field">
                <span>⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou local..." />
              </div>
              <select className="filter-button" value={boardTypeFilter} onChange={(event) => setBoardTypeFilter(event.target.value as "Todos" | BoardType)} aria-label="Filtrar edição por tipo">
                <option value="Todos">Todos os tipos</option>
                <option value="QLF">QLF</option>
                <option value="CM">CM</option>
                <option value="QE-AC">QE-AC</option>
                <option value="CT">CT Automação</option>
                <option value="CD">CD</option><option value="QF">QF</option><option value="QLC">QLC</option><option value="QCR">QCR</option><option value="QRC">QRC</option><option value="QE-CAG">QE-CAG</option><option value="Outros">Outros</option>
              </select>
              <select className="filter-button" value={boardStatusFilter} onChange={(event) => setBoardStatusFilter(event.target.value as "Todos" | Board["status"])} aria-label="Filtrar edição por status">
                <option value="Todos">Todos os status</option>
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <div className="board-table edit-board-table">
              <div className="table-header edit-table-header"><span>Quadro / descrição</span><span>Local</span><span>Tipo</span><span>Checklist</span><span>Última inspeção</span><span>Status</span><span /></div>
              {filteredBoards.map((board) => (
                <div className="table-row editing-row" key={board.id}>
                  <span className="board-name edit-fields">
                    <input value={board.code} onChange={(event) => updateBoardField(board.id, "code", event.target.value)} aria-label={`Código do quadro ${board.code}`} />
                    <input value={board.description} onChange={(event) => updateBoardField(board.id, "description", event.target.value)} aria-label={`Descrição do quadro ${board.code}`} />
                  </span>
                  <input className="inline-input" value={board.location} onChange={(event) => updateBoardField(board.id, "location", event.target.value)} aria-label={`Local do quadro ${board.code}`} />
                  <select className="inline-input" value={board.type} onChange={(event) => updateBoardField(board.id, "type", event.target.value as BoardType)} aria-label={`Tipo do quadro ${board.code}`}>
                    <option value="QLF">QLF</option><option value="CM">CM</option><option value="QE-AC">QE-AC</option><option value="CT">CT Automação</option><option value="CD">CD</option><option value="QF">QF</option><option value="QLC">QLC</option><option value="QCR">QCR</option><option value="QRC">QRC</option><option value="QE-CAG">QE-CAG</option><option value="Outros">Outros</option>
                  </select>
                  <label className="checklist-editor"><span>Checklist</span><select className="inline-input" value={board.checklist_type} onChange={(event) => updateBoardField(board.id, "checklist_type", event.target.value as ChecklistType)} aria-label={`Checklist do quadro ${board.code}`}><option value="QLF">QLF</option><option value="CM">CM</option><option value="QE-AC">QE-AC</option><option value="CT">CT Automação</option></select></label>
                  <span className="edit-inspection-date">{board.last_inspection || "-"}</span>
                  <span className={`edit-status ${board.status === "Em dia" ? "status good" : "status pending"}`}>
                    <i />
                    {board.status}
                  </span>
                  <span className="row-actions" aria-label="Edição automática" />
                </div>
              ))}
            </div>
          </section>
        )}

        {isSupervisor && activeView === "users" && (
          <section className="users-view">
            <div className="view-toolbar"><div><p className="eyebrow">CONTROLE DE ACESSO</p><h2>Usuários e técnicos</h2><p>Cadastre quem poderá executar as preventivas.</p></div></div>
            <div className="users-layout">
              <form className="panel user-form" onSubmit={addTechnician}>
                <h3>Cadastrar usuário</h3>
                <label>Nome<input value={newTechnicianName} onChange={(event) => setNewTechnicianName(event.target.value)} placeholder="Nome completo" required /></label>
                <label>Usuário<input type="text" value={newTechnicianUsername} onChange={(event) => setNewTechnicianUsername(event.target.value)} placeholder="nome.usuario" autoComplete="username" required /></label>
                <label>Senha<input type="password" value={newTechnicianPassword} onChange={(event) => setNewTechnicianPassword(event.target.value)} placeholder="Senha de acesso" autoComplete="new-password" required /></label>
                <label>Papel<select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as UserRole)} required><option value="tecnico">Técnico</option><option value="supervisor">Supervisor</option></select></label>
                <button className="primary-button" type="submit">Cadastrar usuário</button>
              </form>
              <div className="panel users-list">
                <div className="panel-heading">
                  <div>
                    <h3>Perfis cadastrados</h3>
                    <p>Usuários criados no sistema (senhas criptografadas)</p>
                  </div>
                </div>
                {profilesData && profilesData.length > 0 ? (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Usuário</th>
                          <th>Papel</th>
                          <th>Criado em</th>
                          <th style={{ width: '120px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profilesData.map((profile) => (
                          <tr key={profile.id}>
                            {editingUserId === profile.id ? (
                              <td colSpan={5} style={{ padding: '16px' }}>
                                <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  const updates: { id: string; name: string; role: 'supervisor' | 'tecnico'; password_hash?: string } = {
                                    id: profile.id,
                                    name: editUserName,
                                    role: editUserRole,
                                  };
                                  if (editUserPassword) {
                                    updates.password_hash = await bcrypt.hash(editUserPassword, 10);
                                  }
                                  updateProfileMutation.mutate(updates as any, {
                                    onSuccess: () => {
                                      setEditingUserId(null);
                                      setEditUserName('');
                                      setEditUserRole('tecnico');
                                      setEditUserPassword('');
                                    }
                                  });
                                }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                  <div style={{ flex: '1 1 200px' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 700, color: '#53677d' }}>Nome</label>
                                    <input
                                      value={editUserName}
                                      onChange={(e) => setEditUserName(e.target.value)}
                                      placeholder="Nome completo"
                                      style={{ width: '100%', minHeight: '38px', padding: '8px 10px', border: '1px solid #d6e0ea', borderRadius: '5px', fontSize: '11px' }}
                                      required
                                    />
                                  </div>
                                  <div style={{ flex: '1 1 140px' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 700, color: '#53677d' }}>Papel</label>
                                    <select
                                      value={editUserRole}
                                      onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                                      style={{ width: '100%', minHeight: '38px', padding: '8px 10px', border: '1px solid #d6e0ea', borderRadius: '5px', fontSize: '11px' }}
                                    >
                                      <option value="tecnico">Técnico</option>
                                      <option value="supervisor">Supervisor</option>
                                    </select>
                                  </div>
                                  <div style={{ flex: '1 1 160px' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 700, color: '#53677d' }}>Nova senha (opcional)</label>
                                    <input
                                      type="password"
                                      value={editUserPassword}
                                      onChange={(e) => setEditUserPassword(e.target.value)}
                                      placeholder="Deixe vazio para não alterar"
                                      style={{ width: '100%', minHeight: '38px', padding: '8px 10px', border: '1px solid #d6e0ea', borderRadius: '5px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="submit" className="primary-button" style={{ minHeight: '38px' }} disabled={updateProfileMutation.isPending}>
                                      {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                                    </button>
                                    <button type="button" className="secondary-button" style={{ minHeight: '38px', padding: '0 16px', border: '1px solid var(--line)', borderRadius: '6px', background: 'white', color: 'var(--muted)', fontWeight: 600 }} onClick={() => { setEditingUserId(null); setEditUserName(''); setEditUserRole('tecnico'); setEditUserPassword(''); }}>
                                      Cancelar
                                    </button>
                                  </div>
                                </form>
                              </td>
                            ) : (
                              <>
                                <td>
                                  <div className="user-info">
                                    <span className="user-name">{profile.name}</span>
                                  </div>
                                </td>
                                <td><span className="user-username">{profile.username}</span></td>
                                <td>
                                  <span className={`role-badge ${profile.role}`}>
                                    {profile.role === 'supervisor' ? 'Supervisor' : 'Técnico'}
                                  </span>
                                </td>
                                <td>{new Date(profile.created_at).toLocaleDateString('pt-BR')}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button
                                      className="icon-button"
                                      onClick={() => {
                                        setEditingUserId(profile.id);
                                        setEditUserName(profile.name);
                                        setEditUserRole(profile.role as UserRole);
                                        setEditUserPassword('');
                                      }}
                                      disabled={deleteProfileMutation.isPending || updateProfileMutation.isPending}
                                      title="Editar usuário"
                                      style={{ color: '#2474d3', background: '#e7f1ff' }}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      onClick={() => {
                                        if (confirm(`Excluir usuário "${profile.name}" (${profile.username})?`)) {
                                          deleteProfileMutation.mutate(profile.id);
                                        }
                                      }}
                                      disabled={deleteProfileMutation.isPending || updateProfileMutation.isPending}
                                      title="Excluir usuário"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <span>ℹ</span>
                    <strong>Nenhum usuário cadastrado</strong>
                    <p>Use o formulário ao lado para criar o primeiro usuário.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeView === "history" && (
          <section className="history-view">
            <div className="view-toolbar">
              <div>
                <p className="eyebrow">REGISTRO DE PREVENTIVAS</p>
                <h2>Histórico de preventivas realizadas</h2>
                <p>Todas as inspeções concluídas com responsável e data</p>
              </div>
            </div>
            <div className="filters history-filters">
              <select
                className="filter-button"
                value={historyBoardFilter}
                onChange={(event) => setHistoryBoardFilter(event.target.value)}
                aria-label="Filtrar por quadro"
              >
                <option value="Todos">Todos os quadros</option>
                {inspectionHistory
                  .map((i) => i.board)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .sort()
                  .map((board) => (
                    <option key={board} value={board}>{board}</option>
                  ))}
              </select>
              <select
                className="filter-button"
                value={historyPersonFilter}
                onChange={(event) => setHistoryPersonFilter(event.target.value)}
                aria-label="Filtrar por pessoa"
              >
                <option value="Todos">Todas as pessoas</option>
                {inspectionHistory
                  .map((i) => i.performedBy)
                  .filter((v): v is string => Boolean(v))
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .sort()
                  .map((person) => (
                    <option key={person} value={person}>{person}</option>
                  ))}
              </select>
            </div>
            <div className="panel history-table-container">
              {filteredHistory.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Quadro</th>
                      <th>Local</th>
                      <th>Tipo</th>
                      <th>Realizado por</th>
                      <th>Não conformidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((inspection) => {
                      const ncCount = nonConformityList.filter(
                        (nc) => nc.inspection_id === inspection.id
                      ).length;
                      return (
                        <tr key={inspection.id}>
                          <td>{inspection.date}</td>
                          <td>
                            <strong>{inspection.board}</strong>
                          </td>
                          <td>{boards.find((b) => b.id === inspection.boardId)?.location || '-'}</td>
                          <td>
                            <span className="type-pill">
                              {boards.find((b) => b.id === inspection.boardId)?.type || '-'}
                            </span>
                          </td>
                          <td>{inspection.performedBy || '-'}</td>
                          <td>
                            {ncCount > 0 ? (
                              <span className="issue-count">{ncCount} {ncCount === 1 ? 'item' : 'itens'}</span>
                            ) : (
                              <span className="ok-badge">✓ Sem não conformidades</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <span>⏱</span>
                  <strong>
                    {inspectionHistory.length > 0
                      ? "Nenhuma preventiva encontrada com os filtros atuais"
                      : "Nenhuma preventiva realizada"}
                  </strong>
                  <p>
                    {inspectionHistory.length > 0
                      ? "Ajuste os filtros de quadro ou pessoa para ver mais resultados."
                      : "As inspeções concluídas aparecerão aqui automaticamente."}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeView === "inspection" && selectedBoard && (
          <section className="inspection-view">
            <div className="inspection-head">
              <button
                className="back-button"
                onClick={() => setActiveView("boards")}
              >
                ← Voltar para quadros
              </button>
              <div className="inspection-title">
                <div>
                  <p className="eyebrow">
                    NOVA INSPEÇÃO / {selectedBoard.type}
                  </p>
                  <h2>{selectedBoard.code}</h2>
                  <p>
                    {selectedBoard.description}{" "}
                    <span className="separator">•</span>{" "}
                    {selectedBoard.location}
                  </p>
                </div>
                <div className="inspection-meta">
                  <span>
                    Periodicidade <strong>{getFrequencyLabel(selectedBoard.frequency)}</strong>
                  </span>
                  <span>
                    Responsável <strong>{currentUser?.name}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="progress-line">
              <span
                style={{
                  width: `${Math.round((checklist.filter((item) => item.answer !== "Conforme").length / checklist.length) * 100) || 8}%`,
                }}
              />
            </div>

            {/* Mobile Checklist Progress & Swipe Hint */}
            <div className="checklist-progress" role="status" aria-live="polite">
              <div className="progress-indicator">
                <span style={{ width: `${checklist.length > 0 ? Math.round((checklist.filter(i => i.answer !== "Conforme").length / checklist.length) * 100) : 0}%` }} />
              </div>
              <span className="progress-text">
                {checklist.filter(i => i.answer !== "Conforme").length} / {checklist.length}
              </span>
            </div>
            <p className="swipe-hint">Deslize para navegar entre os itens</p>

            <div className="inspection-layout">
              <div className="checklist-panel panel">
                <div className="panel-heading">
                  <div>
                    <h3>Checklist de inspeção</h3>
                    <p>
                      {checklist.length} itens • Responda conforme a condição
                      encontrada
                    </p>
                  </div>
                  <div className="check-summary">
                    <strong>
                      {
                        checklist.filter((item) => item.answer === "Conforme")
                          .length
                      }
                    </strong>
                    <span>conformes</span>
                  </div>
                </div>
                <div className="checklist-items">
                  {checklist.map((item, index) => (
                    <div
                      className={
                        item.answer === "Não conforme"
                          ? "check-item issue"
                          : "check-item"
                      }
                      key={item.id}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="item-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="item-content">
                        <strong>{item.label}</strong>
                        {item.answer === "Não conforme" && (
                          <>
                            <input
                              value={item.note}
                              onChange={(event) =>
                                updateNote(item.id, event.target.value)
                              }
                              placeholder="Descreva a não conformidade..."
                            />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              <label className="photo-upload" style={{ flex: '1 1 140px' }}>
                                <span>{item.photo ? "Trocar foto" : "Adicionar foto"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(event) => updatePhoto(item.id, event.target.files?.[0])}
                                  aria-label={`Foto da não conformidade: ${item.label}`}
                                />
                              </label>
                              <button
                                type="button"
                                className="camera-button"
                                onClick={() => startCamera()}
                                aria-label="Capturar foto com a câmera"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}} aria-hidden="true">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                  <circle cx="12" cy="12" r="4"/>
                                </svg>
                                <span>Câmera</span>
                              </button>
                            </div>
                            {item.photo && <img className="check-photo-preview" src={item.photo} alt={`Registro do item ${item.label}`} />}
                          </>
                        )}
                        <div
                          className="answer-group"
                          role="group"
                          aria-label={`Resposta para ${item.label}`}
                        >
                          <button
                            className={
                              item.answer === "Conforme"
                                ? "answer selected good-answer"
                                : "answer"
                            }
                            onClick={() => updateAnswer(item.id, "Conforme")}
                          >
                            ✓
                          </button>
                          <button
                            className={
                              item.answer === "Não conforme"
                                ? "answer selected bad-answer"
                                : "answer"
                            }
                            onClick={() => updateAnswer(item.id, "Não conforme")}
                          >
                            !
                          </button>
                          <button
                            className={
                              item.answer === "N/A"
                                ? "answer selected na-answer"
                                : "answer"
                            }
                            onClick={() => updateAnswer(item.id, "N/A")}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="inspection-footer">
                  <span>
                    {nonConformities > 0
                      ? `${nonConformities} não conformidade(s) serão geradas`
                      : "Nenhuma não conformidade registrada"}
                  </span>
                  <button
                    className="primary-button"
                    onClick={() => setCompleted(true)}
                  >
                    Finalizar preventiva
                  </button>
                </div>
              </div>
              <aside className="side-summary">
                <div className="panel">
                  <h3>Resumo da inspeção</h3>
                  <div className="asset-card">
                    <span className="asset-icon">▤</span>
                    <div>
                      <strong>{selectedBoard.code}</strong>
                      <small>{selectedBoard.location}</small>
                    </div>
                    <span className="type-pill">{selectedBoard.type}</span>
                  </div>
                  <div className="summary-row">
                    <span>Progresso</span>
                    <strong>
                      {checklist.length} / {checklist.length}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Conformes</span>
                    <strong className="green-text">
                      {
                        checklist.filter((item) => item.answer === "Conforme")
                          .length
                      }
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Não conformes</span>
                    <strong className="red-text">{nonConformities}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Não se aplica</span>
                    <strong>
                      {checklist.filter((item) => item.answer === "N/A").length}
                    </strong>
                  </div>
                </div>
                <div className="tip-box">
                  <span>✦</span>
                  <div>
                    <strong>Boa prática</strong>
                    <p>
                      Registre uma foto sempre que um item for marcado como não
                      conforme.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>
      {completed && (
        <div className="modal-backdrop">
          <div className="success-modal">
            <span className="success-icon">✓</span>
            <h2>Preventiva finalizada</h2>
            <p>
              A inspeção de <strong>{selectedBoard?.code}</strong> foi registrada
              com sucesso.
            </p>
            <p className="performed-by">Realizada por <strong>{currentUser?.name}</strong></p>
            {nonConformities > 0 && (
              <p className="modal-warning">
                {nonConformities} não conformidade(s) foram encaminhadas para
                acompanhamento.
              </p>
            )}
            <button
              className="primary-button"
              onClick={() => {
                setCompletionModal(false);
                setActiveView("overview");
              }}
            >
              Voltar ao painel
</button>
           </div>
         </div>
       )}

       {/* Offline Indicator */}
      {!isOnline && (
        <div className="offline-indicator visible" role="alert">
          📴 Você está offline. As alterações serão sincronizadas quando a conexão voltar.
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && deferredPrompt && !isStandalone && !isIOS && (
        <div className="pwa-install-banner visible" role="dialog" aria-label="Instalar aplicativo">
          <div className="pwa-install-content">
            <div className="pwa-install-icon">▤</div>
            <div className="pwa-install-text">
              <strong>Instalar Preventiva App</strong>
              <small>Acesse mais rápido, funcione offline e tenha experiência nativa</small>
            </div>
            <div className="pwa-install-actions">
              <button className="primary-button" onClick={handleInstallClick}>
                Instalar
              </button>
              <button className="secondary-button" onClick={dismissInstallBanner}>
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Hint */}
      {isIOS && !isStandalone && !showInstallBanner && (
        <div className="pwa-install-banner visible" style={{ bottom: isOnline ? '90px' : '130px' }} role="dialog" aria-label="Instalar no iOS">
          <div className="pwa-install-content">
            <div className="pwa-install-icon">▤</div>
            <div className="pwa-install-text">
              <strong>Adicionar à Tela Inicial</strong>
              <small>Toque em Compartilhar → Adicionar à Tela Inicial para instalar</small>
            </div>
            <div className="pwa-install-actions">
              <button className="secondary-button" onClick={dismissInstallBanner}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="bottom-nav-items">
          <button
            className={activeView === "overview" ? "bottom-nav-item active" : "bottom-nav-item"}
            onClick={() => setActiveView("overview")}
            aria-current={activeView === "overview" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Início</span>
          </button>
          <button
            className={activeView === "boards" ? "bottom-nav-item active" : "bottom-nav-item"}
            onClick={() => setActiveView("boards")}
            aria-current={activeView === "boards" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Quadros</span>
          </button>
          <button
            className={activeView === "inspection" ? "bottom-nav-item active" : "bottom-nav-item"}
            onClick={() => setActiveView("inspection")}
            aria-current={activeView === "inspection" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Preventiva</span>
          </button>
          <button
            className={activeView === "issues" ? "bottom-nav-item active" : "bottom-nav-item"}
            onClick={() => setActiveView("issues")}
            aria-current={activeView === "issues" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Problemas</span>
          </button>
        </div>
      </nav>

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={stopCamera} role="dialog" aria-modal="true" aria-label="Capturar foto">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Capturar Foto</h3>
              <button className="modal-close" onClick={stopCamera} aria-label="Fechar câmera">✕</button>
            </div>
            <div className="modal-body">
              <div className="camera-preview">
                <video
                  ref={cameraRef}
                  autoPlay
                  playsInline
                  muted
                  aria-hidden="true"
                />
                <div className="camera-overlay">
                  Toque no botão abaixo para capturar
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', padding: '0 16px' }}>
                <button
                  className="primary-button"
                  style={{ flex: 1 }}
                  onClick={() => capturePhoto()}
                >
                  📷 Capturar
                </button>
                <button
                  className="secondary-button"
                  style={{ flex: 1 }}
                  onClick={flipCamera}
                >
                  🔄 Trocar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueStat({
  tone,
  value,
  label,
  icon,
}: {
  tone: string;
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="issue-stat">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  onStatusChange,
}: {
  issue: NonConformity;
  onStatusChange: (id: string, status: NonConformityStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = issue.items || [issue];
  const pending = items.filter((item) => item.status !== "Resolvida").length;
  return (
    <article className={expanded ? "issue-card expanded" : "issue-card"}>
      <button
        className="issue-card-summary"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="issue-card-main">
          <div className="issue-heading">
            <span className="issue-mark">!</span>
            <div>
              <div className="issue-label-row">
                <strong>Preventiva {issue.inspection}</strong>
                <span className="type-pill">{issue.type}</span>
                <span className="issue-count">
                  {items.length} {items.length === 1 ? "item" : "itens"} não
                  conformes
                </span>
              </div>
              <p>
                {issue.board} · {issue.location}{" "}
                <span className="separator">•</span> concluída em {issue.date}
                {issue.performedBy && <><span className="separator">•</span> por {issue.performedBy}</>}
              </p>
              {items.some((item) => item.resolved_by_name) && (
                <p className="resolvers-info">
                  Resolvidos por: {Array.from(new Set(items.filter(i => i.resolved_by_name).map(i => i.resolved_by_name))).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="issue-card-summary-right">
          <span className="issue-status aberta">
            <i />
            {pending} pendente(s)
          </span>
          <span className="expand-arrow">{expanded ? "↑" : "↓"}</span>
        </div>
      </button>
      {expanded && (
        <div className="issue-detail-list">
          <div className="issue-detail-header">
            <strong>Itens para resolver</strong>
            <span>Atualize o status de cada ocorrência</span>
          </div>
          {items.map((item: NonConformity) => (
            <div className="issue-detail-row" key={item.id}>
              <div>
                <strong>{item.item}</strong>
                <p>{item.description}</p>
                {item.photo && <a className="issue-photo-link" href={item.photo} target="_blank" rel="noreferrer"><img className="issue-photo" src={item.photo} alt={`Foto da não conformidade: ${item.item}`} /><span>Visualizar foto</span></a>}
                <div className="issue-detail-badges">
                  <span className={`priority ${item.priority.toLowerCase()}`}>
                    {item.priority}
                  </span>
                  {item.resolved_after_inspection && (
                    <span className="resolved-after">
                      ✓ Resolvida após a preventiva em {item.resolved_at}
                    </span>
                  )}
                  {item.resolved_by_name && item.status === "Resolvida" && (
                    <span className="resolved-by">
                      👤 Resolvida por {item.resolved_by_name}
                    </span>
                  )}
                </div>
              </div>
              <select
                value={item.status}
                onChange={(event) =>
                  onStatusChange(
                    item.id,
                    event.target.value as NonConformityStatus,
                  )
                }
                aria-label={`Atualizar status de ${item.item}`}
              >
                <option>Aberta</option>
                <option>Em tratamento</option>
                <option>Resolvida</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small
          className={
            tone === "green" ? "green-text" : tone === "red" ? "red-text" : ""
          }
        >
          {detail}
        </small>
      </div>
    </div>
  );
}

function Activity({
  icon,
  title,
  description,
  time,
  tone,
}: {
  icon: string;
  title: string;
  description: string;
  time: string;
  tone: string;
}) {
  return (
    <div className="activity-item">
      <span className={`activity-icon ${tone}`}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <time>{time}</time>
    </div>
  );
}

function LoginScreen() {
  const { signIn } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await signIn(username, password);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand"><span className="brand-mark">P</span><span>Preventiva</span></div>
        <p className="eyebrow">BARRA SHOPPING SUL / MANUTENÇÃO</p>
        <h1>Acesse o sistema</h1>
        <p className="login-subtitle">Entre com seu usuário e senha para executar ou administrar as preventivas.</p>
        <form onSubmit={submit} className="login-form">
          <label>Usuário<input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="seu.usuario" autoComplete="username" required /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /></label>
          {error && <p className="login-error">{error}</p>}
          <button className="primary-button" type="submit">Entrar no sistema</button>
        </form>
        <div className="login-help"><strong>Acesso interno</strong><span>Usuário e senha cadastrados no sistema</span></div>
      </section>
    </main>
  );
}

export default App;