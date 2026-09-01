import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiArrowsCounterClockwise, PiSparkle } from 'react-icons/pi';
import Button from '../../components/Button';
import ButtonSend from '../../components/ButtonSend';
import Textarea from '../../components/Textarea';
import useUserSetting from '../../hooks/useUserSetting';

type Props = {
  content: string;
  placeholder: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  isEmpty: boolean;
  organizeDisabled?: boolean;
  organizeLoading?: boolean;
  onChangeContent: (content: string) => void;
  onSend: () => void;
  onReset: () => void;
  onOrganize: () => void;
};

const LegalRagInputChatContent: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const { settingSubmitCmdOrCtrlEnter } = useUserSetting();
  const sendDisabled = useMemo(
    () =>
      props.content.trim() === '' ||
      props.disabled === true ||
      props.loading === true,
    [props.content, props.disabled, props.loading]
  );

  return (
    <div className="w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
      <p className="m-2 whitespace-pre-wrap text-xs text-gray-500">
        {props.description}
      </p>
      <div
        className={`relative flex flex-col rounded-xl border border-black/10 bg-gray-100 shadow-[0_0_30px_1px] shadow-gray-400/40 ${
          settingSubmitCmdOrCtrlEnter ? 'mb-2' : 'mb-7'
        }`}>
        <Textarea
          className="scrollbar-thumb-gray-200 scrollbar-thin -mr-14 bg-transparent p-4"
          placeholder={props.placeholder}
          noBorder
          notItem
          value={props.content}
          onChange={props.onChangeContent}
          onEnter={sendDisabled ? undefined : props.onSend}
        />
        <div className="m-2 flex justify-between gap-1">
          <Button
            outlined
            className="py-2 text-sm"
            loading={props.organizeLoading}
            disabled={props.organizeDisabled}
            onClick={props.onOrganize}>
            <PiSparkle className="mr-2" />
            {t('legal_rag.readiness.organize')}
          </Button>
          <ButtonSend
            disabled={sendDisabled}
            loading={props.loading}
            onClick={props.onSend}
          />
        </div>

        {!props.isEmpty && (
          <Button
            className="absolute -top-14 right-0 p-2 text-sm"
            outlined
            disabled={props.loading}
            onClick={props.onReset}>
            <PiArrowsCounterClockwise className="mr-2" />
            {t('common.start_over')}
          </Button>
        )}
      </div>

      {settingSubmitCmdOrCtrlEnter && (
        <div className="mb-2 text-right text-xs text-gray-500">
          {navigator.platform.toLowerCase().includes('mac')
            ? t('chat.hint_cmd_enter')
            : t('chat.hint_ctrl_enter')}
        </div>
      )}
    </div>
  );
};

export default LegalRagInputChatContent;
