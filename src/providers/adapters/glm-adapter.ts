/**
 * GLM API Adapter
 *
 * Handles GLM-specific API differences:
 * - Different models (glm-4.7, glm-vl, glm-4-flash, etc.)
 * - Vision model image encoding
 * - Model-specific parameters
 */

import { StandardAdapter, StandardTransformOptions } from './standard-adapter';
import { Message } from '../providers/base';

export interface GLMTransformOptions extends StandardTransformOptions {
  /** Model name (for request body) */
  model?: string;
}

/**
 * GLM adapter
 *
 * Extends StandardAdapter with GLM-specific model handling.
 */
export class GLMAdapter extends StandardAdapter {
  constructor() {
    super({
      endpointPath: '/chat/completions',
      defaultModel: 'glm-4.7',
    });
  }

  protected enrichRequestBody(body: any, options?: GLMTransformOptions): any {
    const model = options?.model || this.defaultModel;

    // GLM-4-flash specific parameter
    if (model === 'glm-4-flash') {
      body.use_flash = true;
    }

    return body;
  }

  transformRequest(messages: Message[], options?: GLMTransformOptions) {
    const model = options?.model || this.defaultModel;

    // For vision models, process image content
    if (model === 'glm-vl' || model.startsWith('glm-vl')) {
      return this.transformVLRequest(messages, options);
    }

    return super.transformRequest(messages, options);
  }

  /**
   * Transform request for vision model (glm-vl)
   */
  private transformVLRequest(messages: Message[], options?: GLMTransformOptions) {
    const body = super.transformRequest(messages, options);
    (body as any).messages = messages.map((msg) => ({
      role: msg.role,
      content: this.processImageContent(msg.content),
    }));
    return body;
  }

  /**
   * Process image content for GLM-VL
   */
  private processImageContent(content: Message['content']): unknown {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((part) => {
        if (part.type === 'image_url') {
          return {
            type: 'image_url',
            image_url: {
              url: part.image_url.url,
            },
          };
        }
        return part;
      });
    }

    return content;
  }
}
