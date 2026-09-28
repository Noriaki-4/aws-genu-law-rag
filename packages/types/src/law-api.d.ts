// local-rag-poc-law v2.0.8 REST contract. The backend remains authoritative.
export type LawDatasetSummary = {
  datasetId: string;
  documentCount: number;
  relationCount: number;
  municipalities: string[];
  titles: string[];
};
export type LawEvidence = {
  evidenceId: string;
  documentId: string;
  versionId: string;
  title: string;
  heading: string;
  locationId: string;
  text: string;
  sourceUrl?: string;
};
export type LawClaim = {
  heading?: string;
  section?: string;
  text: string;
  evidenceIds: string[];
};
export type LawAnswer = {
  claims: LawClaim[];
  unknowns: string[];
  unresolvedIssues: string[];
};
export type LawConversationSummary = {
  conversationId: string;
  title: string;
  status: string;
  updatedAt: string;
};
export type LawConversation = {
  conversationId: string;
  datasetId: string;
  revision: number;
  status: string;
  toolOutput: boolean;
  messages: {
    messageId: string;
    turnId: string;
    role: 'user' | 'assistant';
    text: string;
    runIds: string[];
  }[];
  evidence: LawEvidence[];
};
export type LawTurn = {
  turnId: string;
  status: string;
  runIds: string[];
  answer?: LawAnswer;
  reply: string;
};
export type LawSubmitTurn = {
  text: string;
  clientRequestId: string;
  expectedRevision: number;
  datasetId: string;
};
export type LawToolResult = {
  processingStatus: string;
  requirementsStatus: string;
  requirementsId: string | null;
  requirements: { kind: string; text: string; evidenceIds: string[] }[];
  combination: string;
  unresolvedIssues: string[];
  questions: string[];
  readyForSql: boolean;
  error: string | null;
  evidence: LawEvidence[];
};
export type LawDataset = {
  documents: { documentId: string; versionId: string; title: string }[];
  relations: {
    sourceId: string;
    targetId: string;
    relationType: string;
  }[];
};
