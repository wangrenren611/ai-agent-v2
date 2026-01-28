declare module 'marked-terminal' {
  import { Renderer } from 'marked';

  class TerminalRenderer extends Renderer {
    constructor(options?: {
      codespan?: (code: string) => string;
      code?: (code: string, language: string) => string;
      heading?: (text: string, level: number) => string;
      [key: string]: any;
    });
  }

  export default TerminalRenderer;
}
