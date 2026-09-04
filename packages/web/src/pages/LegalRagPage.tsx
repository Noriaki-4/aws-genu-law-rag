import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import {
  PiBookOpenText,
  PiBooks,
  PiCheckCircle,
  PiInfo,
  PiWarningCircle,
} from 'react-icons/pi';
import Button from '../components/Button';
import ChatMessage from '../components/ChatMessage';
import ScrollTopBottom from '../components/ScrollTopBottom';
import useFollow from '../hooks/useFollow';
import { useAgentCore } from '../hooks/useAgentCore';
import { findModelByModelId, MODELS } from '../hooks/useModel';
import { selectLegalRagRuntime } from '../features/legalRag/runtime';
import {
  QuestionReadinessResult,
  requestQuestionReadiness,
} from '../features/legalRag/questionReadiness';
import QuestionLibraryDialog from '../features/legalRag/QuestionLibraryDialog';
import { LEGAL_RAG_QUESTIONS } from '../features/legalRag/questionLibrary';
import { installReadableStreamAsyncIterator } from '../features/legalRag/readableStreamAsyncIterator';
import LegalRagInputChatContent from '../features/legalRag/LegalRagInputChatContent';
import LegalRagCitations from '../features/legalRag/LegalRagCitations';
import { useReloadOnServiceWorkerUpdate } from '../features/legalRag/useReloadOnServiceWorkerUpdate';

const SCOPE_ROWS = ['finance'] as const;

