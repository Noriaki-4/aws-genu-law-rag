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
  PiCheckCircle,
  PiInfo,
  PiMagnifyingGlass,
  PiSparkle,
  PiWarningCircle,
} from 'react-icons/pi';
import Button from '../components/Button';
import ChatMessage from '../components/ChatMessage';
import InputChatContent from '../components/InputChatContent';
import ScrollTopBottom from '../components/ScrollTopBottom';
import useFollow from '../hooks/useFollow';
import { useAgentCore } from '../hooks/useAgentCore';
import { findModelByModelId, MODELS } from '../hooks/useModel';
import { selectLegalRagRuntime } from '../features/legalRag/runtime';
import {
  QuestionReadinessResult,
  requestQuestionReadiness,
} from '../features/legalRag/questionReadiness';

const EXAMPLE_LEVELS = [1, 2, 3] as const;
const SCOPE_ROWS = ['lease', 'finance', 'pharma'] as const;

const LegalRagPage: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [content, setContent] = useState('');
  const [sessionId] = useState(uuidv4());
  const [readiness, setReadiness] = useState<QuestionReadinessResult | null>(
    null
  );
  const [readinessError, setReadinessError] = useState('');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState('');
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
      setSelectedChoiceId(result.choices[0]?.choiceId ?? '');
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

  const selectedChoice = readiness?.choices.find(
    (choice) => choice.choiceId === selectedChoiceId
  );
  const organizeDisabled =
    !content.trim() || !runtime || !model || loading || readinessLoading;

  const applyRefinedQuestion = useCallback(() => {
    if (!selectedChoice) return;
    onChangeContent(selectedChoice.refinedQuestion);
  }, [onChangeContent, selectedChoice]);

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
                <p className="mt-1 text-sm">{readiness.reason}</p>
              </div>
            </div>
          ) : (
            <div className="text-amber-950">
              <p className="font-semibold">
                {readiness.clarificationQuestion ||
                  t('legal_rag.readiness.clarification_default')}
              </p>
              <p className="mt-1 text-sm">{readiness.reason}</p>
              {readiness.choices.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {readiness.choices.map((choice) => (
                      <label
                        key={choice.choiceId}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white p-3">
                        <input
                          type="radio"
                          name="legal-rag-readiness-choice"
                          value={choice.choiceId}
                          checked={selectedChoiceId === choice.choiceId}
                          onChange={() => setSelectedChoiceId(choice.choiceId)}
                        />
                        <span>{choice.label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedChoice && (
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold text-gray-600">
                        {t('legal_rag.readiness.refined_question')}
                      </p>
                      <p className="mt-1 text-sm">
                        {selectedChoice.refinedQuestion}
                      </p>
                    </div>
                  )}
                  <Button onClick={applyRefinedQuestion}>
                    {t('legal_rag.readiness.apply')}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm">
                  {t('legal_rag.readiness.edit_instruction')}
                </p>
              )}
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
                      <th className="border p-2">
                        {t('legal_rag.scope.notes')}
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
                        <td className="border p-2 text-gray-600">
                          {t(`legal_rag.scope.rows.${row}.notes`)}
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
              <PiMagnifyingGlass />
              {t('legal_rag.examples.title')}
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {t('legal_rag.examples.intro')}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {EXAMPLE_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className="rounded-lg border border-gray-200 p-3 text-left transition hover:border-orange-400 hover:bg-orange-50"
                  onClick={() =>
                    onChangeContent(
                      t(`legal_rag.examples.level_${level}.question`)
                    )
                  }>
                  <div className="mb-1 text-xs font-semibold text-orange-700">
                    {t('legal_rag.examples.level', { level })}
                  </div>
                  <div className="font-medium">
                    {t(`legal_rag.examples.level_${level}.title`)}
                  </div>
                  <div className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {t(`legal_rag.examples.level_${level}.question`)}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {t('legal_rag.examples.expected_label')}{' '}
                    {t(`legal_rag.examples.level_${level}.expected`)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {!isEmpty && (
        <div ref={scrollableContainer}>
          {messages.map((message, index) => (
            <React.Fragment key={message.id ?? index}>
              <div className="w-full border-b border-gray-300" />
              <ChatMessage
                idx={index}
                chatContent={message}
                loading={loading && index === messages.length - 1}
              />
            </React.Fragment>
          ))}
          <div className="w-full border-b border-gray-300" />
        </div>
      )}

      <div className="fixed right-4 top-[calc(50vh-2rem)] z-0 lg:right-8">
        <ScrollTopBottom />
      </div>

      <div className="fixed bottom-0 z-10 flex w-full flex-col items-center justify-center bg-gradient-to-t from-white via-white pb-1 pt-4 lg:pr-64 print:hidden">
        <InputChatContent
          content={content}
          placeholder={t('legal_rag.input_placeholder')}
          description={t('legal_rag.input_description')}
          disabled={!runtime || loading || readinessLoading}
          onChangeContent={onChangeContent}
          resetDisabled={isEmpty}
          isEmpty={isEmpty}
          onSend={onSend}
          onReset={onReset}
          fileUpload={false}
          leadingAction={
            <Button
              outlined
              className={`py-2 text-sm ${organizeDisabled ? '!opacity-60' : ''}`}
              loading={readinessLoading}
              disabled={organizeDisabled}
              onClick={() => void onOrganizeQuestion()}>
              <PiSparkle className="mr-2" />
              {t('legal_rag.readiness.organize')}
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default LegalRagPage;
