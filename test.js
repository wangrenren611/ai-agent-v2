const toolCalls=  [
      {
        "function": {
          "arguments": "{\"subagent_type\":\"explore\",\"description\":\"深度分析项目架构和代码结构\",\"prompt\":\"我需要对这个AI Agent项目进行深度架构分析。请帮我：\\n\\n1. 完整探索项目目录结构，列出所有源代码文件\\n2. 分析项目的主要模块和它们之间的依赖关系\\n3. 识别核心设计模式和架构决策\\n4. 找出所有关键类、接口和它们的职责\\n5. 分析数据流（从CLI输入到数据库存储的完整流程）\\n6. 识别代码中的最佳实践和潜在改进点\\n\\n请提供详细的分析报告，包括：\\n- 完整的目录树结构\\n- 各个模块的职责说明\\n- 关键代码文件的用途\\n- 架构图和数据流图\\n- 设计模式的使用情况\\n- 代码质量评估\\n\\n这是一个探索任务，不需要修改任何文件。\"}",
          "name": "task"
        },
        "id": "call_-7958655795372060987",
        "index": 0,
        "type": "function"
      }
    ]


  console.log(JSON.stringify(
                toolCalls.map((call) => ({
                    name: call.function.name,
                    arguments: call.function.arguments,
                }))
            ))