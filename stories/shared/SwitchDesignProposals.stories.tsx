import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Switch } from '@/shared/components/Switch'

type SwitchProposal = {
  id: string
  name: string
  note: string
  initialChecked?: boolean
  vars?: CSSProperties
}

const makeVars = (overrides: Record<string, string> = {}): CSSProperties => {
  return overrides as CSSProperties
}

const switchProposals: SwitchProposal[] = [
  {
    id: 'A1',
    name: 'Subtle Glow (Default)',
    note: '採用中の既定デザイン。',
    initialChecked: true,
    vars: makeVars({
      '--ylc-switch-track-glow': 'rgba(72, 212, 113, 0.18)',
    }),
  },
  {
    id: 'A2',
    name: 'Mint Glass',
    note: '緑を少し明るく、軽い印象。',
    vars: makeVars({
      '--ylc-switch-track-on-bg': 'rgba(85, 219, 128, 0.7)',
      '--ylc-switch-track-glow': 'rgba(74, 223, 121, 0.34)',
    }),
  },
  {
    id: 'A3',
    name: 'Balanced Green',
    note: '標準より彩度を抑えた落ち着いた案。',
    vars: makeVars({
      '--ylc-switch-track-on-bg': 'rgba(74, 200, 111, 0.68)',
      '--ylc-switch-track-glow': 'rgba(63, 195, 101, 0.28)',
    }),
  },
  {
    id: 'A4',
    name: 'Deep Emerald',
    note: 'コントラスト高め。ON状態を強調。',
    vars: makeVars({
      '--ylc-switch-track-on-bg': 'rgba(47, 179, 92, 0.72)',
      '--ylc-switch-track-on-border': 'rgba(46, 174, 83, 0.86)',
      '--ylc-switch-track-glow': 'rgba(38, 169, 79, 0.36)',
    }),
  },
  {
    id: 'A5',
    name: 'Soft Frost',
    note: 'OFFを明るめにして軽いガラス感。',
    vars: makeVars({
      '--ylc-switch-track-off-bg': 'rgba(240, 247, 255, 0.56)',
      '--ylc-switch-track-off-border': 'rgba(185, 199, 217, 0.68)',
    }),
  },
  {
    id: 'A6',
    name: 'Crystal Dense',
    note: 'ガラス密度を少し高めた案。',
    vars: makeVars({
      '--ylc-switch-track-off-bg': 'rgba(228, 239, 252, 0.62)',
      '--ylc-switch-track-shine': 'rgba(255, 255, 255, 0.62)',
      '--ylc-switch-thumb-sheen': 'rgba(255, 255, 255, 0.92)',
    }),
  },
  {
    id: 'A7',
    name: 'Dark Fit',
    note: 'ダーク背景での馴染みを重視。',
    vars: makeVars({
      '--ylc-switch-track-off-bg': 'rgba(98, 122, 155, 0.36)',
      '--ylc-switch-track-off-border': 'rgba(212, 230, 250, 0.24)',
      '--ylc-switch-thumb-border': 'rgba(255, 255, 255, 0.36)',
    }),
  },
  {
    id: 'A8',
    name: 'Gloss Boost',
    note: 'ハイライトを強めたLiquid感。',
    vars: makeVars({
      '--ylc-switch-track-shine': 'rgba(255, 255, 255, 0.68)',
      '--ylc-switch-thumb-sheen': 'rgba(255, 255, 255, 0.96)',
      '--ylc-switch-track-glow': 'rgba(79, 227, 124, 0.32)',
    }),
  },
  {
    id: 'A9',
    name: 'Ultra Subtle',
    note: 'さらに発光を抑えた比較用。',
    vars: makeVars({
      '--ylc-switch-track-glow': 'rgba(72, 212, 113, 0.12)',
    }),
  },
  {
    id: 'A10',
    name: 'Neutral Glass',
    note: '色味を抑えた中立寄り。',
    vars: makeVars({
      '--ylc-switch-track-on-bg': 'rgba(74, 190, 107, 0.66)',
      '--ylc-switch-track-on-border': 'rgba(70, 182, 104, 0.76)',
      '--ylc-switch-track-glow': 'rgba(70, 182, 104, 0.22)',
    }),
  },
]

const SwitchProposalCard = ({ proposal }: { proposal: SwitchProposal }) => {
  const [checked, setChecked] = useState(Boolean(proposal.initialChecked))

  return (
    <article className='proposal-card ylc-theme-surface'>
      <div className='proposal-card-head'>
        <div className='proposal-id'>{proposal.id}</div>
        <div className='proposal-title ylc-theme-text-primary'>{proposal.name}</div>
      </div>
      <p className='proposal-note ylc-theme-text-muted'>{proposal.note}</p>
      <div className='proposal-switch-wrap' style={proposal.vars}>
        <Switch checked={checked} id={`proposal-switch-${proposal.id}`} onChange={setChecked} />
      </div>
    </article>
  )
}

const SwitchDesignProposalsPreview = () => {
  return (
    <div className='proposal-root ylc-theme-surface-muted'>
      <style>{`
        .proposal-root {
          min-height: 100vh;
          padding: 24px;
        }
        .proposal-header {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 700;
        }
        .proposal-sub {
          margin: 0 0 20px;
          font-size: 13px;
        }
        .proposal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
        }
        .proposal-card {
          border: var(--ylc-border-width) solid var(--ylc-border);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .proposal-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .proposal-id {
          font-size: 11px;
          font-weight: 700;
          border: var(--ylc-border-width) solid var(--ylc-border);
          border-radius: 9999px;
          padding: 2px 8px;
          color: var(--ylc-text-secondary);
          background: var(--ylc-bg-surface-elevated);
        }
        .proposal-title {
          font-size: 15px;
          font-weight: 600;
        }
        .proposal-note {
          margin: 0;
          font-size: 12px;
          line-height: 1.35;
          min-height: 32px;
        }
        .proposal-switch-wrap {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
        }
      `}</style>

      <h2 className='proposal-header ylc-theme-text-primary'>Switch Design Proposals (10)</h2>
      <p className='proposal-sub ylc-theme-text-muted'>このページは実装中の `Switch` コンポーネントをそのまま表示します。見た目崩れがあればここで即検知できます。</p>

      <div className='proposal-grid'>
        {switchProposals.map(proposal => (
          <SwitchProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: 'Shared/SwitchDesignProposals',
  component: SwitchDesignProposalsPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SwitchDesignProposalsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const TenProposals: Story = {}
