```
{
  "role": "user",
  "type": "text",
  "content": "Say hello"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Get response"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test tool call event"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test message event"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test stream"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test tool result event"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test error event"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Run a failing command"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test tool error"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test recovery"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test empty tool name"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test finishReason: eos"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test finishReason: stop"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test finishReason: undefined"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test retry on bad finishReason"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test max errors"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test network retry"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test max network retries"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test error separation"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test network error count"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test error format"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test max loop"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "A message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test unlimited loops"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "First message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test network error"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test generic error"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test network error detection"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test non-network error"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Run command"
}
```
```
{
  "content": "Hello! How can I help you?",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Test response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Hello! How can I help you?",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Let me call a tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"ls\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Let me try again",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Let me call a tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"ls\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "First attempt",
  "role": "assistant",
  "type": "text",
  "finishReason": "length",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "eos",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Recovery successful",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "t1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "t1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Attempt 1",
  "role": "assistant",
  "type": "text",
  "finishReason": "content_filter",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Continue 1",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Loop 0",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c0",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Run multiple commands"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "First"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "First message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test content policy"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test rate limit"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Run command"
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"echo test\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Run command"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool execution error: Command failed",
  "tool_call_id": "call_1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool execution error: First call fails",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool execution error: Test error",
  "tool_call_id": "call_1"
}
```
```
{
  "content": "Second attempt",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool execution error: Tool crashed",
  "tool_call_id": "t1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool name is empty",
  "tool_call_id": "call_1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: Tool execution error: Critical failure",
  "tool_call_id": "t1"
}
```
```
{
  "content": "Attempt 2",
  "role": "assistant",
  "type": "text",
  "finishReason": "content_filter",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "continuing",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "ok",
  "tool_call_id": "c0"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Second message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Hello from agent 2"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Hello from agent 1"
}
```
```
{
  "content": "Multiple tools",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"ls\"}"
      }
    },
    {
      "id": "c2",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"pwd\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Streaming response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Streaming response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Streaming response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response 1",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response 1",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "With tools",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "With tools",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Error 1",
  "role": "assistant",
  "type": "text",
  "finishReason": "invalid",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Thinking...",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Test response content",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "With tools",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Test response content",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"echo hello\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "{\n  \"output\": \"test\"\n}",
  "tool_call_id": "c1"
}
```
```
{
  "content": "Calling tool",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{\"command\":\"echo hello\"}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Tool completed successfully",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Recovery successful",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Tool completed successfully",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Handled tool error",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Attempt 3",
  "role": "assistant",
  "type": "text",
  "finishReason": "content_filter",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Continue 2",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c2",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Loop 1",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c1",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Session 2 response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Session 1 response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "result",
  "tool_call_id": "c1"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Second"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Second message"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "content": "Error 2",
  "role": "assistant",
  "type": "text",
  "finishReason": "invalid",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "{\n  \"output\": \"hello\"\n}",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c1"
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "{\n  \"output\": \"hello\"\n}",
  "tool_call_id": "c1"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "continuing",
  "tool_call_id": "c2"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "ok",
  "tool_call_id": "c1"
}
```
```
{
  "content": "Final",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Final",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response 2",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Final",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "result",
  "tool_call_id": "c2"
}
```
```
{
  "content": "Response 2",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Still thinking...",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "id": "c2",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Final",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Loop 2",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c2",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Continue 3",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c3",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: missing \"command\" or \"code\"",
  "tool_call_id": "c2"
}
```
```
{
  "content": "Done",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Third message"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "ok",
  "tool_call_id": "c2"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "final",
  "tool_call_id": "c3"
}
```
```
{
  "content": "Response 3",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Loop 3",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c3",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "content": "Final response",
  "role": "assistant",
  "type": "text",
  "finishReason": "stop",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "ok",
  "tool_call_id": "c3"
}
```
```
{
  "content": "Loop 4",
  "role": "assistant",
  "type": "tool_call",
  "tool_calls": [
    {
      "id": "c4",
      "type": "function",
      "function": {
        "name": "bash",
        "arguments": "{}"
      }
    }
  ],
  "finishReason": "tool_calls",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "ok",
  "tool_call_id": "c4"
}
```
