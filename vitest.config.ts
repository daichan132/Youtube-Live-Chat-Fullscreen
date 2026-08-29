import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { coverageConfig } from './vitest.coverage.ts'

const legacyCoreSpecs = [
  'entrypoints/content/features/Draggable/hooks/clipGeometry.spec.ts',
  'entrypoints/content/features/Draggable/hooks/draggableItemStyles.spec.ts',
  'entrypoints/content/features/YTDLiveChatSetting/styleHistoryCommands.spec.ts',
  'entrypoints/content/runtime/resolveChatDecision.spec.ts',
  'entrypoints/content/style/compileStylePatch.spec.ts',
  'entrypoints/content/utils/darkenRgbaColor.spec.ts',
  'entrypoints/popup/utils/dataTransfer.spec.ts',
  'shared/constants/zIndex.spec.ts',
  'shared/i18n/assets.spec.ts',
  'shared/i18n/generated.spec.ts',
  'shared/i18n/language.spec.ts',
  'shared/i18n/publicLocales.spec.ts',
  'shared/runtime/createAppRuntime.spec.ts',
  'shared/settings/backup.spec.ts',
  'shared/settings/chatSettingsStore.spec.ts',
  'shared/settings/equality.spec.ts',
  'shared/settings/fitGeometryToViewport.spec.ts',
  'shared/settings/migrateSettings.spec.ts',
  'shared/settings/normalizeSettings.spec.ts',
  'shared/stores/globalSettingStore.spec.ts',
  'shared/styles/theme.spec.ts',
  'shared/utils/fontFamilyPolicy.spec.ts',
]

const sourceSpecs = ['shared/**/*.spec.ts', 'shared/**/*.spec.tsx', 'entrypoints/**/*.spec.ts', 'entrypoints/**/*.spec.tsx']

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    clearMocks: true,
    restoreMocks: true,
    allowOnly: process.env.YLC_ALLOW_ONLY === '1',
    coverage: coverageConfig,
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['**/*.unit.spec.ts', ...legacyCoreSpecs],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['**/*.dom.spec.ts', '**/*.dom.spec.tsx', ...sourceSpecs, 'e2e/support/diagnostics.spec.ts'],
          exclude: ['node_modules/**', '**/*.unit.spec.ts', ...legacyCoreSpecs],
          setupFiles: ['./tests/setup/dom.ts', './tests/setup/extension.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'contracts',
          environment: 'node',
          include: ['**/*.contract.spec.ts', 'e2e/config/**/*.spec.ts', 'e2e/support/**/*.spec.ts', 'scripts/verify/**/*.spec.mjs'],
          exclude: ['node_modules/**', 'e2e/support/diagnostics.spec.ts'],
        },
      },
    ],
    exclude: ['node_modules/**'],
  },
})
