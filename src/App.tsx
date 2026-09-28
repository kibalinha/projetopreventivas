import { useMemo, useState, type FormEvent } from "react";
import "./App.css";

type ChecklistType = "QLF" | "CM" | "QE-AC" | "CT";
type BoardType = ChecklistType | "CD" | "QF" | "QLC" | "QCR" | "QRC" | "QE-CAG" | "Outros";
type InspectionAnswer = "Conforme" | "Não conforme" | "N/A";
type UserRole = "supervisor" | "tecnico";

type User = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
};

const users: User[] = [
  { name: "Luiz Felipe", username: "supervisor", password: "123456", role: "supervisor" },
  { name: "Técnico de manutenção", username: "tecnico", password: "123456", role: "tecnico" },
];

type Board = {
  id: string;
  code: string;
  location: string;
  type: BoardType;
  checklistType: ChecklistType;
  description: string;
  lastInspection: string;
  status: "Em dia" | "Pendente";
};

type ChecklistItem = {
  id: number;
  label: string;
  answer: InspectionAnswer;
  note: string;
  photo?: string;
};

type NonConformityStatus = "Aberta" | "Em tratamento" | "Resolvida";

type NonConformity = {
  id: number;
  boardId?: string;
  inspection: string;
  board: string;
  location: string;
  type: BoardType;
  item: string;
  description: string;
  date: string;
  priority: "Crítica" | "Alta" | "Média";
  status: NonConformityStatus;
  resolvedAfterInspection?: boolean;
  resolvedAt?: string;
  photo?: string;
  performedBy?: string;
  items?: NonConformity[];
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

const initialBoards: Board[] = [
  {
    id: "bd-001-qlf1a-gt01",
    code: "QLF-1A",
    location: "GT 01",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-002-cm11-gt01",
    code: "CM1.1",
    location: "GT 01",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-003-qeac04-gt01",
    code: "QE-AC-04",
    location: "GT 01",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-004-qlf1c-gt02",
    code: "QLF-1C",
    location: "GT 02",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-005-cm13-gt02",
    code: "CM1.3",
    location: "GT 02",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-006-cdchuveiro-gt02",
    code: "CD CHUVEIRO",
    location: "GT 02",
    type: "CD" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-007-qlf1b-gt02",
    code: "QLF-1B",
    location: "GT 02",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-008-qlfext01-gt02",
    code: "QLF-EXT-01",
    location: "GT 02",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-009-cm14-gt02",
    code: "CM1.4",
    location: "GT 02",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-010-qeaccm06-gt02",
    code: "QE-AC CM06",
    location: "GT 02",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-011-qlf1d-gt02",
    code: "QLF-1D",
    location: "GT 02",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-012-cm12vestiriomascdoca2-gt02",
    code: "CM12 VESTIÁRIO MASC DOCA 2",
    location: "GT 02",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-013-qlf2a-gt03",
    code: "QLF-2A",
    location: "GT 03",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-014-qeac19-gt03",
    code: "QE-AC-19",
    location: "GT 03",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-015-cm21-gt03",
    code: "CM2.1",
    location: "GT 03",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-016-qlf2b-gt03",
    code: "QLF-2B",
    location: "GT 03",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-017-cm22-gt04",
    code: "CM 2.2",
    location: "GT 04",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-018-qlfpontodecobrana-gt04",
    code: "QLF-PONTO DE COBRANÇA",
    location: "GT 04",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-019-qlf2c-gt05",
    code: "QLF-2C",
    location: "GT 05",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-020-qeac14-gt05",
    code: "QE-AC-14",
    location: "GT 05",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-021-cm03-gt05",
    code: "CM03",
    location: "GT 05",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-022-cm23-gt05",
    code: "CM2.3",
    location: "GT 05",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-023-qlf2d-gt05",
    code: "QLF-2D",
    location: "GT 05",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-024-cm34-gt06",
    code: "CM3.4",
    location: "GT 06",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-025-cm39-gt06",
    code: "CM3.9",
    location: "GT 06",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-026-cm38-gt07",
    code: "CM3.8",
    location: "GT 07",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-027-qeac03-gt07",
    code: "QE-AC-03",
    location: "GT 07",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-028-cm20-gt07",
    code: "CM20",
    location: "GT 07",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-029-qeac02-gt07",
    code: "QE-AC-02",
    location: "GT 07",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-030-qeac01-gt07",
    code: "QE-AC-01",
    location: "GT 07",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-031-qlf1e-gt07",
    code: "QLF-1E",
    location: "GT 07",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-032-qlf3c-gt07",
    code: "QLF-3C",
    location: "GT 07",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-033-qeac21-gt07",
    code: "QE-AC-21",
    location: "GT 07",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-034-qlflojasescadasrolantesac-gt07",
    code: "QLF-LOJAS ESCADAS ROLANTES AC",
    location: "GT 07",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-035-qlf3a-gt07",
    code: "QLF-3A",
    location: "GT 07",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-036-qeac16-gt07",
    code: "QE-AC-16",
    location: "GT 07",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-037-cm04-gt07",
    code: "CM04",
    location: "GT 07",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-038-qlf3b-gt07",
    code: "QLF-3B",
    location: "GT 07",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-039-cm33-gt07",
    code: "CM3.3",
    location: "GT 07",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-040-cm31-gt07",
    code: "CM3.1",
    location: "GT 07",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-041-cm32-gt08",
    code: "CM3.2",
    location: "GT 08",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-042-qlf3d-gt08",
    code: "QLF-3D",
    location: "GT 08",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-043-qeac20-gt09",
    code: "QE-AC-20",
    location: "GT 09",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-044-cm42-gt09",
    code: "CM4.2",
    location: "GT 09",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-045-qlfcalado-gt09",
    code: "QLF-CALÇADÃO",
    location: "GT 09",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-046-qlf2e-gt09",
    code: "QLF-2E",
    location: "GT 09",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-047-cm43-gt09",
    code: "CM4.3",
    location: "GT 09",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-048-qlfeblimpeza-gt09",
    code: "QLF-E-B-LIMPEZA",
    location: "GT 09",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-049-qlfbhidrante-gt09",
    code: "QLF-B.HIDRANTE",
    location: "GT 09",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-050-qeac17sisterna-gt09",
    code: "QE-AC-17 SISTERNA",
    location: "GT 09",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-051-qeac12-gt11",
    code: "QE-AC-12",
    location: "GT 11",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-052-cm41-gt11",
    code: "CM4.1",
    location: "GT 11",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-053-cm51-gt11",
    code: "CM5.1",
    location: "GT 11",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-054-qlf5b-gt12",
    code: "QLF-5B",
    location: "GT 12",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-055-qlf5a-gt12",
    code: "QLF-5A",
    location: "GT 12",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-056-qeac05ventilao14-gt12",
    code: "QE-AC-05 VENTILAÇÃO 14",
    location: "GT 12",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-057-qeac03-gt12",
    code: "QE-AC-03",
    location: "GT 12",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-058-cm52-gt12",
    code: "CM5.2",
    location: "GT 12",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-059-qlf1b-gt13",
    code: "QLF-1B",
    location: "GT 13",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-060-cm15-gt13",
    code: "CM1.5",
    location: "GT 13",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-061-qeac29-gt13",
    code: "QE-AC-29",
    location: "GT 13",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-062-qlf1c-gt14",
    code: "QLF-1C",
    location: "GT 14",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-063-cm16-gt14",
    code: "CM1.6",
    location: "GT 14",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-064-cm17-gt15",
    code: "CM1.7",
    location: "GT 15",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-065-cm18-gt15",
    code: "CM1.8",
    location: "GT 15",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-066-qlf1e-gt16",
    code: "QLF-1E",
    location: "GT 16",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-067-qeac23-gt16",
    code: "QE-AC-23",
    location: "GT 16",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-068-qlfnecozinha-gt16",
    code: "QLF-N/E COZINHA",
    location: "GT 16",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-069-qlf2c-gt17",
    code: "QLF-2C",
    location: "GT 17",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-070-cm25-gt17",
    code: "CM2.5",
    location: "GT 17",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-071-qlf2b-gt17",
    code: "QLF-2B",
    location: "GT 17",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-072-cm24-gt17",
    code: "CM2.4",
    location: "GT 17",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-073-qlf2a-gt17",
    code: "QLF-2A",
    location: "GT 17",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-074-cm26-gt18",
    code: "CM2.6",
    location: "GT 18",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-075-qeac24-gt18",
    code: "QE-AC-24",
    location: "GT 18",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-076-qlf3b-gt19",
    code: "QLF-3B",
    location: "GT 19",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-077-qlfext04-gt19",
    code: "QLF-EXT.04",
    location: "GT 19",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-078-qeac34-gt19",
    code: "QE-AC-34",
    location: "GT 19",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-079-cm37-gt19",
    code: "CM3.7",
    location: "GT 19",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-080-qlf3c-gt20",
    code: "QLF-3C",
    location: "GT 20",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-081-cm36-gt20",
    code: "CM3.6",
    location: "GT 20",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-082-cddoca5-gt20",
    code: "CD DOCA 5",
    location: "GT 20",
    type: "CD" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-083-qeac26refeitrio-gt20",
    code: "QE-AC-26 REFEITÓRIO",
    location: "GT 20",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-084-cm35-gt20",
    code: "CM3.5",
    location: "GT 20",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-085-qlf3a-gt20",
    code: "QLF-3A",
    location: "GT 20",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-086-qeac25-gt20",
    code: "QE-AC-25",
    location: "GT 20",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-087-cm09-gt20",
    code: "CM09",
    location: "GT 20",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-088-qlf5a-gt21",
    code: "QLF-5A",
    location: "GT 21",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-089-cm45-gt21",
    code: "CM4.5",
    location: "GT 21",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-090-cm57-gt22",
    code: "CM5.7",
    location: "GT 22",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-091-cm54-gt22",
    code: "CM5.4",
    location: "GT 22",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-092-qeac33-gt22",
    code: "QE-AC-33",
    location: "GT 22",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-093-qlfext03-gt22",
    code: "QLF-EXT.03",
    location: "GT 22",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-094-qlfaux03-gt22",
    code: "QLF-AUX 03",
    location: "GT 22",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-095-cm55-gt22",
    code: "CM5.5",
    location: "GT 22",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-096-qlf5b-gt22",
    code: "QLF-5B",
    location: "GT 22",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-097-cm56-gt23",
    code: "CM5.6",
    location: "GT 23",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-098-qeac32-gt23",
    code: "QE-AC-32",
    location: "GT 23",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-099-qlf5c-gt23",
    code: "QLF-5C",
    location: "GT 23",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-100-cm53-gt24",
    code: "CM5.3",
    location: "GT 24",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-101-qeqc08-gt24",
    code: "QE-QC-08",
    location: "GT 24",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-102-cm44-baixobarra",
    code: "CM4.4",
    location: "BAIXO BARRA",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-103-qlf4b-baixobarra",
    code: "QLF-4B",
    location: "BAIXO BARRA",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-104-qeac11-corredormanuteno",
    code: "QE-AC-11",
    location: "CORREDOR MANUTENÇÃO",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-105-qeac19-corredormanuteno",
    code: "QE-AC-19",
    location: "CORREDOR MANUTENÇÃO",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-106-qecagcorredordoca3cag-semgt",
    code: "QE-CAG CORREDOR DOCA 3 CAG",
    location: "SEM GT",
    type: "QE-CAG" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-107-qfbsprinklercag-semgt",
    code: "QF-B-SPRINKLER CAG",
    location: "SEM GT",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-108-qfbombasreuso-semgt",
    code: "QF-BOMBAS REUSO",
    location: "SEM GT",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-109-qfdg-semgt",
    code: "QF-DG",
    location: "SEM GT",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-110-qlf1btelecomdg-semgt",
    code: "QLF-1B TELECOM DG",
    location: "SEM GT",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-111-qeac06-sub2",
    code: "QE-AC-06",
    location: "SUB2",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-112-qlf2f-sub2",
    code: "QLF-2F",
    location: "SUB2",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-113-qlfext02-sub2",
    code: "QLF-EXT02",
    location: "SUB2",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-114-qlfauxext02-sub2",
    code: "QLF-AUX-EXT.02",
    location: "SUB2",
    type: "QLF" as BoardType,
    checklistType: "QLF" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-115-qcrgg2-sub2",
    code: "QCR-GG2",
    location: "SUB2",
    type: "QCR" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-116-qrcgg1-sub1",
    code: "QRC-GG1",
    location: "SUB1",
    type: "QRC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-117-qeac28-gt18",
    code: "QE-AC-28",
    location: "GT18",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-118-qeac27-qtofemininocorredoradm",
    code: "QE-AC-27",
    location: "QTO FEMININO CORREDOR ADM",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-119-qeac10-qtomasculinocorredormanuteno",
    code: "QE-AC-10",
    location: "QTO MASCULINO CORREDOR MANUTENÇÃO",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-120-qeac02-qtomasculinopraa",
    code: "QE-AC-02",
    location: "QTO MASCULINO PRAÇA",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-121-qeac13-qtorennerjckey",
    code: "QE-AC-13",
    location: "QTO RENNER JÓCKEY",
    type: "QE-AC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-122-qfeelevador03-",
    code: "QF-E-ELEVADOR-03",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-123-qfeelevador04-",
    code: "QF-E-ELEVADOR-04",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-124-qfedafe04-",
    code: "QF-E-DAFE-04",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-125-qlceelevador0304-",
    code: "QLC-E ELEVADOR 03/04",
    location: "",
    type: "QLC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-126-qfeelevador01-",
    code: "QF-E ELEVADOR-01",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-127-qfeelevador02-",
    code: "QF-E-ELEVADOR 02",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-128-qfedafe02-",
    code: "QF-E DAFE 02",
    location: "",
    type: "QF" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-129-qlceelevador0102-",
    code: "QLC-E ELEVADOR 01/02",
    location: "",
    type: "QLC" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-130-cm46-telhado",
    code: "CM4.6",
    location: "TELHADO",
    type: "CM" as BoardType,
    checklistType: "CM" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
  {
    id: "bd-131-casademquinaelevadorcobase-telhado",
    code: "CASA DE MÁQUINA ELEVADOR COBASE",
    location: "TELHADO",
    type: "Outros" as BoardType,
    checklistType: "QE-AC" as ChecklistType,
    description: "",
    lastInspection: "-",
    status: "Pendente",
  },
];

const makeChecklist = (type: BoardType): ChecklistItem[] =>
  (checklistByType[type as ChecklistType] || checklistByType["QE-AC"]).map((label, index) => ({
    id: index,
    label,
    answer: "Conforme",
    note: "",
  }));

const initialNonConformities: NonConformity[] = [];

const normalizeBoardCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

const parseBrDate = (value: string) => {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return Number.NaN;
  return new Date(year, month - 1, day).getTime();
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

const monthLabels = ["Abr", "Mai", "Jun", "Jul", "Ago", "Set"];

const linkedNonConformities = initialNonConformities.map((issue) => ({
  ...issue,
  boardId: initialBoards.find(
    (board) => normalizeBoardCode(board.code) === normalizeBoardCode(issue.board),
  )?.id,
}));

const initialInspections: InspectionRecord[] = [];

const STORAGE_KEYS = {
  accounts: "preventiva-accounts",
  boards: "preventiva-boards",
  user: "preventiva-user",
} as const;

const readStored = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const emptyBoard = (): Board => ({
  id: "",
  code: "",
  location: "",
  type: "QLF",
  checklistType: "QLF",
  description: "",
  lastInspection: "-",
  status: "Pendente",
});

const makeBoardId = (code: string, location: string) =>
  `${normalizeBoardCode(code)}-${normalizeBoardCode(location)}`.toLowerCase();

const defaultChecklistFor = (type: BoardType): ChecklistType =>
  type in checklistByType ? (type as ChecklistType) : "QE-AC";

function App() {
  const [accounts, setAccounts] = useState<User[]>(() =>
    readStored<User[]>(STORAGE_KEYS.accounts, users),
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem(STORAGE_KEYS.user);
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  });
  const [activeView, setActiveView] = useState<
    "overview" | "boards" | "editBoards" | "inspection" | "issues" | "users"
  >("overview");
  const [boards, setBoards] = useState<Board[]>(() =>
    readStored<Board[]>(STORAGE_KEYS.boards, initialBoards),
  );
  const [selectedBoard, setSelectedBoard] = useState<Board>(
    () => boards[0] ?? emptyBoard(),
  );
  const [newBoard, setNewBoard] = useState<Board>(emptyBoard);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [search, setSearch] = useState("");
  const [boardTypeFilter, setBoardTypeFilter] = useState<
    "Todos" | BoardType
  >("Todos");
  const [boardStatusFilter, setBoardStatusFilter] = useState<
    "Todos" | Board["status"]
  >("Todos");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [checklist, setChecklist] = useState(() =>
    makeChecklist(boards[0]?.checklistType ?? "QE-AC"),
  );
  const [completed, setCompletionModal] = useState(false);
  const [nonConformityList, setNonConformityList] = useState(linkedNonConformities);
  const [inspectionHistory, setInspectionHistory] = useState(initialInspections);
  const [issueFilter, setIssueFilter] = useState<"Todas" | NonConformityStatus>(
    "Todas",
  );
  const [issueTypeFilter, setIssueTypeFilter] = useState<
    "Todos" | "Todos os tipos" | BoardType
  >("Todos");
  const [newTechnicianName, setNewTechnicianName] = useState("");
  const [newTechnicianUsername, setNewTechnicianUsername] = useState("");
  const [newTechnicianPassword, setNewTechnicianPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("tecnico");
  // Distinct locations, ordered the way a technician walks the building:
  // "GT 02" before "GT 10", then the named areas alphabetically.
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

  // A board can be renamed/relocated out from under the active filter; fall back
  // to "Todos" instead of silently showing an empty catalog.
  const activeLocationFilter =
    locationFilter === "Todos" ||
    locationOptions.some((option) => option.location === locationFilter)
      ? locationFilter
      : "Todos";

  const persistBoards = (next: Board[]) => {
    localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(next));
  };

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
    () =>
      boards
        .map((board) => {
          const last = lastInspectionByBoard.get(board.id);
          return last
            ? { ...board, status: "Em dia" as const, lastInspection: last }
            : board;
        })
        .filter((board) => {
          const matchesSearch = `${board.code} ${board.location}`
            .toLowerCase()
            .includes(search.toLowerCase());
          const matchesType =
            boardTypeFilter === "Todos" || board.type === boardTypeFilter;
          const matchesStatus =
            boardStatusFilter === "Todos" || board.status === boardStatusFilter;
          const matchesLocation =
            activeLocationFilter === "Todos" ||
            board.location === activeLocationFilter;
          return (
            matchesSearch && matchesType && matchesStatus && matchesLocation
          );
        }),
    [
      activeLocationFilter,
      boardStatusFilter,
      boardTypeFilter,
      boards,
      lastInspectionByBoard,
      search,
    ],
  );

  const chooseBoard = (board: Board) => {
    setSelectedBoard(board);
    setChecklist(makeChecklist(board.checklistType));
    setCompletionModal(false);
    setActiveView("inspection");
  };

  const updateBoardField = <
    K extends keyof Pick<Board, "code" | "description" | "location" | "type" | "checklistType">,
  >(
    id: string,
    field: K,
    value: Pick<Board, "code" | "description" | "location" | "type" | "checklistType">[K],
  ) => {
    setBoards((items) => {
      const next = items.map((board) =>
        board.id === id ? { ...board, [field]: value } : board,
      );
      persistBoards(next);
      return next;
    });
  };

  const updateNewBoardField = <
    K extends keyof Pick<Board, "code" | "description" | "location" | "type" | "checklistType">,
  >(
    field: K,
    value: Pick<Board, "code" | "description" | "location" | "type" | "checklistType">[K],
  ) => {
    setNewBoard((board) => {
      const next = { ...board, [field]: value };
      // Keep the checklist aligned with the type unless it was already
      // overridden by hand.
      if (field === "type") next.checklistType = defaultChecklistFor(value as BoardType);
      return next;
    });
  };

  const registerBoard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = newBoard.code.trim();
    if (!code) return;
    const id = makeBoardId(code, newBoard.location);
    setBoards((items) => {
      const without = items.filter((board) => board.id !== id);
      const next = [...without, { ...newBoard, code, id, lastInspection: "-", status: "Pendente" as const }];
      persistBoards(next);
      return next;
    });
    setNewBoard(emptyBoard());
    setShowBoardForm(false);
  };

  const updateAnswer = (id: number, answer: InspectionAnswer) => {
    setChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, answer } : item)),
    );
  };

  const updateNote = (id: number, note: string) => {
    setChecklist((items) =>
      items.map((item) => (item.id === id ? { ...item, note } : item)),
    );
  };

  const updatePhoto = (id: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setChecklist((items) =>
        items.map((item) =>
          item.id === id ? { ...item, photo: String(reader.result) } : item,
        ),
      );
    };
    reader.readAsDataURL(file);
  };

  const nonConformities = checklist.filter(
    (item) => item.answer === "Não conforme",
  ).length;
  const filteredIssues = useMemo(() => {
    const groups = nonConformityList.reduce<Record<string, NonConformity[]>>(
      (result, issue) => {
        const groupKey = `${issue.inspection}-${issue.boardId || normalizeBoardCode(issue.board)}`;
        result[groupKey] = [...(result[groupKey] || []), issue];
        return result;
      },
      {},
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
        description: `${issue.board} · ${issue.item}`,
        date: issue.date,
        tone: "red",
      },
      ...(issue.resolvedAt
        ? [
            {
              key: `resolved-${issue.id}`,
              icon: "✓",
              title: "Não conformidade resolvida",
              description: `${issue.board} · ${issue.item}`,
              date: issue.resolvedAt,
              tone: "green",
            },
          ]
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

  const login = (username: string, password: string) => {
    const user = accounts.find((candidate) => candidate.username === username && candidate.password === password);
    if (!user) return false;
    sessionStorage.setItem("preventiva-user", JSON.stringify(user));
    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    sessionStorage.removeItem("preventiva-user");
    setCurrentUser(null);
  };

  if (!currentUser) return <LoginScreen onLogin={login} />;

  const navigate = (view: "overview" | "boards" | "editBoards" | "inspection" | "issues" | "users") => {
    if (!isSupervisor && (view === "editBoards" || view === "users")) {
      setActiveView("overview");
      return;
    }
    setActiveView(view);
  };

  const addTechnician = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = newTechnicianUsername.trim().toLowerCase();
    if (!newTechnicianName.trim() || !username || !newTechnicianPassword || accounts.some((account) => account.username === username)) return;
    setAccounts((items) => [...items, { name: newTechnicianName.trim(), username, password: newTechnicianPassword, role: newUserRole }]);
    localStorage.setItem("preventiva-accounts", JSON.stringify([...accounts, { name: newTechnicianName.trim(), username, password: newTechnicianPassword, role: newUserRole }]));
    setNewTechnicianName("");
    setNewTechnicianUsername("");
    setNewTechnicianPassword("");
    setNewUserRole("tecnico");
  };

  const removeTechnician = (username: string) => {
    setAccounts((items) => {
      const nextAccounts = items.filter((account) => account.username !== username || account.role === "supervisor");
      localStorage.setItem("preventiva-accounts", JSON.stringify(nextAccounts));
      return nextAccounts;
    });
  };

  const setCompleted = (value: boolean) => {
    const today = new Date().toLocaleDateString("pt-BR");
    const inspectionId = `INS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${selectedBoard.id}-${Date.now()}`;
    if (value && nonConformities > 0) {
      const newIssues = checklist
        .filter((item) => item.answer === "Não conforme")
        .map((item, index) => ({
          id: Date.now() + index,
          inspection: inspectionId,
          board: selectedBoard.code,
          boardId: selectedBoard.id,
          location: selectedBoard.location,
          type: selectedBoard.checklistType,
          item: item.label,
          description: item.note || "Item reprovado durante a inspeção.",
          photo: item.photo,
          performedBy: currentUser.name,
          date: today,
          priority: "Alta" as const,
          status: "Aberta" as const,
        }));
      setNonConformityList((issues) => [...newIssues, ...issues]);
    }
    if (value && !inspectionHistory.some((inspection) => inspection.id === inspectionId)) {
      setInspectionHistory((history) => [...history, { id: inspectionId, boardId: selectedBoard.id, board: selectedBoard.code, date: today, performedBy: currentUser.name }]);
      setBoards((items) => {
        const next = items.map((board) => board.id === selectedBoard.id ? { ...board, status: "Em dia" as const, lastInspection: today } : board);
        persistBoards(next);
        return next;
      });
    }
    setCompletionModal(value);
  };

  const updateIssueStatus = (id: number, status: NonConformityStatus) => {
    const resolvedAt = new Date().toLocaleDateString("pt-BR");
    setNonConformityList((issues) =>
      issues.map((issue) =>
        issue.id === id
          ? {
              ...issue,
              status,
              resolvedAfterInspection: status === "Resolvida",
              resolvedAt: status === "Resolvida" ? resolvedAt : undefined,
            }
          : issue,
      ),
    );
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
            {isSupervisor && (
            <button
              className={activeView === "users" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("users")}
            ><span>♙</span> Usuários e técnicos</button>
            )}
          </>
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">LF</span>
          <div>
            <strong>Luiz Felipe</strong>
            <small>Supervisor técnico</small>
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
                  nonConformityList.filter((issue) => issue.status === "Aberta")
                    .length,
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
                <option value="QCR">QCR</option><option value="QRC">QRC</option>
                <option value="QRC">QRC</option>
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
            <p className="eyebrow">MANUTENÇÃO PREDIAL / 24 SET 2026</p>
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
                    : "Bom dia, Luiz"}
            </h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificações">
              ♢<span className="notification-dot" />
            </button>
            <button className="user-button" onClick={logout} title="Sair">
              <span className="avatar small">LF</span>
              <span>{currentUser.name}</span>⌄
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
                    setNewBoard(emptyBoard());
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
                      value={newBoard.code}
                      onChange={(event) => updateNewBoardField("code", event.target.value)}
                      placeholder="QLF-1A"
                      required
                    />
                  </label>
                  <label>
                    Local
                    <input
                      value={newBoard.location}
                      onChange={(event) => updateNewBoardField("location", event.target.value)}
                      placeholder="GT 01"
                    />
                  </label>
                  <label>
                    Descrição
                    <input
                      value={newBoard.description}
                      onChange={(event) => updateNewBoardField("description", event.target.value)}
                      placeholder="Quadro de força e luz"
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={newBoard.type}
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
                      value={newBoard.checklistType}
                      onChange={(event) =>
                        updateNewBoardField(
                          "checklistType",
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
                <option value="QCR">QCR</option><option value="QRC">QRC</option>
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
                  <span>{board.lastInspection}</span>
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
                      ? "Nenhum quadro cadastrado. Use “+ Cadastrar quadro” para começar."
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
                  <label className="checklist-editor"><span>Checklist</span><select className="inline-input" value={board.checklistType} onChange={(event) => updateBoardField(board.id, "checklistType", event.target.value as ChecklistType)} aria-label={`Checklist do quadro ${board.code}`}><option value="QLF">QLF</option><option value="CM">CM</option><option value="QE-AC">QE-AC</option><option value="CT">CT Automação</option></select></label>
                  <span className="edit-inspection-date">{board.lastInspection}</span>
                  <span className={`edit-status ${board.status === "Em dia" ? "status good" : "status pending"}`}><i />{board.status}</span>
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
                <label>Usuário<input type="text" value={newTechnicianUsername} onChange={(event) => setNewTechnicianUsername(event.target.value)} placeholder="usuario" required /></label>
                <label>Senha<input type="password" value={newTechnicianPassword} onChange={(event) => setNewTechnicianPassword(event.target.value)} placeholder="Senha de acesso" required /></label>
                <label>Papel<select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as UserRole)} required><option value="tecnico">Técnico</option><option value="supervisor">Supervisor</option></select></label>
                <button className="primary-button" type="submit">Cadastrar usuário</button>
              </form>
              <div className="panel users-list"><div className="panel-heading"><div><h3>Contas cadastradas</h3><p>O técnico acessa somente a execução.</p></div></div>{accounts.map((account) => <div className="user-row" key={account.username}><span className="avatar">{account.name.slice(0, 2).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.username}</small></div><span className="role-pill">{account.role === "supervisor" ? "Supervisor" : "Técnico"}</span>{account.role === "tecnico" && <button className="remove-user" onClick={() => removeTechnician(account.username)} aria-label={`Remover ${account.name}`}>×</button>}</div>)}</div>
            </div>
          </section>
        )}

        {activeView === "inspection" && (
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
                    Periodicidade <strong>Mensal</strong>
                  </span>
                  <span>
                    Responsável <strong>{currentUser.name}</strong>
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
                            <label className="photo-upload">
                              <span>{item.photo ? "Trocar foto" : "Adicionar foto"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(event) => updatePhoto(item.id, event.target.files?.[0])}
                                aria-label={`Foto da não conformidade: ${item.label}`}
                              />
                            </label>
                            {item.photo && <img className="check-photo-preview" src={item.photo} alt={`Registro do item ${item.label}`} />}
                          </>
                        )}
                      </div>
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
              A inspeção de <strong>{selectedBoard.code}</strong> foi registrada
              com sucesso.
            </p>
            <p className="performed-by">Realizada por <strong>{currentUser.name}</strong></p>
            {nonConformities > 0 && (
              <p className="modal-warning">
                {nonConformities} não conformidade(s) foram encaminhadas para
                acompanhamento.
              </p>
            )}
            <button
              className="primary-button"
              onClick={() => {
                setCompleted(false);
                setActiveView("overview");
              }}
            >
              Voltar ao painel
            </button>
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
  onStatusChange: (id: number, status: NonConformityStatus) => void;
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
          {items.map((item) => (
            <div className="issue-detail-row" key={item.id}>
              <div>
                <strong>{item.item}</strong>
                <p>{item.description}</p>
                {item.photo && <a className="issue-photo-link" href={item.photo} target="_blank" rel="noreferrer"><img className="issue-photo" src={item.photo} alt={`Foto da não conformidade: ${item.item}`} /><span>Visualizar foto</span></a>}
                <div className="issue-detail-badges">
                  <span className={`priority ${item.priority.toLowerCase()}`}>
                    {item.priority}
                  </span>
                  {item.resolvedAfterInspection && (
                    <span className="resolved-after">
                      ✓ Resolvida após a preventiva em {item.resolvedAt}
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

export default App;

function LoginScreen({ onLogin }: { onLogin: (username: string, password: string) => boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onLogin(username.trim().toLowerCase(), password)) {
      setError("Usuário ou senha inválidos.");
    }
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand"><span className="brand-mark">P</span><span>Preventiva</span></div>
        <p className="eyebrow">BARRA SHOPPING SUL / MANUTENÇÃO</p>
        <h1>Acesse o sistema</h1>
        <p className="login-subtitle">Entre com seu perfil para executar ou administrar as preventivas.</p>
        <form onSubmit={submit} className="login-form">
          <label>Usuário<input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="seu.usuario" autoComplete="username" required /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required /></label>
          {error && <p className="login-error">{error}</p>}
          <button className="primary-button" type="submit">Entrar no sistema</button>
        </form>
        <div className="login-help"><strong>Perfis configurados</strong><span>Supervisor: acesso administrativo</span><span>Técnico: execução de preventivas</span></div>
      </section>
    </main>
  );
}
