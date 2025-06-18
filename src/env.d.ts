export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * `This variable is used for debug process`
       *
       * Changes the folder to be resolved on any function that depends on executing non-JavaScript files (eg. EXE and Python files).
       *
       * Default is `dist/bin`.
       */
      RBTOOLS_BIN_PATH?: string
    }
  }
}

export {}
