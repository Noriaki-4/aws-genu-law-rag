import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LawConversation, LawEvidence } from 'generative-ai-use-cases';
import { LawApi } from '../../hooks/useLawApi';
import { userFacingIssues, userFacingStatus } from './presentation';

type DiagnosticTurn = {
  turnId: string;
  status: string;
  runIds: string[];
  request?: { text?: string };
  decision?: { action?: string; reason?: string };
  stateBefore?: unknown;
  stateAfter?: unknown;
  context?: unknown;
};

type RetrievalStep = {
  operationId: string;
  documentId?: string;
  documentTitle?: string;
  readMode?: string;
  reused?: boolean;
  status?: string;
  researchTask?: string;
  fullReadReason?: string;
  search?: { total?: number; hasMore?: boolean; candidates?: unknown };
  query?: unknown;
  retrievedLocationIds?: string[];
  inputLocationIds?: string[];
  limitations?: unknown[];
  referenceIds?: unknown;
  hierarchyPath?: unknown;
  inputSources?: unknown;
};

type Metric = { knownSum?: number };
type DiagnosticCall = {
  callId: string;
  record?: {
    stage?: string;
    model?: string;
    status?: string;
    elapsedSeconds?: number;
    outputContract?: string;
    attempt?: number;
  };
  instruction?: unknown;
  outputSchema?: unknown;
  parsedOutput?: unknown;
};

type RunAnalysis = {
  run?: {
    runId?: string;
    datasetId?: string;
    status?: string;
    limitations?: string[];
    answer?: {
      claims?: { evidenceIds?: string[] }[];
      unresolvedIssues?: string[];
    };
  };
  artifacts?: {
    retrieval_steps?: RetrievalStep[];
    references?: unknown;
    evidence?: LawEvidence[];
  };
  usage?: { totalInput?: Metric; output?: Metric };
  cost?: { knownUsd?: number | null; unknownCalls?: number };
  documentFlow?: unknown;
  lineage?: unknown;
  findings?: unknown;
  calls?: DiagnosticCall[];
};

const panel = 'border-aws-font-color/20 rounded-lg border bg-white p-5';
const button =
  'text-aws-font-color border-aws-font-color/20 rounded-lg border bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40';

