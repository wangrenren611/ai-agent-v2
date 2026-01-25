```
{
  "role": "user",
  "type": "text",
  "content": "当前目录有什么"
}
```
```
{
  "content": "<think>\n用户问当前目录有什么，我应该列出当前目录的内容。我可以使用 bash 命令来列出目录内容。\n</think>\n\n\n",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "id": "call_function_av290x6dp459_1",
      "type": "function",
      "index": 0,
      "function": {
        "name": "bash",
        "arguments": "{\"command\": \"ls -"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "finishReason": "tool_calls"
}
```
```
{
  "role": "assistant",
  "type": "text",
  "content": "LLM error: Unterminated string in JSON at position 17 (line 1 column 18)"
}
```
```
{
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_av290x6dp459_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580c661f2afc536b288a07108b12c\"}",
  "role": "assistant",
  "type": "text",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "finishReason": "error"
}
```
```
{
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_av290x6dp459_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580c6e5e797eaf0c6189b57aba3f4\"}",
  "role": "assistant",
  "type": "text",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "finishReason": "error"
}
```
```
{
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_av290x6dp459_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580c7e728eb4697c314fea0d55639\"}",
  "role": "assistant",
  "type": "text",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "finishReason": "error"
}
```
```
{
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_av290x6dp459_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580c7bbd886157cfd37252043e188\"}",
  "role": "assistant",
  "type": "text",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "finishReason": "error"
}
```
