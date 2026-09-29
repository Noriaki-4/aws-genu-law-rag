import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LawDataset, LawEvidence } from 'generative-ai-use-cases';
import useLawWorkspace from './useLawWorkspace';
import {
  defaultLawDatasetId,
  financialLawDatasetId,
  narashinoLawDatasetId,
} from './restConfig';
import { LawApi } from '../../hooks/useLawApi';
import LawQuestionLibrary from './LawQuestionLibrary';
import LawAnalysis from './LawAnalysis';
import { userFacingIssues, userFacingStatus } from './presentation';

const panel = 'border-aws-font-color/20 rounded-lg border bg-white p-5';
const button =
  'text-aws-font-color border-aws-font-color/20 rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-40';
const datasetNameKeys: Record<string, string> = {
  [defaultLawDatasetId]: 'legal_rag.workspace.dataset_nara',
  [narashinoLawDatasetId]: 'legal_rag.workspace.dataset_narashino',
  [financialLawDatasetId]: 'legal_rag.workspace.dataset_financial',
};
type EvidenceSelection = { ids: string[]; key: string; label: string };

function Evidence({
  api,
  passage,
  datasetId,
}: {
  api: LawApi;
  passage: LawEvidence;
  datasetId: string;
}) {
  const { t } = useTranslation();
  const [documentError, setDocumentError] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const source =
    passage.sourceUrl && /^https?:\/\//i.test(passage.sourceUrl)
      ? passage.sourceUrl
      : undefined;
  const openStoredDocument = async () => {
    setDocumentLoading(true);
    setDocumentError(false);
    try {
      const content = await api.documentContent(
        datasetId,
        passage.documentId,
        passage.versionId
      );
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDocumentError(true);
    } finally {
      setDocumentLoading(false);
    }
  };
  return (
    <article className={panel}>
      <h3 className="font-semibold">{passage.title}</h3>
      <p className="text-aws-font-color/70 text-sm">
        {passage.heading || passage.locationId}
      </p>
      <p className="my-3 whitespace-pre-wrap text-sm leading-relaxed">
        {passage.text}
      </p>
      <div className="text-aws-smile flex flex-wrap gap-3 text-sm underline">
        <button
          className="underline disabled:opacity-40"
          disabled={documentLoading}
          onClick={() => void openStoredDocument()}>
          {t('legal_rag.workspace.saved_document')}
        </button>
        {source && (
          <a target="_blank" rel="noreferrer" href={source}>
            {t('legal_rag.workspace.source')}
          </a>
        )}
      </div>
      {documentError && (
        <p role="alert">{t('legal_rag.workspace.connection_error')}</p>
      )}
    </article>
  );
}

