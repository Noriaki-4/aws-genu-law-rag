import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LawConversation,
  LawConversationSummary,
  LawDatasetSummary,
  LawSubmitTurn,
  LawTurn,
} from 'generative-ai-use-cases';
import useLawApi, { LawApiError } from '../../hooks/useLawApi';
import { defaultLawDatasetId } from './restConfig';

const pendingKey = (cid: string) => `law-v2:pending:${cid}`;

export default function useLawWorkspace() {
  const api = useLawApi();
  const [params, setParams] = useSearchParams();
  const cid = params.get('conversation') || '';
  const [datasets, setDatasets] = useState<LawDatasetSummary[]>([]);
  const [history, setHistory] = useState<LawConversationSummary[]>([]);
  const [datasetId, setDatasetId] = useState('');
  const [conversation, setConversation] = useState<LawConversation | null>(
    null
  );
  const [turns, setTurns] = useState<LawTurn[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const sendingRef = useRef(false);

  const reportError = useCallback((e: unknown) => {
    setError(
      e instanceof LawApiError && e.status === 409
        ? 'conflict'
        : 'connection_error'
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.datasets(controller.signal),
      api.history(controller.signal),
    ])
      .then(([data, rows]) => {
        if (controller.signal.aborted) return;
        setDatasets(data);
        setHistory(rows);
        setDatasetId((currentId) => {
          if (currentId) return currentId;
          return data.some(
            (dataset) => dataset.datasetId === defaultLawDatasetId
          )
            ? defaultLawDatasetId
            : '';
        });
      })
      .catch((e) => {
        if (!controller.signal.aborted) reportError(e);
      });
    return () => controller.abort();
  }, [api, reportError, refresh]);

  useEffect(() => {
    setConversation(null);
    setTurns([]);
    if (!cid) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    const load = async () => {
      try {
        const [c, t] = await Promise.all([
          api.conversation(cid, controller.signal),
          api.turns(cid, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setConversation(c);
        setDatasetId(c.datasetId);
        setTurns(t);
        setLoading(false);
        if (c.status === 'processing') timer = setTimeout(load, 2000);
      } catch (e) {
        if (!controller.signal.aborted) {
          reportError(e);
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, cid, refresh, reportError]);

  const select = (id: string) => {
    if (sendingRef.current) return;
    setError('');
    if (
      !id &&
      datasets.some((dataset) => dataset.datasetId === defaultLawDatasetId)
    )
      setDatasetId(defaultLawDatasetId);
    setParams(id ? { conversation: id } : {});
  };

  const send = async (text: string): Promise<boolean> => {
    if (
      sendingRef.current ||
      !text.trim() ||
      !datasetId ||
      loading ||
      (cid && conversation?.conversationId !== cid)
    )
      return false;
    // Keep the same request identity after a lost response; never auto-resubmit.
    sendingRef.current = true;
    setSending(true);
    setError('');
    let targetId = cid;
    try {
      const c = conversation || (await api.create(datasetId));
      targetId = c.conversationId;
      if (!cid) {
        setConversation(c);
        setParams({ conversation: targetId });
      }
      const raw = sessionStorage.getItem(pendingKey(targetId));
      const previous = raw ? (JSON.parse(raw) as LawSubmitTurn) : null;
      if (previous && previous.text !== text) {
        setError('pending_request');
        return false;
      }
      const request: LawSubmitTurn = previous || {
        text,
        clientRequestId: crypto.randomUUID(),
        expectedRevision: c.revision,
        datasetId,
      };
      sessionStorage.setItem(pendingKey(targetId), JSON.stringify(request));
      await api.submit(targetId, request);
      sessionStorage.removeItem(pendingKey(targetId));
      return true;
    } catch (e) {
      if (e instanceof LawApiError && e.status === 409)
        sessionStorage.removeItem(pendingKey(targetId));
      reportError(e);
      return false;
    } finally {
      setSending(false);
      sendingRef.current = false;
      setRefresh((v) => v + 1);
    }
  };

  const retryText = cid ? sessionStorage.getItem(pendingKey(cid)) : null;
  return {
    api,
    cid,
    datasets,
    history,
    datasetId,
    setDatasetId,
    conversation,
    turns,
    error,
    sending,
    loading,
    select,
    send,
    refresh: () => setRefresh((v) => v + 1),
    pendingText: retryText ? (JSON.parse(retryText) as LawSubmitTurn).text : '',
  };
}
