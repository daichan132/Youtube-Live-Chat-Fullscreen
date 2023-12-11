import React from 'react';

import { useTranslation } from 'react-i18next';
import Select from 'react-select';

const LanguageSelector = () => {
  const languageOptions: {
    value: string;
    label: string;
  }[] = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: 'Japanese' },
  ];
  const { i18n } = useTranslation();

  const changeLanguage = (
    selectedOption: {
      value: string;
      label: string;
    } | null,
  ) => {
    if (selectedOption === null) return;
    i18n.changeLanguage(selectedOption.value);
    chrome.runtime.sendMessage({ message: 'language', language: selectedOption.value });
  };

  return (
    <Select
      styles={{
        control: (baseStyles) => ({
          ...baseStyles,
          fontSize: '14px',
          padding: '0 0',
          width: 130,
        }),
        menu: (baseStyles) => ({
          ...baseStyles,
          fontSize: '14px',
        }),
      }}
      defaultValue={languageOptions.find((option) => option.value === i18n.language)}
      options={languageOptions}
      onChange={changeLanguage}
    />
  );
};

export default LanguageSelector;
