```
{
  "role": "user",
  "type": "text",
  "content": "当前目录有什么"
}
```
```
{
  "content": "<think>\n用户想了解当前目录有什么文件。我应该使用 explore 工具来探索项目结构。\n</think>\n\n\n",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "id": "call_function_nmaq0o0nws22_1",
      "type": "function",
      "function": {
        "name": "glob",
        "arguments": "{\"pattern\": \"*"
      }
    },
    {
      "id": "call_function_nmaq0o0nws22_2",
      "type": "function",
      "function": {
        "name": "glob",
        "arguments": "{\"pattern\": \"src/**/*\"}"
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
  "content": "LLM error: Unterminated string in JSON at position 14 (line 1 column 15)"
}
```
```
{
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c324845f3998fd9a035da5ec14d\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c325844158ec8f7d314a8baa039\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c322964d3d867ed4611b29ca448\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c3256e5f3d839549a4466086983\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c329f0a09d22d23878b5596b63c\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c33d9855589e6b2c98889f30355\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_nmaq0o0nws22_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c57c3300a48f7be5ce3354227fe6b6\"}",
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