const LegalRagPage: React.FC = () => {
  installReadableStreamAsyncIterator();
  useReloadOnServiceWorkerUpdate();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [content, setContent] = useState('');
  const [sessionId] = useState(uuidv4());
  const [readiness, setReadiness] = useState<QuestionReadinessResult | null>(
    null
  );
  const [readinessError, setReadinessError] = useState('');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [questionLibraryOpen, setQuestionLibraryOpen] = useState(false);
  const readinessRequestId = useRef(0);
  const { scrollableContainer, setFollowing } = useFollow();

  const {
    messages,
    isEmpty,
    clear,
    loading,
    invokeAgentRuntime,
    getExternalRuntimes,
    getModelId,
    setModelId,
  } = useAgentCore(pathname);

  const runtime = useMemo(
    () => selectLegalRagRuntime(getExternalRuntimes()),
    [getExternalRuntimes]
  );
  const modelId = getModelId();
  const model = modelId ? findModelByModelId(modelId) : undefined;
  const displayedMessages = useMemo(
    () => messages.map((message) => ({ ...message, llmType: undefined })),
    [messages]
  );

  useEffect(() => {
    if (!modelId && MODELS.modelIds.length > 0) {
      setModelId(MODELS.modelIds[0]);
    }
  }, [modelId, setModelId]);

  const onSend = useCallback(() => {
    const question = content.trim();
    if (!question || !runtime || loading) return;

    setFollowing(true);
    readinessRequestId.current += 1;
    setReadiness(null);
    setReadinessError('');
    void invokeAgentRuntime(runtime.arn, sessionId, question);
    setContent('');
  }, [content, invokeAgentRuntime, loading, runtime, sessionId, setFollowing]);

  const onReset = useCallback(() => {
    readinessRequestId.current += 1;
    clear();
    setContent('');
    setReadiness(null);
    setReadinessError('');
  }, [clear]);

  const onChangeContent = useCallback((value: string) => {
    readinessRequestId.current += 1;
    setContent(value);
    setReadiness(null);
    setReadinessError('');
    setReadinessLoading(false);
  }, []);

  const onOrganizeQuestion = useCallback(async () => {
    const question = content.trim();
    if (!question || !runtime || !model || loading || readinessLoading) return;

    const requestId = readinessRequestId.current + 1;
    readinessRequestId.current = requestId;
    setReadiness(null);
    setReadinessError('');
    setReadinessLoading(true);
    try {
      const result = await requestQuestionReadiness({
        agentRuntimeArn: runtime.arn,
        sessionId,
        question,
        model,
      });
      if (readinessRequestId.current !== requestId) return;
      setReadiness(result);
    } catch (error) {
      if (readinessRequestId.current !== requestId) return;
      setReadinessError(
        error instanceof Error ? error.message : t('legal_rag.readiness.error')
      );
    } finally {
      if (readinessRequestId.current === requestId) {
        setReadinessLoading(false);
      }
    }
  }, [content, loading, model, readinessLoading, runtime, sessionId, t]);

  const organizeDisabled =
    !content.trim() || !runtime || !model || loading || readinessLoading;

  const applyRecommendedQuestion = useCallback(() => {
    if (!readiness || readiness.decision !== 'ready') return;
    onChangeContent(readiness.recommendation);
  }, [onChangeContent, readiness]);

  return (
    <div className={`${!isEmpty ? 'screen:pb-48' : 'pb-44'} relative`}>
      <header className="mx-auto my-5 w-11/12 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="bg-aws-squid-ink rounded-lg p-2 text-2xl text-white">
            <PiBookOpenText />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t('legal_rag.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('legal_rag.description')}
            </p>
          </div>
        </div>
      </header>

      {!runtime && (
        <div className="mx-auto my-6 flex w-11/12 max-w-5xl gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <PiWarningCircle className="mt-0.5 shrink-0 text-xl" />
          <p>{t('legal_rag.runtime_not_configured')}</p>
        </div>
      )}

      {readinessError && (
        <div className="mx-auto my-4 flex w-11/12 max-w-5xl gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <PiWarningCircle className="mt-0.5 shrink-0 text-xl" />
          <div>
            <p className="font-semibold">{t('legal_rag.readiness.error')}</p>
            <p className="mt-1 text-sm">{readinessError}</p>
          </div>
        </div>
      )}

      {readiness && (
        <section
          className={`mx-auto my-4 w-11/12 max-w-5xl rounded-xl border p-4 ${
            readiness.decision === 'ready'
              ? 'border-green-300 bg-green-50'
              : 'border-amber-300 bg-amber-50'
          }`}>
          {readiness.decision === 'ready' ? (
            <div className="flex gap-2 text-green-900">
              <PiCheckCircle className="mt-0.5 shrink-0 text-xl" />
              <div>
                <p className="font-semibold">
                  {t('legal_rag.readiness.ready')}
                </p>
                <div className="mt-3 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-gray-600">
                    {t('legal_rag.readiness.recommended_question')}
                  </p>
                  <p className="mt-1 text-sm">{readiness.recommendation}</p>
                </div>
                <Button className="mt-3" onClick={applyRecommendedQuestion}>
                  {t('legal_rag.readiness.apply')}
                </Button>
                <p className="mt-2 text-sm">
                  {t('legal_rag.readiness.ready_instruction')}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-amber-950">
              <p className="font-semibold">
                {t('legal_rag.readiness.clarification_recommended')}
              </p>
              <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                {readiness.recommendation}
              </div>
              <p className="mt-3 text-sm">
                {t('legal_rag.readiness.edit_instruction')}
              </p>
            </div>
          )}
        </section>
      )}

      {isEmpty && runtime && (
        <div className="mx-auto w-11/12 max-w-5xl space-y-4">
          <details open className="rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold">
              <PiInfo />
              {t('legal_rag.scope.title')}
            </summary>
            <div className="border-t border-gray-200 p-4">
              <p className="mb-3 text-sm text-gray-600">
                {t('legal_rag.scope.intro')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">
                        {t('legal_rag.scope.field')}
                      </th>
                      <th className="border p-2">
                        {t('legal_rag.scope.sources')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCOPE_ROWS.map((row) => (
                      <tr key={row}>
                        <td className="border p-2 font-medium">
                          {t(`legal_rag.scope.rows.${row}.field`)}
                        </td>
                        <td className="border p-2">
                          {t(`legal_rag.scope.rows.${row}.sources`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <PiBooks />
              {t('legal_rag.question_library.title')}
            </div>
            <p className="mb-3 text-sm text-gray-600">
              {t('legal_rag.question_library.intro', {
                count: LEGAL_RAG_QUESTIONS.length,
              })}
            </p>
            <Button outlined onClick={() => setQuestionLibraryOpen(true)}>
              <PiBooks className="mr-2" />
              {t('legal_rag.question_library.open', {
                count: LEGAL_RAG_QUESTIONS.length,
              })}
            </Button>
          </section>
        </div>
      )}

      {!isEmpty && (
        <div ref={scrollableContainer}>
          {displayedMessages.map((message, index) => (
            <React.Fragment key={message.id ?? index}>
              <div className="w-full border-b border-gray-300" />
              <ChatMessage
                idx={index}
                chatContent={message}
                loading={loading && index === displayedMessages.length - 1}
              />
              {message.role === 'assistant' && message.legalRagCitations && (
                <LegalRagCitations citations={message.legalRagCitations} />
              )}
            </React.Fragment>
          ))}
          <div className="w-full border-b border-gray-300" />
        </div>
      )}

      <div className="fixed right-4 top-[calc(50vh-2rem)] z-0 lg:right-8">
        <ScrollTopBottom />
      </div>

      <QuestionLibraryDialog
        isOpen={questionLibraryOpen}
        onClose={() => setQuestionLibraryOpen(false)}
        onSelectQuestion={onChangeContent}
      />

      <div className="fixed bottom-0 z-10 flex w-full flex-col items-center justify-center bg-gradient-to-t from-white via-white pb-1 pt-4 lg:pr-64 print:hidden">
        <LegalRagInputChatContent
          content={content}
          placeholder={t('legal_rag.input_placeholder')}
          description={t('legal_rag.input_description')}
          disabled={!runtime || readinessLoading}
          loading={loading}
          onChangeContent={onChangeContent}
          isEmpty={isEmpty}
          onSend={onSend}
          onReset={onReset}
          organizeDisabled={organizeDisabled}
          organizeLoading={readinessLoading}
          onOrganize={() => void onOrganizeQuestion()}
        />
      </div>
    </div>
  );
};

export default LegalRagPage;
