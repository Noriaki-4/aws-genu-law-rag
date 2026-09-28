import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LawDataset,
  LawEvidence,
  LawToolResult,
  LawTurn,
} from 'generative-ai-use-cases';
import useLawWorkspace from './useLawWorkspace';
import { lawRestBase } from './restConfig';
import { LawApi } from '../../hooks/useLawApi';
import LawQuestionLibrary from './LawQuestionLibrary';

const panel = 'rounded-xl border border-aws-font-color/20 bg-white p-4';
const button =
  'rounded border border-aws-font-color/30 px-3 py-2 text-sm disabled:opacity-40';

function Evidence({
  passage,
  datasetId,
}: {
  passage: LawEvidence;
  datasetId: string;
}) {
  const { t } = useTranslation();
  const id = encodeURIComponent;
  const source =
    passage.sourceUrl && /^https?:\/\//i.test(passage.sourceUrl)
      ? passage.sourceUrl
      : undefined;
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
        <a
          target="_blank"
          rel="noreferrer"
          href={`${lawRestBase}/datasets/${id(datasetId)}/documents/${id(passage.documentId)}/content?version=${id(passage.versionId)}`}>
          {t('legal_rag.workspace.saved_document')}
        </a>
        {source && (
          <a target="_blank" rel="noreferrer" href={source}>
            {t('legal_rag.workspace.source')}
          </a>
        )}
      </div>
    </article>
  );
}

