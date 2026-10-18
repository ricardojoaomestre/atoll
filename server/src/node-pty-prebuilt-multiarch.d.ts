declare module 'node-pty-prebuilt-multiarch' {
  export interface IPty {
    readonly pid: number
    readonly cols: number
    readonly rows: number
    readonly process: string
    write(data: string): void
    resize(cols: number, rows: number): void
    kill(signal?: string): void
    onData(callback: (data: string) => void): { dispose(): void }
    onExit(callback: (e: { exitCode: number; signal?: number }) => void): {
      dispose(): void
    }
  }

  export interface IPtyForkOptions {
    name?: string
    cols?: number
    rows?: number
    cwd?: string
    env?: Record<string, string | undefined>
    encoding?: string
  }

  export function spawn(
    file: string,
    args: string[] | string,
    options: IPtyForkOptions,
  ): IPty
}
