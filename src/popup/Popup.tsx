import { useTranslation } from 'react-i18next';
import styles from './styles/Popup.module.scss';
import classNames from 'classnames';
import { YTDLiveChatSwitch } from './components/YTDLiveChatSwitch';
import React from 'react';
// import { EmojiCopySwitch } from './components/EmojiCopySwitch';
import LanguageSelector from './components/LanguageSelector';
import { IconType } from 'react-icons';
import { IoLanguage } from 'react-icons/io5';

interface itemType {
  icon?: IconType;
  title: string;
  data: React.ReactNode;
}

const Popup = () => {
  const { t } = useTranslation();
  const items: itemType[] = [
    { icon: IoLanguage, title: t('popup.language'), data: <LanguageSelector /> },
    { title: t('popup.showChatOnFullscreen'), data: <YTDLiveChatSwitch /> },
    // { title: t('popup.emojiCopy'), data: <EmojiCopySwitch /> },
  ];

  return (
    <div className={styles['settings']}>
      <div className={styles['content']}>
        {items.map((item, i) => {
          return (
            <React.Fragment key={item.title + `-${i}`}>
              <div className={classNames(styles['content-item'])}>
                <div className={item.icon ? styles['title-with-icon'] : styles['title']}>
                  {item.icon ? <item.icon size={16} /> : null}
                  <div>{item.title}</div>
                </div>
                {item.data}
              </div>
              {i === items.length - 1 ? null : <hr />}
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