function TurnDetails({
  api,
  cid,
  turn,
  onEvidence,
}: {
  api: LawApi;
  cid: string;
  turn: LawTurn;
  onEvidence: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<LawToolResult>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setResult(await api.toolResult(cid, turn.turnId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="border-aws-font-color/20 mt-4 border-t pt-3">
      <button className={button} disabled={loading} onClick={() => void load()}>
        {t('legal_rag.workspace.requirements')}
      </button>
      {error && <p role="alert">{t('legal_rag.workspace.connection_error')}</p>}
      {result && (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {t('legal_rag.workspace.requirements_status', {
              status: result.requirementsStatus,
            })}
          </p>
          <p>
            {t('legal_rag.workspace.sql_ready', {
              value: String(result.readyForSql),
            })}
          </p>
          {result.error && <p role="alert">{result.error}</p>}
          <p className="whitespace-pre-wrap">{result.combination}</p>
          <ul className="space-y-2">
            {result.requirements.map((r, i) => (
              <li key={i}>
                <p>{r.text}</p>
                <button
                  className="text-aws-smile underline"
                  onClick={() => onEvidence(r.evidenceIds)}>
                  {t('legal_rag.workspace.evidence')}
                </button>
              </li>
            ))}
          </ul>
          {result.unresolvedIssues.map((issue, i) => (
            <p key={i}>{issue}</p>
          ))}
          <p>{t('legal_rag.workspace.sql_notice')}</p>
        </div>
      )}
    </div>
  );
}

function DocumentMap({ api, datasetId }: { api: LawApi; datasetId: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<LawDataset>();
  const [error, setError] = useState(false);
  const [focus, setFocus] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(false);
    setFocus('');
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
  const relations =
    data?.relations.filter(
      (r) => r.sourceId === focus || r.targetId === focus
    ) || [];
  return (
    <section className={panel}>
      <h2 className="mb-3 text-lg font-semibold">
        {t('legal_rag.workspace.documents')}
      </h2>
      {error && <p role="alert">{t('legal_rag.workspace.connection_error')}</p>}
      <input
        className="mb-3 w-full rounded border p-2"
        aria-label={t('legal_rag.workspace.find_document')}
        placeholder={t('legal_rag.workspace.find_document')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="max-h-96 space-y-1 overflow-auto">
          {documents.map((d) => (
            <li key={d.documentId}>
              <button
                className={`${button} w-full text-left ${focus === d.documentId ? 'bg-aws-sky/20' : ''}`}
                onClick={() => setFocus(d.documentId)}>
                {d.title}
              </button>
            </li>
          ))}
        </ul>
        <div>
          <h3 className="mb-3 font-semibold">{titles.get(focus)}</h3>
          <p className="mb-2 text-sm">
            {t('legal_rag.workspace.relations_notice')}
          </p>
          {focus && relations.length === 0 && (
            <p>{t('legal_rag.workspace.no_relations')}</p>
          )}
          <ul className="space-y-3">
            {relations.map((r, i) => (
              <li className="bg-aws-sky/10 rounded p-3 text-sm" key={i}>
                <button
                  className="text-left underline"
                  onClick={() => setFocus(r.sourceId)}>
                  {titles.get(r.sourceId) || r.sourceId}
                </button>
                <p>
                  {t('legal_rag.workspace.relation_type', {
                    type: r.relationType,
                  })}
                </p>
                <button
                  className="text-left underline"
                  onClick={() => setFocus(r.targetId)}>
                  {titles.get(r.targetId) || r.targetId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Analysis({
  api,
  cid,
  turns,
}: {
  api: LawApi;
  cid: string;
  turns: LawTurn[];
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<unknown>();
  const [error, setError] = useState(false);
  const [rid, setRid] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(false);
    if (cid)
      (rid
        ? api.runAnalysis(rid, controller.signal)
        : api.analysis(cid, controller.signal)
      )
        .then((d) => {
          if (!controller.signal.aborted) setData(d);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => controller.abort();
  }, [api, cid, rid]);
  return (
    <section className={panel}>
      <h2 className="mb-3 text-lg font-semibold">
        {t('legal_rag.workspace.analysis')}
      </h2>
      <select
        className="mb-3 max-w-full rounded border p-2"
        aria-label={t('legal_rag.workspace.analysis')}
        value={rid}
        onChange={(e) => setRid(e.target.value)}>
        <option value="">{t('legal_rag.workspace.conversation')}</option>
        {[...new Set(turns.flatMap((turn) => turn.runIds))].map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      {error && <p role="alert">{t('legal_rag.workspace.analysis_error')}</p>}
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-all text-xs">
        {data === undefined ? '' : JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

export default function LawWorkspace() {
  const { t } = useTranslation();
  const w = useLawWorkspace();
  const [text, setText] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [tab, setTab] = useState<'conversation' | 'documents' | 'analysis'>(
    'conversation'
  );
  const [evidenceIds, setEvidenceIds] = useState<string[] | null>(null);
  const evidencePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (evidenceIds && window.innerWidth < 1280) {
      evidencePanel.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [evidenceIds]);
  useEffect(() => {
    setEvidenceIds(null);
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
    current?.evidence.filter((e) => evidenceIds?.includes(e.evidenceId)) || [];
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await w.send(text)) setText('');
  };
  return (
    <main className="text-aws-font-color mx-auto max-w-[1600px] p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{t('legal_rag.title')}</h1>
        <p className="border-aws-smile/50 bg-aws-smile/10 mt-2 rounded border p-3 text-sm">
          {t('legal_rag.workspace.local_notice')}
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <aside className={`${panel} space-y-3`}>
          <label className="block text-sm">
            {t('legal_rag.workspace.dataset')}
            <select
              className="mt-2 w-full rounded border p-2"
              value={w.datasetId}
              disabled={Boolean(w.cid) || w.sending}
              onChange={(e) => w.setDatasetId(e.target.value)}>
              <option value="">
                {t('legal_rag.workspace.choose_dataset')}
              </option>
              {w.datasets.map((d) => (
                <option key={d.datasetId} value={d.datasetId}>
                  {t('legal_rag.workspace.dataset_label', {
                    name:
                      d.municipalities.join(' / ') || d.datasetId.slice(0, 12),
                    count: d.documentCount,
                    id: d.datasetId.slice(3, 11),
                  })}
                </option>
              ))}
            </select>
          </label>
          <button
            className={`${button} w-full`}
            disabled={w.sending}
            onClick={() => selectConversation('')}>
            {t('legal_rag.workspace.new_conversation')}
          </button>
          <h2 className="font-semibold">{t('legal_rag.workspace.history')}</h2>
          <ul className="max-h-40 space-y-2 overflow-auto lg:max-h-[60vh]">
            {w.history.map((c) => (
              <li key={c.conversationId}>
                <button
                  className={`${button} w-full break-words text-left ${c.conversationId === w.cid ? 'bg-aws-sky/20' : ''}`}
                  disabled={w.sending}
                  onClick={() => selectConversation(c.conversationId)}>
                  {c.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 space-y-4">
          <LawQuestionLibrary
            open={libraryOpen}
            disabled={
              w.sending ||
              w.loading ||
              Boolean(processing) ||
              Boolean(w.pendingText)
            }
            municipality={municipality}
            onClose={() => setLibraryOpen(false)}
            onSelect={chooseQuestion}
          />
          <nav
            className="flex flex-wrap gap-2"
            aria-label={t('legal_rag.workspace.views')}>
            {(
              ['conversation', 'library', 'documents', 'analysis'] as const
            ).map((name) =>
              name === 'library' ? (
                <button
                  key={name}
                  className={button}
                  aria-haspopup="dialog"
                  onClick={() => setLibraryOpen(true)}>
                  {t('legal_rag.resident_library.title')}
                </button>
              ) : (
                <button
                  key={name}
                  className={`${button} ${tab === name ? 'bg-aws-sky/20' : ''}`}
                  aria-pressed={tab === name}
                  onClick={() => setTab(name)}>
                  {t(`legal_rag.workspace.${name}`)}
                </button>
              )
            )}
          </nav>
          {w.error && (
            <div className={panel} role="alert">
              <p>{t(`legal_rag.workspace.${w.error}`)}</p>
              <button className={button} onClick={w.refresh}>
                {t('legal_rag.workspace.reload')}
              </button>
            </div>
          )}
          {tab === 'documents' && (
            <DocumentMap api={w.api} datasetId={w.datasetId} />
          )}
          {tab === 'analysis' && (
            <Analysis key={w.cid} api={w.api} cid={w.cid} turns={w.turns} />
          )}
          {tab === 'conversation' && (
            <>
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <section
                  className="min-w-0 space-y-3"
                  aria-label={t('legal_rag.workspace.conversation')}>
                  {!w.cid && (
                    <p className={panel}>{t('legal_rag.workspace.start')}</p>
                  )}
                  {w.loading && (
                    <p role="status">{t('legal_rag.workspace.loading')}</p>
                  )}
                  {current?.messages.map((message) => {
                    const turn = w.turns.find(
                      (v) => v.turnId === message.turnId
                    );
                    return (
                      <article
                        key={message.messageId}
                        className={`${panel} ${message.role === 'user' ? 'bg-aws-sky/10' : ''}`}>
                        <h2 className="mb-2 text-sm font-semibold">
                          {t(`legal_rag.workspace.${message.role}`)}
                        </h2>
                        {message.role === 'assistant' && turn?.answer ? (
                          <>
                            {turn.answer.claims.map((claim, i) => (
                              <section className="mb-4" key={i}>
                                {claim.heading && (
                                  <h3 className="font-semibold">
                                    {claim.heading}
                                  </h3>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {claim.text}
                                </p>
                                {claim.evidenceIds.length > 0 && (
                                  <button
                                    className="text-aws-smile mt-2 text-sm underline"
                                    onClick={() =>
                                      setEvidenceIds(claim.evidenceIds)
                                    }>
                                    {t('legal_rag.workspace.evidence_count', {
                                      count: claim.evidenceIds.length,
                                    })}
                                  </button>
                                )}
                              </section>
                            ))}
                            {turn.answer.unknowns.length > 0 && (
                              <section className="bg-aws-smile/10 rounded p-3">
                                <h3 className="font-semibold">
                                  {t('legal_rag.workspace.questions')}
                                </h3>
                                <ul>
                                  {turn.answer.unknowns.map((q, i) => (
                                    <li key={i}>{q}</li>
                                  ))}
                                </ul>
                                <button
                                  className={`${button} mt-2`}
                                  onClick={() =>
                                    setText(
                                      turn
                                        .answer!.unknowns.map((q) => `${q}\n`)
                                        .join('\n')
                                    )
                                  }>
                                  {t('legal_rag.workspace.answer_questions')}
                                </button>
                              </section>
                            )}
                            {turn.answer.unresolvedIssues?.map((issue, i) => (
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
                              {t(`legal_rag.workspace.status_${turn.status}`, {
                                defaultValue: turn.status,
                              })}
                            </p>
                            <TurnDetails
                              key={`${w.cid}:${turn.turnId}`}
                              api={w.api}
                              cid={w.cid}
                              turn={turn}
                              onEvidence={setEvidenceIds}
                            />
                          </>
                        )}
                      </article>
                    );
                  })}
                  {processing && (
                    <p role="status">{t('legal_rag.workspace.processing')}</p>
                  )}
                </section>
                <aside
                  ref={evidencePanel}
                  className="min-w-0 space-y-3"
                  aria-label={t('legal_rag.workspace.evidence')}>
                  <h2 className="font-semibold">
                    {t('legal_rag.workspace.evidence')}
                  </h2>
                  {evidenceIds === null && (
                    <p className="text-sm">
                      {t('legal_rag.workspace.select_evidence')}
                    </p>
                  )}
                  {evidenceIds !== null &&
                    evidenceIds.some(
                      (id) => !evidence.some((e) => e.evidenceId === id)
                    ) && (
                      <p role="alert">
                        {t('legal_rag.workspace.missing_evidence')}
                      </p>
                    )}
                  {evidence.map((p) => (
                    <Evidence
                      key={p.evidenceId}
                      passage={p}
                      datasetId={current!.datasetId}
                    />
                  ))}
                </aside>
              </div>
              <form
                className={`${panel} sticky bottom-0 space-y-2`}
                onSubmit={(e) => void send(e)}>
                <label className="block text-sm" htmlFor="law-question">
                  {t('legal_rag.workspace.question')}
                </label>
                <textarea
                  id="law-question"
                  className="border-aws-font-color/30 w-full rounded border p-3"
                  rows={3}
                  maxLength={20000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={w.sending}
                />
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
                  className={`${button} bg-aws-squid-ink text-white`}
                  disabled={
                    !text.trim() ||
                    !w.datasetId ||
                    w.sending ||
                    w.loading ||
                    Boolean(processing && !w.pendingText)
                  }>
                  {t('legal_rag.workspace.send')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
