export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The level of RBTools debug logging.
       */
      RBTOOLS_DEBUG_LEVEL?: string
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
