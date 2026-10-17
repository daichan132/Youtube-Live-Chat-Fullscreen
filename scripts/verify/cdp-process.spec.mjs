import { describe, expect, it, vi } from 'vitest'
import { getCdpProcessCommand } from './cdp-process.mjs'

describe('CDP listener process inspection', () => {
  it('continues to the next listener PID when a process exits during inspection', async () => {
    const command = 'chrome --remote-debugging-port=9335 --user-data-dir=/private/tmp/ylc-cdp-profile'
    const executeFile = vi.fn(async (file, args) => {
      if (file === 'lsof') return { stdout: ' 101\n\n202\n' }
      if (file === 'ps' && args[1] === '101') throw new Error('process exited')
      if (file === 'ps' && args[1] === '202') return { stdout: `${command}\n` }
      throw new Error(`Unexpected executable: ${file}`)
    })

    await expect(getCdpProcessCommand(9335, executeFile)).resolves.toEqual({ pid: '202', command })
    expect(executeFile).toHaveBeenNthCalledWith(1, 'lsof', ['-nP', '-iTCP:9335', '-sTCP:LISTEN', '-t'])
    expect(executeFile).toHaveBeenNthCalledWith(2, 'ps', ['-p', '101', '-o', 'command='])
    expect(executeFile).toHaveBeenNthCalledWith(3, 'ps', ['-p', '202', '-o', 'command='])
  })

  it('reports an unavailable listener without inspecting unrelated processes', async () => {
    const executeFile = vi.fn().mockRejectedValue(new Error('no listener'))

    await expect(getCdpProcessCommand(9336, executeFile)).rejects.toThrow(
      'Could not find the browser process listening on port 9336: no listener',
    )
    expect(executeFile).toHaveBeenCalledOnce()
  })

  it('rejects an empty or exited listener set rather than returning an unverified process', async () => {
    const executeFile = vi.fn(async (file, args) => {
      if (file === 'lsof') return { stdout: '101\n202\n' }
      if (args[1] === '101') return { stdout: '\n' }
      throw new Error('process exited')
    })

    await expect(getCdpProcessCommand(9336, executeFile)).rejects.toThrow('Could not inspect the browser process listening on port 9336.')
  })
})
