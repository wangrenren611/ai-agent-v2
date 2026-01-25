```
{
  "role": "user",
  "type": "text",
  "content": "当前目录有什么"
}
```
```
{
  "content": "<think>\n用户问当前目录有什么，我应该先查看当前目录的文件结构。我可以使用 glob 工具来列出文件，或者使用 bash 的 ls 命令。让我先用 glob 来查看项目结构。\n</think>\n\n\n",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "id": "call_function_64pfdpp56p0t_1",
      "type": "function",
      "function": {
        "name": "glob",
        "arguments": "{\"pattern\": \"*"
      }
    },
    {
      "id": "call_function_64pfdpp56p0t_2",
      "type": "function",
      "function": {
        "name": "glob",
        "arguments": "{\"pattern\": \".*\"}"
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_64pfdpp56p0t_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580474c663bb38a8e58904b11049d\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_64pfdpp56p0t_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c58047bf97e794bb7330bab9dd4caa\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_64pfdpp56p0t_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c580472a2349cef11b1ae4bc11ab06\"}",
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
  "content": "LLM API error: API request failed: 400 Bad Request\n{\"type\":\"error\",\"error\":{\"type\":\"bad_request_error\",\"message\":\"invalid params, invalid function arguments json string, tool_call_id: call_function_64pfdpp56p0t_1 (2013)\",\"http_code\":\"400\"},\"request_id\":\"05c5804754d5c6371c1dd498d283a526\"}",
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