function JsonDetails({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="border-aws-font-color/20 mt-3 rounded-lg border bg-white p-4">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap break-all text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function statusLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  status?: string
) {
  return status
    ? t(`legal_rag.workspace.status_${status}`, { defaultValue: status })
    : '';
}

export default function LawAnalysis({
  api,
  cid,
  conversation,
}: {
  api: LawApi;
  cid: string;
  conversation: LawConversation | null;
}) {
  const { t } = useTranslation();
  const [turns, setTurns] = useState<DiagnosticTurn[]>([]);
  const [total, setTotal] = useState<{
    calls?: unknown[];
    knownUsd?: number;
    unknownCalls?: number;
  }>();
  const [run, setRun] = useState<RunAnalysis>();
  const [rid, setRid] = useState('');
  const [query, setQuery] = useState('');
  const [raw, setRaw] = useState<unknown>();
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const runLimitations = userFacingIssues(run?.run?.limitations);
  const unresolvedIssues = userFacingIssues(run?.run?.answer?.unresolvedIssues);

  useEffect(() => {
    const controller = new AbortController();
    setTurns([]);
    setTotal(undefined);
    setRid('');
    setRun(undefined);
    setRaw(undefined);
    setError(false);
    if (cid)
      Promise.all([
        api.analysis(cid, controller.signal),
        api.usage(cid, controller.signal),
      ])
        .then(([analysis, usage]) => {
          if (controller.signal.aborted) return;
          setTurns((analysis as { turns?: DiagnosticTurn[] }).turns || []);
          setTotal(
            usage as {
              calls?: unknown[];
              knownUsd?: number;
              unknownCalls?: number;
            }
          );
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => controller.abort();
  }, [api, cid]);

  useEffect(() => {
    const controller = new AbortController();
    setRun(undefined);
    setRaw(undefined);
    setError(false);
    if (rid)
      api
        .runAnalysis(rid, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setRun(value as RunAnalysis);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    return () => controller.abort();
  }, [api, rid]);

  const selectedTurn = turns.find((turn) => turn.runIds.includes(rid));
  const citedIds = new Set(
    run?.run?.answer?.claims?.flatMap((claim) => claim.evidenceIds || []) || []
  );
  const saveDiagnostic = () => {
    saveBlob(
      new Blob([JSON.stringify({ conversation, turns, run }, null, 2)], {
        type: 'application/json',
      }),
      'analysis.json'
    );
  };
  const saveExport = async () => {
    if (!rid) return;
    setDownloading(true);
    setError(false);
    try {
      saveBlob(await api.analysisExport(rid), `analysis-${rid}.zip`);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {t('legal_rag.analysis.title')}
        </h2>
        <button className={button} onClick={saveDiagnostic}>
          {t('legal_rag.analysis.save_json')}
        </button>
      </div>
      <p className="text-aws-font-color/70 mt-3 text-sm">
        {t('legal_rag.analysis.notice')}
      </p>
      {error && (
        <p className="mt-4" role="alert">
          {t('legal_rag.workspace.analysis_error')}
        </p>
      )}
      {total && (
        <p className="mt-5">
          {t('legal_rag.analysis.total', {
            calls: total.calls?.length || 0,
            cost: total.knownUsd?.toFixed(5) || '0.00000',
            unknown: total.unknownCalls || 0,
          })}
        </p>
      )}
      <p className="text-aws-font-color/70 mt-2 text-sm">
        {t('legal_rag.analysis.timeline_notice')}
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {turns.map((turn, index) => (
          <button
            className={`${button} text-left ${turn.runIds.includes(rid) ? 'border-aws-sky bg-aws-sky/10' : ''}`}
            key={turn.turnId}
            onClick={() => setRid(turn.runIds.at(-1) || '')}>
            <strong className="block">
              {t('legal_rag.analysis.timeline_item', {
                index: index + 1,
                text: turn.request?.text?.slice(0, 80) || turn.turnId,
              })}
            </strong>
            <span className="text-aws-font-color/70 mt-2 block text-xs">
              {t('legal_rag.analysis.timeline_status', {
                status: statusLabel(t, turn.status),
                action:
                  turn.decision?.action ||
                  t('legal_rag.analysis.before_decision'),
              })}
            </span>
          </button>
        ))}
      </div>
      {rid && (
        <p className="text-aws-font-color/70 mt-4 break-all text-sm">
          {t('legal_rag.analysis.current_run')} <code>{rid}</code>
        </p>
      )}
      {selectedTurn && (
        <section className="mt-5">
          {selectedTurn.decision?.reason && (
            <p>{selectedTurn.decision.reason}</p>
          )}
          <JsonDetails
            title={t('legal_rag.analysis.state_change')}
            value={{
              before: selectedTurn.stateBefore,
              after: selectedTurn.stateAfter,
            }}
          />
          <JsonDetails
            title={t('legal_rag.analysis.decision')}
            value={selectedTurn.decision}
          />
          <JsonDetails
            title={t('legal_rag.analysis.context')}
            value={selectedTurn.context}
          />
          {selectedTurn.runIds.length > 1 && (
            <select
              className="border-aws-font-color/20 mt-3 max-w-full rounded-lg border bg-white p-3"
              aria-label={t('legal_rag.analysis.run')}
              value={rid}
              onChange={(event) => setRid(event.target.value)}>
              {selectedTurn.runIds.map((runId) => (
                <option key={runId}>{runId}</option>
              ))}
            </select>
          )}
        </section>
      )}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-sm font-semibold">
          {t('legal_rag.analysis.past_run')}
          <input
            className="border-aws-font-color/20 mt-2 w-full rounded-lg border bg-white p-3 font-normal"
            placeholder={t('legal_rag.analysis.past_run_placeholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className={button}
          disabled={!query.trim()}
          onClick={() => setRid(query.trim())}>
          {t('legal_rag.analysis.open_run')}
        </button>
      </div>

      {run?.artifacts?.retrieval_steps && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold">
            {t('legal_rag.analysis.retrieval')}
          </h3>
          {run.artifacts.retrieval_steps.map((step) => (
            <details className={`${panel} mt-3`} key={step.operationId}>
              <summary className="cursor-pointer font-semibold">
                {t('legal_rag.analysis.retrieval_summary', {
                  document: step.documentTitle || step.documentId,
                  mode: t(
                    step.readMode === 'full'
                      ? 'legal_rag.analysis.full_read'
                      : 'legal_rag.analysis.pinpoint'
                  ),
                  reused: step.reused ? t('legal_rag.analysis.reused') : '',
                  status: statusLabel(t, step.status),
                })}
              </summary>
              {step.researchTask && <p className="mt-3">{step.researchTask}</p>}
              {step.fullReadReason && (
                <p className="mt-2">
                  {t('legal_rag.analysis.full_read_reason')}{' '}
                  {step.fullReadReason}
                </p>
              )}
              {step.search && (
                <p className="mt-2">
                  {t('legal_rag.analysis.matches', {
                    count: step.search.total || 0,
                  })}
                  {step.search.hasMore ? t('legal_rag.analysis.has_more') : ''}
                </p>
              )}
              {step.query !== undefined && (
                <JsonDetails
                  title={t('legal_rag.analysis.query_candidates')}
                  value={{
                    query: step.query,
                    candidates: step.search?.candidates,
                  }}
                />
              )}
              <p className="mt-2">
                {t('legal_rag.analysis.retrieved_locations')}{' '}
                {step.retrievedLocationIds?.join('、') ||
                  t('legal_rag.analysis.full_or_missing')}
              </p>
              <p className="mt-2">
                {t('legal_rag.analysis.input_locations')}{' '}
                {step.inputLocationIds?.join('、') ||
                  t('legal_rag.analysis.not_recorded')}
              </p>
              {Boolean(
                userFacingIssues(step.limitations as string[] | undefined)
                  .length
              ) && (
                <JsonDetails
                  title={t('legal_rag.analysis.limitations')}
                  value={userFacingIssues(
                    step.limitations as string[] | undefined
                  )}
                />
              )}
              <JsonDetails
                title={t('legal_rag.analysis.retrieval_path')}
                value={{
                  referenceIds: step.referenceIds,
                  hierarchyPath: step.hierarchyPath,
                  inputSources: step.inputSources,
                }}
              />
            </details>
          ))}
          <JsonDetails
            title={t('legal_rag.analysis.references')}
            value={run.artifacts.references}
          />
        </section>
      )}

      {run?.artifacts?.evidence && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold">
            {t('legal_rag.analysis.evidence', {
              count: run.artifacts.evidence.length,
            })}
          </h3>
          <div className="mt-3 space-y-3">
            {run.artifacts.evidence.map((passage) => (
              <details className={panel} key={passage.evidenceId}>
                <summary className="cursor-pointer font-semibold">
                  {t('legal_rag.analysis.evidence_item', {
                    title: passage.title,
                    location: passage.heading || passage.locationId,
                  })}
                </summary>
                <span className="bg-aws-sky/10 mt-3 inline-block rounded px-2 py-1 text-xs">
                  {t(
                    citedIds.has(passage.evidenceId)
                      ? 'legal_rag.analysis.cited'
                      : 'legal_rag.analysis.not_cited'
                  )}
                </span>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {passage.text}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {run?.usage && (
        <section className="mt-8">
          <button
            className={button}
            disabled={downloading}
            onClick={() => void saveExport()}>
            {t('legal_rag.analysis.save_zip')}
          </button>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={panel}>
              <span className="text-aws-font-color/70 block text-xs">
                {t('legal_rag.analysis.status')}
              </span>
              <strong>
                {statusLabel(
                  t,
                  userFacingStatus(run.run?.status, run.run?.answer)
                )}
              </strong>
            </div>
            <div className={panel}>
              <span className="text-aws-font-color/70 block text-xs">
                {t('legal_rag.analysis.input_tokens')}
              </span>
              <strong>
                {(run.usage.totalInput?.knownSum || 0).toLocaleString()}
              </strong>
            </div>
            <div className={panel}>
              <span className="text-aws-font-color/70 block text-xs">
                {t('legal_rag.analysis.output_tokens')}
              </span>
              <strong>
                {(run.usage.output?.knownSum || 0).toLocaleString()}
              </strong>
            </div>
            <div className={panel}>
              <span className="text-aws-font-color/70 block text-xs">
                {t('legal_rag.analysis.estimated_cost')}
              </span>
              <strong>
                {run.cost?.knownUsd == null
                  ? t('legal_rag.analysis.unknown')
                  : `$${run.cost.knownUsd.toFixed(5)}`}
              </strong>
              <small className="block">
                {t('legal_rag.analysis.unknown_calls', {
                  count: run.cost?.unknownCalls || 0,
                })}
              </small>
            </div>
          </div>
          <JsonDetails
            title={t('legal_rag.analysis.document_flow')}
            value={run.documentFlow}
          />
          {Boolean(runLimitations.length) && (
            <JsonDetails
              title={t('legal_rag.analysis.run_limitations')}
              value={runLimitations}
            />
          )}
          {Boolean(unresolvedIssues.length) && (
            <JsonDetails
              title={t('legal_rag.analysis.unresolved')}
              value={unresolvedIssues}
            />
          )}
          <JsonDetails
            title={t('legal_rag.analysis.lineage')}
            value={run.lineage}
          />
          <JsonDetails
            title={t('legal_rag.analysis.findings_usage')}
            value={{ findings: run.findings, usage: run.usage }}
          />
          <h3 className="mt-8 text-lg font-semibold">
            {t('legal_rag.analysis.calls')}
          </h3>
          {run.calls?.map((call) => (
            <details className={`${panel} mt-3`} key={call.callId}>
              <summary className="cursor-pointer font-semibold">
                {t('legal_rag.analysis.call_summary', {
                  stage: call.record?.stage,
                  model: call.record?.model,
                  status: statusLabel(t, call.record?.status),
                  seconds: call.record?.elapsedSeconds,
                })}
              </summary>
              <p className="mt-3 text-sm">
                {t('legal_rag.analysis.contract', {
                  contract:
                    call.record?.outputContract ||
                    t('legal_rag.analysis.not_recorded'),
                  attempt: call.record?.attempt || 0,
                })}
              </p>
              <JsonDetails
                title={t('legal_rag.analysis.record')}
                value={call.record}
              />
              <JsonDetails
                title={t('legal_rag.analysis.instruction')}
                value={call.instruction}
              />
              <JsonDetails
                title={t('legal_rag.analysis.schema')}
                value={call.outputSchema}
              />
              <JsonDetails
                title={t('legal_rag.analysis.output')}
                value={call.parsedOutput}
              />
              <button
                className={`${button} mt-3`}
                onClick={() =>
                  void api
                    .rawCall(rid, call.callId)
                    .then(setRaw)
                    .catch(() => setError(true))
                }>
                {t('legal_rag.analysis.raw_call')}
              </button>
            </details>
          ))}
          {raw !== undefined && (
            <JsonDetails title={t('legal_rag.analysis.raw')} value={raw} />
          )}
        </section>
      )}
    </section>
  );
}
