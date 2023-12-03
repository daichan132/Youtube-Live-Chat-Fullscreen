import { useTranslation } from 'react-i18next';
import styles from './styles/Popup.module.scss';
import classNames from 'classnames';
import { YTDLiveChatSwitch } from './components/YTDLiveChatSwitch';
import React from 'react';
import { useGlobalSettingStore } from '../stores';
import { useUpdateEffect } from 'react-use';

interface itemType {
  title: string;
  data: React.ReactNode;
  disable?: boolean;
}

const Popup = () => {
  const { t } = useTranslation();
  const [isChanged, setIsChanged] = React.useState(false);
  const items: itemType[] = [
    { title: t('popup.showChatOnFullscreen'), data: <YTDLiveChatSwitch /> },
    {
      title: t('popup.reload'),
      data: (
        <button
          onClick={() => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
              if (tabs[0]?.id) {
                chrome.tabs.reload(tabs[0].id);
                setIsChanged(false);
              }
            });
          }}
        >
          aa
        </button>
      ),
      disable: !isChanged,
    },
  ];
  const state = useGlobalSettingStore((state) => state);
  useUpdateEffect(() => {
    setIsChanged(true);
  }, [state]);
  return (
    <div className={styles['settings']}>
      <div className={styles['content']}>
        {items.map((item, i) => {
          return (
            <React.Fragment key={item.title}>
              <div
                className={classNames(styles['content-item'], item?.disable && styles['disable'])}
              >
                <div className={styles['title']}>
                  <div>{item.title}</div>
                </div>
                {item.data}
              </div>
              {item.disable ||
              i === items.length - 1 ||
              (i === items.length - 2 && items[i + 1].disable) ? null : (
                <hr />
              )}
            </React.Fragment>
          );
        })}
        <div className={styles['footer']}>
          <div className={styles['help']}>
            {t('content.setting.footer')}
            <a
              href="https://smart-persimmon-6f9.notion.site/Chrome-extension-help-1606385e75a14d65ae4d0e42ba47fb84?pvs=4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('content.setting.help')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
