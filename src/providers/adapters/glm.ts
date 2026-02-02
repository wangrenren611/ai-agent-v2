/**
 * GLM Adapter (智谱 AI)
 */

import { StandardAdapter } from './standard';
import type { TransformOptions } from './base';

export class GLMAdapter extends StandardAdapter {
  constructor() {
    super({
      endpointPath: '/chat/completions',
      defaultModel: 'glm-4-flash',
    });
  }

  protected enrichRequestBody(body: Record<string, unknown>, options: TransformOptions): Record<string, unknown> {
    // GLM 特殊处理
    if (options.tools?.length) {
      body.tools = options.tools.map(t => ({
        type: t.type,
        function: t.function,
      }));
    }
    return body;
  }
}
