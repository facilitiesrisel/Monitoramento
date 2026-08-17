
export interface Evaluation {
  id: string;
  timestamp: string; // ISO date string
  driver: string;
  vehicle: string;
  base: string;
  evaluator: string;
  score: number; // 0-100
}

export interface DriverJustification {
  id: string;
  month: number; // 0-11
  year: number;
  reason: string;
  countTowardsGoal: boolean;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  base: string;
  hasCamera: boolean; 
  lastModified: string;
  justifications?: DriverJustification[];
  isActive?: boolean;
  inactivationDate?: string;
}

// --- AUTH TYPES ---
export type UserRole = 'admin' | 'operator' | 'quality' | 'monitor';

export interface User {
  name: string;
  email?: string;
  role: UserRole;
}

export interface OperatorProfile {
  id: string;
  name: string; // First name or Login
  password: string; // Simple storage for this requirement
  role?: UserRole;
  createdAt: string;
  menus?: string[];
}

export interface DriverStats {
  id: string; 
  name: string;
  base: string;
  hasCamera: boolean; 
  totalEvaluations: number;
  evalsWeek: number;
  evalsMonth: number;
  evalsYear: number;
  averageScore: number;
  lastEvaluationDate: string;
  justifications?: DriverJustification[];
  isActive?: boolean;
  inactivationDate?: string;
}

export interface EvaluatorStats {
  name: string;
  totalEvaluations: number;
  evalsWeek: number;     // Current Week Activity
  evalsMonth: number;    // Current Month Activity
  evalsYear: number;     // Current Year Activity
  averageGivenScore: number; // Avg score they give to drivers
  participationIndex: number; // % of total evaluations
  lastActiveDate: string;
}

export interface VehicleStats {
  id: string;
  base: string;
  totalEvaluations: number;
  averageScore: number;
}

export interface DashboardMetrics {
  totalEvaluations: number;
  totalRegisteredDrivers: number; 
  uniqueDriversEvaluated: number;
  monthlyGoalCompletion: number; // Percentage
  evaluationsPerEvaluator: { name: string; count: number }[];
  evaluationsPerDriver: { name: string; count: number }[]; 
  globalAverageScore: number;
  evaluationsOverTime: { date: string; count: number }[];
  evaluationsPerWeek: { week: string; count: number }[];
  evaluationsPerDay: { day: string; count: number }[];
  evaluationsPerMonth: { month: string; count: number; goalPercent: number }[];
  monthlyGoalTarget: number; // Absolute number for target scaling
}

export interface DashboardFilters {
  driverName?: string;
  evaluatorName?: string;
  year?: number;
  month?: number | null;
  week?: string;
}

export interface PriorityDriverStatus {
  driver: DriverProfile;
  evaluationsCount: number;
  target: number;
  missing: number;
  urgency: 'critical' | 'warning' | 'done';
}

export interface AccessLog {
  id: string;
  operator: string;
  location: 'CANCELA' | 'INTERFONE';
  dateTime: string;
  visitorName: string;
  visitorCompany: string;
  personVisited: string;
  vehiclePlate: string;
}

export interface InternalTicket {
  id: string;
  status: 'Em Aberto' | 'Em Andamento' | 'Finalizado'; 
  operator: string;
  date: string; 
  fleetTicket: string; 
  base: string; 
  requestType: string; 
  description: string;
  ticketNumber: string; // Restored: Nº Chamado
  scheduledDate: string; 
  isDone: boolean; 
  attachmentName: string;
}

export type OccurrenceType = 'Monitoramento' | 'Ocorrência' | 'Orientação' | 'Outros' | 'CFTV' | 'Checklist do Setor' | 'Análise de Viagem';

export interface BolaPreta {
  id: string;
  date: string;
  operator: string;
  status: 'Aberto' | 'Tratado';
  driver: string;
  vehicle: string;
  plate: string;
  base: string;
  startTime: string; // Hora Início de Jornada
  departureTime: string; // Hora saída base
  macroClients: string; // Clientes Macro
  macroClientsObs: string; // Obs Cliente Macro
  timeAtClient: string; // Tempo em Cliente
  avgTimeClients: string; // Tempo médio Clientes
  informedStopsCount: string; // Qtd. Paradas informadas
  totalStopsTime: string; // Tempo total Paradas
  arrivalBaseTime: string; // Chegada na base
  endTime: string; // Fim de Jornada
  kmDriven: string; // KM RODADO
  uninformedStops: string; // Paradas não Informadas?
  uninformedStopsObs?: string; // Obs Paradas não Informadas
  suspiciousActivity: string; // Atitude suspeita?
  suspiciousActivityObs?: string; // Obs Atitude suspeita
  telemetryInfractions?: string; // Sim ou Não
  telemetryOptions?: string[]; // Pico de Velocidade Seco, Pico de Velocidade Molhado, Freada Brusca
  videoTelemetryInfractions?: string; // Sim ou Não
  videoTelemetryOptions?: string[]; // Condutor ao Celular, Condutor Fumando, Sem cinto de Segurança
  celularImage?: string;
  celularImageDesc?: string;
  fumandoImage?: string;
  fumandoImageDesc?: string;
  cintoImage?: string;
  cintoImageDesc?: string;
  printImage1?: string;
  printImage1Desc?: string;
  printImage2?: string;
  printImage2Desc?: string;
  printImage3?: string;
  printImage3Desc?: string;
  mapImage?: string;
  verificationStatus?: 'OK' | 'Observações Inseridas';
  verificationStatusObs?: string;
  createdAt: string;
}

export interface MacroData {
  date: string;
  plate: string;
  vehicle: string;
  base: string;
  driver: string;
  startTime: string;
  departureTime: string;
  macroClients: string;
  macroClientsObs: string;
  timeAtClient: string;
  avgTimeClients: string;
  informedStopsCount: string;
  totalStopsTime: string;
  arrivalBaseTime: string;
  endTime: string;
  kmDriven: string;
}

export interface ShiftOccurrence {
  id: string;
  date: string;
  shift: 'Diurno' | 'Noturno';
  type: OccurrenceType;
  base: string;
  description: string;
  operator: string;
  finalized: boolean;
  createdAt: string;
  keepUntil?: string; // 'YYYY-MM-DD' | 'indefinite' | ''
}
