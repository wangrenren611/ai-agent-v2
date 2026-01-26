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
  "content": "Test tool error"
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
  "content": "Test empty tool name"
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
  "content": "Test finishReason: stop"
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
  "content": "Test finishReason: eos"
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
  "content": "Test network error count"
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
  "content": "A message"
}
```
```
{
  "role": "user",
  "type": "text",
  "content": "Test network error format"
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
  "content": "Test generic error format"
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
  "role": "system",
  "type": "text",
  "content": "[Error] Failed to fetch. Please try a different approach."
}
```
```
{
  "role": "system",
  "type": "text",
  "content": "[Error] ECONNRESET. Please try a different approach."
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
