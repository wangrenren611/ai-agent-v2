```
{
  "role": "user",
  "type": "text",
  "content": "当前目录有什么"
}
```
```
{
  "content": "我来帮你探索当前目录的结构。",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"prompt\":\"探索当前目录的项目结构，包括主要的文件夹和文件组织方式\"}",
        "name": "explore"
      },
      "id": "call_-7948022693267467660",
      "index": 0,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 6407,
    "completion_tokens": 79,
    "total_tokens": 6486
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Invalid arguments for tool \"explore\": Expected object, received string",
  "tool_call_id": "call_-7948022693267467660"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"command\":\"ls -la\"}",
        "name": "bash"
      },
      "id": "call_-7948048222556748296",
      "index": 0,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 6454,
    "completion_tokens": 33,
    "total_tokens": 6487
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Invalid arguments for tool \"bash\": Expected object, received string",
  "tool_call_id": "call_-7948048222556748296"
}
```
