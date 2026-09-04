export type LegalRagQuestionTopic = 'finance';

export type LegalRagQuestion = {
  id: string;
  level: 1 | 2;
  topic: LegalRagQuestionTopic;
  translationKey: string;
  legalAsOf: string;
};

export const LEGAL_RAG_QUESTIONS: readonly LegalRagQuestion[] = [
  {
    id: 'small-number-private-placement',
    level: 1,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.small_number_private_placement',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'tender-offer-share-acquisition',
    level: 1,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_share_acquisition',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'tender-offer-notice-methods',
    level: 1,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_methods',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'restricted-stock-compensation',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.restricted_stock_compensation',
    legalAsOf: '2026-07-26',
  },
  {
    id: 'tender-offer-small-holder-exemption',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_small_holder_exemption',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-special-related-parties',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_special_related_parties',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-notice-policy',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_policy',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'tender-offer-notice-amendment-impact',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.tender_offer_notice_amendment_impact',
    legalAsOf: '2026-08-27',
  },
  {
    id: 'nonresident-tender-offer-procedure',
    level: 2,
    topic: 'finance',
    translationKey:
      'legal_rag.question_library.questions.nonresident_tender_offer_procedure',
    legalAsOf: '2026-08-27',
  },
] as const;