function DocumentMap({ api, datasetId }: { api: LawApi; datasetId: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<LawDataset>();
  const [error, setError] = useState(false);
  const [focus, setFocus] = useState('');
  const [search, setSearch] = useState('');
  const [depth, setDepth] = useState(1);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(false);
    setFocus('');
    setSearch('');
    setDepth(1);
    if (datasetId)
      api
        .dataset(datasetId, controller.signal)
        .then((d) => {
          if (!controller.signal.aborted) {
            setData(d);
            setFocus(d.documents[0]?.documentId || '');
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => controller.abort();
  }, [api, datasetId]);
  const titles = new Map(data?.documents.map((d) => [d.documentId, d.title]));
  const documents =
    data?.documents.filter((d) => d.title.includes(search)) || [];
  const visibleIds = new Set(focus ? [focus] : []);
  for (let level = 0; level < depth; level += 1) {
    const previous = new Set(visibleIds);
    data?.relations.forEach((relation) => {
      if (previous.has(relation.sourceId)) visibleIds.add(relation.targetId);
      if (previous.has(relation.targetId)) visibleIds.add(relation.sourceId);
    });
  }
  const selectedDocuments =
    data?.documents.filter((document) => visibleIds.has(document.documentId)) ||
    [];
  const relations =
    data?.relations.filter(
      (relation) =>
        visibleIds.has(relation.sourceId) && visibleIds.has(relation.targetId)
    ) || [];
  const focusedDocument = data?.documents.find(
    (document) => document.documentId === focus
  );
  const relationSourceDocument = (sourceUrl?: string) => {
    if (!sourceUrl || !data) return undefined;
    const lawId =
      /^https:\/\/laws\.e-gov\.go\.jp\/(?:law|api\/1\/lawdata)\/([A-Za-z0-9]+)\/?$/.exec(
        sourceUrl
      )?.[1];
    return data.documents.find(
      (document) =>
        (lawId &&
          (document.lawId === lawId ||
            document.documentId === `law-${lawId}`)) ||
        document.sourceUrl === sourceUrl
    );
  };
  const openStoredDocument = async (
    document: LawDataset['documents'][number]
  ) => {
    setDocumentLoading(true);
    setDocumentError(false);
    try {
      const content = await api.documentContent(
        datasetId,
        document.documentId,
        document.versionId
      );
      const url = URL.createObjectURL(content);
      const link = window.document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setDocumentError(true);
    } finally {
      setDocumentLoading(false);
    }
  };
  return (
    <section className="mx-auto max-w-6xl p-5 md:p-9">
      <h2 className="mb-3 text-lg font-semibold">
        {t('legal_rag.workspace.documents')}
      </h2>
      {error && <p role="alert">{t('legal_rag.workspace.connection_error')}</p>}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <label className="block text-sm font-semibold">
          {t('legal_rag.workspace.find_document')}
          <input
            className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 font-normal"
            value={search}
            onChange={(event) => {
              const nextSearch = event.target.value;
              const matches =
                data?.documents.filter((document) =>
                  document.title.includes(nextSearch)
                ) || [];
              setSearch(nextSearch);
              if (!matches.some((document) => document.documentId === focus))
                setFocus(matches[0]?.documentId || '');
            }}
          />
        </label>
        <label className="block text-sm font-semibold">
          {t('legal_rag.workspace.graph_focus')}
          <select
            className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 font-normal"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}>
            {documents.map((document) => (
              <option value={document.documentId} key={document.documentId}>
                {document.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t('legal_rag.workspace.graph_depth')}
          <select
            className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 font-normal"
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}>
            {[1, 2, 3].map((value) => (
              <option value={value} key={value}>
                {t('legal_rag.workspace.graph_depth_value', { depth: value })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-6 text-sm">
        {t('legal_rag.workspace.graph_summary', {
          documents: selectedDocuments.length,
          relations: relations.length,
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedDocuments.map((document) => (
          <button
            key={document.documentId}
            className={`${button} ${document.documentId === focus ? 'border-aws-sky bg-aws-sky/10' : ''}`}
            onClick={() => setFocus(document.documentId)}>
            {document.title}
          </button>
        ))}
      </div>
      {focus && relations.length === 0 && (
        <p className="border-aws-font-color/20 mt-5 rounded-lg border bg-white p-4 text-sm">
          {t('legal_rag.workspace.no_relations')}
        </p>
      )}
      <div className="mt-5 space-y-4">
        {relations.map((relation, index) => {
          const sourceDocument = relationSourceDocument(relation.sourceUrl);
          const publicSource =
            !sourceDocument &&
            relation.sourceUrl &&
            /^https?:\/\//i.test(relation.sourceUrl)
              ? relation.sourceUrl
              : undefined;
          return (
            <article className={panel} key={index}>
              <h3 className="font-semibold">
                {titles.get(relation.sourceId) || relation.sourceId}{' '}
                {relation.relationType === 'hierarchy' ? '→' : '↔'}{' '}
                {titles.get(relation.targetId) || relation.targetId}
              </h3>
              <span className="bg-aws-sky/10 mt-3 inline-block rounded px-2 py-1 text-xs">
                {t(
                  relation.relationType === 'hierarchy'
                    ? 'legal_rag.workspace.relation_hierarchy'
                    : 'legal_rag.workspace.relation_related'
                )}
              </span>
              {relation.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {relation.description}
                </p>
              )}
              {sourceDocument && (
                <button
                  className="text-aws-smile mt-3 text-sm underline disabled:opacity-40"
                  disabled={documentLoading}
                  onClick={() => void openStoredDocument(sourceDocument)}>
                  {t('legal_rag.workspace.relation_source')}
                </button>
              )}
              {publicSource && (
                <a
                  className="text-aws-smile mt-3 block text-sm underline"
                  target="_blank"
                  rel="noreferrer"
                  href={publicSource}>
                  {t('legal_rag.workspace.relation_source')}
                </a>
              )}
            </article>
          );
        })}
      </div>
      {documentError && (
        <p className="mt-4" role="alert">
          {t('legal_rag.workspace.connection_error')}
        </p>
      )}
      {focusedDocument && (
        <details className="border-aws-font-color/20 mt-5 rounded-lg border bg-white p-4">
          <summary className="cursor-pointer font-semibold">
            {t('legal_rag.workspace.graph_document_details')}
          </summary>
          <pre className="mt-4 overflow-auto whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(focusedDocument, null, 2)}
          </pre>
        </details>
      )}
      {focusedDocument?.omissions && focusedDocument.omissions.length > 0 && (
        <section className="border-aws-font-color/20 mt-4 rounded-lg border bg-white p-4">
          <h3 className="font-semibold">
            {t('legal_rag.workspace.graph_omissions')}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {focusedDocument.omissions.map((omission) => (
              <li key={omission}>{omission}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

export default function LawWorkspace() {
  const { t } = useTranslation();
  const w = useLawWorkspace();
  const [text, setText] = useState('');
  const [tab, setTab] = useState<
    'conversation' | 'library' | 'documents' | 'analysis'
  >('conversation');
  const [selectedEvidence, setSelectedEvidence] =
    useState<EvidenceSelection | null>(null);
  const evidencePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selectedEvidence && window.innerWidth < 1280) {
      evidencePanel.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [selectedEvidence]);
  useEffect(() => {
    setSelectedEvidence(null);
  }, [w.cid]);
  const current =
    w.conversation?.conversationId === w.cid ? w.conversation : null;
  const processing = current?.status === 'processing';
  const municipality =
    w.datasets
      .find((d) => d.datasetId === w.datasetId)
      ?.municipalities.join(' / ') || '';
  const selectConversation = (id: string) => {
    w.select(id);
    setText('');
  };
  const chooseQuestion = (question: string) => {
    if (w.sending || w.loading || processing || w.pendingText) return;
    if (current?.messages.some((m) => m.role === 'assistant')) w.select('');
    setText(question);
    setTab('conversation');
  };
  const evidence =
    current?.evidence.filter((e) =>
      selectedEvidence?.ids.includes(e.evidenceId)
    ) || [];
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await w.send(text)) setText('');
  };
  const pageTitle =
    tab === 'analysis'
      ? t('legal_rag.workspace.header_analysis')
      : tab === 'documents'
        ? t('legal_rag.workspace.header_documents')
        : tab === 'library'
          ? t('legal_rag.workspace.header_library')
          : t('legal_rag.workspace.header_conversation');
  return (
    <div className="text-aws-font-color font-body min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-aws-font-color/20 bg-white p-5 lg:border-r lg:px-5 lg:py-7">
          <div className="mb-7 text-xl font-bold">
            {t('legal_rag.title')}
            <span className="text-aws-font-color/70 mt-1 block text-xs font-normal">
              {t('legal_rag.workspace.brand_subtitle')}
            </span>
          </div>
          <button
            className="bg-aws-smile border-aws-smile mb-5 w-full rounded-lg border px-3 py-2.5 text-center text-sm text-white transition-all hover:brightness-75 disabled:opacity-40"
            disabled={w.sending}
            onClick={() => selectConversation('')}>
            {t('legal_rag.workspace.new_conversation')}
          </button>
          <label className="block text-xs font-semibold">
            {t('legal_rag.workspace.dataset')}
            <select
              className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 text-sm"
              value={w.datasetId}
              disabled={w.sending || Boolean(processing)}
              onChange={(e) => w.setDatasetId(e.target.value)}>
              <option value="">
                {t('legal_rag.workspace.choose_dataset')}
              </option>
              {w.datasets.map((d) => (
                <option key={d.datasetId} value={d.datasetId}>
                  {datasetNameKeys[d.datasetId]
                    ? t('legal_rag.workspace.dataset_named_label', {
                        name: t(datasetNameKeys[d.datasetId]),
                        count: d.documentCount,
                      })
                    : t('legal_rag.workspace.dataset_label', {
                        name:
                          d.municipalities.join(' / ') ||
                          t('legal_rag.workspace.dataset_unnamed'),
                        count: d.documentCount,
                      })}
                </option>
              ))}
            </select>
          </label>
          <p className="text-aws-font-color/70 mt-2 text-xs">
            {t('legal_rag.workspace.dataset_change_notice')}
          </p>
          <h2 className="mb-2 mt-7 text-sm font-semibold">
            {t('legal_rag.workspace.history')}
          </h2>
          <ul className="max-h-44 space-y-1 overflow-auto lg:max-h-[55vh]">
            {w.history.map((c) => (
              <li key={c.conversationId}>
                <button
                  className={`hover:bg-aws-sky/10 w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${c.conversationId === w.cid ? 'border-aws-sky bg-aws-sky/10' : 'border-transparent bg-transparent'}`}
                  disabled={w.sending}
                  onClick={() => selectConversation(c.conversationId)}>
                  {c.title}
                  {c.updatedAt && (
                    <small className="text-aws-font-color/70 mt-1 block">
                      {new Date(c.updatedAt).toLocaleString()}
                    </small>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className="min-w-0">
          <header className="border-aws-font-color/20 flex flex-wrap items-center justify-between gap-5 border-b bg-white px-5 py-5 md:px-9 md:py-7">
            <div>
              <span className="text-aws-font-color/70 text-xs">
                {t('legal_rag.workspace.eyebrow')}
              </span>
              <h1 className="mt-1 text-2xl font-semibold">{pageTitle}</h1>
            </div>
            <nav
              className="flex flex-wrap gap-1"
              aria-label={t('legal_rag.workspace.views')}>
              {(
                ['conversation', 'library', 'documents', 'analysis'] as const
              ).map((name) => (
                <button
                  key={name}
                  className={`rounded-lg border-0 px-3 py-2 text-sm ${tab === name ? 'bg-aws-sky text-white' : 'bg-transparent hover:bg-gray-100'}`}
                  aria-pressed={tab === name}
                  onClick={() => setTab(name)}>
                  {name === 'library'
                    ? t('legal_rag.resident_library.title')
                    : t(`legal_rag.workspace.${name}`)}
                </button>
              ))}
            </nav>
          </header>
          {w.error && (
            <div
              className="border-aws-smile/40 bg-aws-smile/10 m-5 rounded-lg border p-4"
              role="alert">
              <p>{t(`legal_rag.workspace.${w.error}`)}</p>
              <button className={button} onClick={w.refresh}>
                {t('legal_rag.workspace.reload')}
              </button>
            </div>
          )}
          {tab === 'documents' && (
            <div className="p-5 md:p-9">
              <DocumentMap api={w.api} datasetId={w.datasetId} />
            </div>
          )}
          {tab === 'analysis' && (
            <LawAnalysis
              key={w.cid}
              api={w.api}
              cid={w.cid}
              conversation={current}
            />
          )}
          {tab === 'library' && (
            <LawQuestionLibrary
              disabled={
                w.sending ||
                w.loading ||
                Boolean(processing) ||
                Boolean(w.pendingText)
              }
              municipality={municipality}
              onSelect={chooseQuestion}
            />
          )}
          {tab === 'conversation' && (
            <div className="grid min-h-[calc(100vh-8.5rem)] xl:grid-cols-[minmax(560px,1fr)_clamp(360px,30vw,520px)]">
              <section
                className="flex min-w-0 flex-col"
                aria-label={t('legal_rag.workspace.conversation')}>
                <div className="flex-1 space-y-5 px-5 py-7 md:px-9">
                  {!current?.messages.length && (
                    <div className="mx-auto my-12 max-w-xl md:my-16">
                      <h2 className="text-2xl font-semibold">
                        {t('legal_rag.workspace.start')}
                      </h2>
                      <p className="text-aws-font-color/70 mt-3 leading-8">
                        {t('legal_rag.workspace.welcome_body')}
                      </p>
                      <button
                        className={`${button} mt-5`}
                        onClick={() => setTab('library')}>
                        {t('legal_rag.workspace.choose_from_library')}
                      </button>
                    </div>
                  )}
                  {w.loading && (
                    <p role="status">{t('legal_rag.workspace.loading')}</p>
                  )}
                  {current?.messages.map((message) => {
                    const turn = w.turns.find(
                      (v) => v.turnId === message.turnId
                    );
                    const visibleIssues = userFacingIssues(
                      turn?.answer?.unresolvedIssues
                    );
                    const visibleStatus = userFacingStatus(
                      turn?.status,
                      turn?.answer
                    );
                    return (
                      <article
                        key={message.messageId}
                        className={`rounded-lg p-5 md:px-6 ${message.role === 'user' ? 'bg-aws-sky/10 ml-4 border-0 md:ml-9' : 'border-aws-font-color/20 border bg-white'}`}>
                        <h2 className="text-aws-font-color/70 mb-2 text-xs font-normal">
                          {t(`legal_rag.workspace.${message.role}`)}
                        </h2>
                        {message.role === 'assistant' && turn?.answer ? (
                          <>
                            <section className="mb-5">
                              <h3 className="mb-2 font-semibold">
                                {t('legal_rag.workspace.conclusion')}
                              </h3>
                              {(turn.answer.claims.some(
                                (claim) => claim.section === 'conclusion'
                              )
                                ? turn.answer.claims.filter(
                                    (claim) => claim.section === 'conclusion'
                                  )
                                : turn.answer.claims.slice(0, 1)
                              ).map((claim, i) => (
                                <p
                                  className="whitespace-pre-wrap leading-relaxed"
                                  key={i}>
                                  {claim.text}
                                </p>
                              ))}
                            </section>
                            {(() => {
                              const structured = turn.answer!.claims.some(
                                (claim) => claim.section === 'conclusion'
                              );
                              const reasons = structured
                                ? turn.answer!.claims.filter(
                                    (claim) => claim.section !== 'conclusion'
                                  )
                                : turn.answer!.claims.slice(1);
                              return reasons.length > 0 ? (
                                <section className="mb-5">
                                  <h3 className="mb-2 font-semibold">
                                    {t('legal_rag.workspace.decision_reasons')}
                                  </h3>
                                  <ol className="list-decimal space-y-4 pl-5">
                                    {reasons.map((claim, i) => {
                                      const ids = [
                                        ...new Set(claim.evidenceIds),
                                      ];
                                      const key = `${turn.turnId}:${i}`;
                                      const label =
                                        claim.heading ||
                                        t(
                                          'legal_rag.workspace.decision_reason',
                                          { index: i + 1 }
                                        );
                                      return (
                                        <li key={key}>
                                          <section
                                            className={
                                              selectedEvidence?.key === key
                                                ? 'border-aws-sky border-l-4 pl-3'
                                                : ''
                                            }>
                                            {claim.heading && (
                                              <h4 className="font-semibold">
                                                {claim.heading}
                                              </h4>
                                            )}
                                            <p className="whitespace-pre-wrap leading-relaxed">
                                              {claim.text}
                                            </p>
                                            {ids.length > 0 && (
                                              <button
                                                aria-pressed={
                                                  selectedEvidence?.key === key
                                                }
                                                className="text-aws-smile mt-2 text-sm underline"
                                                onClick={() =>
                                                  setSelectedEvidence({
                                                    ids,
                                                    key,
                                                    label,
                                                  })
                                                }>
                                                {t(
                                                  'legal_rag.workspace.evidence_count',
                                                  { count: ids.length }
                                                )}
                                              </button>
                                            )}
                                          </section>
                                        </li>
                                      );
                                    })}
                                  </ol>
                                </section>
                              ) : null;
                            })()}
                            {turn.answer.unknowns.length > 0 && (
                              <section className="bg-aws-smile/10 rounded p-3">
                                <h3 className="font-semibold">
                                  {t('legal_rag.workspace.questions')}
                                </h3>
                                <p className="mt-1 text-sm">
                                  {t('legal_rag.workspace.questions_note')}
                                </p>
                                <ol className="mt-2 list-decimal pl-5">
                                  {turn.answer.unknowns.map((q, i) => (
                                    <li key={i}>{q}</li>
                                  ))}
                                </ol>
                                <button
                                  className={`${button} mt-2`}
                                  onClick={() =>
                                    setText(
                                      turn
                                        .answer!.unknowns.map(
                                          (q, i) =>
                                            `${i + 1}. ${q}\n${t('legal_rag.workspace.answer_label')}`
                                        )
                                        .join('\n')
                                    )
                                  }>
                                  {t('legal_rag.workspace.answer_template')}
                                </button>
                              </section>
                            )}
                            {visibleIssues.map((issue, i) => (
                              <p className="mt-2 text-sm" key={i}>
                                {issue}
                              </p>
                            ))}
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        )}
                        {message.role === 'assistant' && turn && (
                          <>
                            <p className="mt-2 text-sm">
                              {t(
                                `legal_rag.workspace.status_${visibleStatus}`,
                                {
                                  defaultValue: visibleStatus,
                                }
                              )}
                            </p>
                          </>
                        )}
                      </article>
                    );
                  })}
                  {processing && (
                    <p
                      className="border-aws-smile/40 bg-aws-smile/10 rounded-lg border p-4"
                      role="status">
                      {t('legal_rag.workspace.processing')}
                    </p>
                  )}
                </div>
                <form
                  className="border-aws-font-color/20 sticky bottom-0 border-t bg-gray-50 px-5 pb-6 pt-3 md:px-9"
                  onSubmit={(e) => void send(e)}>
                  <label
                    className="block text-xs font-semibold"
                    htmlFor="law-question">
                    {t('legal_rag.workspace.question')}
                  </label>
                  <textarea
                    id="law-question"
                    className="border-aws-font-color/20 mt-2 min-h-24 w-full resize-y rounded-lg border bg-white p-3"
                    rows={3}
                    maxLength={20000}
                    placeholder={t('legal_rag.workspace.question_placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={w.sending}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-aws-font-color/70 text-xs">
                      {t('legal_rag.workspace.input_note')}
                    </span>
                    <div className="flex gap-2">
                      {w.pendingText && (
                        <button
                          type="button"
                          className={button}
                          onClick={() => setText(w.pendingText)}>
                          {t('legal_rag.workspace.restore_pending')}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-aws-smile border-aws-smile rounded-lg border px-4 py-2.5 text-sm text-white hover:brightness-75 disabled:opacity-40"
                        disabled={
                          !text.trim() ||
                          !w.datasetId ||
                          w.sending ||
                          w.loading ||
                          Boolean(processing && !w.pendingText)
                        }>
                        {t('legal_rag.workspace.send')}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
              <aside
                ref={evidencePanel}
                className="border-aws-font-color/20 min-w-0 space-y-3 border-t bg-white p-5 xl:sticky xl:top-0 xl:max-h-screen xl:self-start xl:overflow-y-auto xl:border-l xl:border-t-0 xl:p-7"
                aria-label={t('legal_rag.workspace.evidence')}>
                <h2 className="text-lg font-semibold">
                  {t('legal_rag.workspace.evidence_heading')}
                </h2>
                {selectedEvidence && (
                  <div
                    className="border-aws-sky bg-aws-sky/10 rounded-lg border p-3 text-sm"
                    role="status">
                    <span className="text-aws-font-color/70 block text-xs">
                      {t('legal_rag.workspace.selected_evidence')}
                    </span>
                    <strong className="mt-1 block">
                      {selectedEvidence.label}
                    </strong>
                    <span>
                      {t('legal_rag.workspace.evidence_items', {
                        count: selectedEvidence.ids.length,
                      })}
                    </span>
                  </div>
                )}
                {selectedEvidence === null && (
                  <p className="text-aws-font-color/70 text-sm leading-7">
                    {t('legal_rag.workspace.select_evidence')}
                  </p>
                )}
                {selectedEvidence !== null &&
                  selectedEvidence.ids.some(
                    (id) => !evidence.some((e) => e.evidenceId === id)
                  ) && (
                    <p role="alert">
                      {t('legal_rag.workspace.missing_evidence')}
                    </p>
                  )}
                {evidence.map((p) => (
                  <div key={p.evidenceId}>
                    <span className="bg-aws-sky/10 mb-2 inline-block rounded px-2 py-1 text-xs">
                      {t('legal_rag.workspace.cited')}
                    </span>
                    <Evidence
                      api={w.api}
                      passage={p}
                      datasetId={current!.datasetId}
                    />
                  </div>
                ))}
                {current?.state?.scope && (
                  <section className="border-aws-font-color/20 mt-6 border-t pt-5">
                    <h3 className="font-semibold">
                      {t('legal_rag.workspace.current_scope')}
                    </h3>
                    {current.state.scope.researchTask && (
                      <p className="mt-2 text-sm">
                        {current.state.scope.researchTask}
                      </p>
                    )}
                    {Boolean(current.state.scope.conditions?.length) && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {current.state.scope.conditions?.map((condition) => (
                          <li key={condition}>{condition}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
