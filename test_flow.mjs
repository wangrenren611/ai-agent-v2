console.log("=== 命令执行流程分析 ===\n");

console.log("场景 1: 用户输入 '/clear'（正确的命令）");
console.log("1. ChatInput 检测到以 / 开头，显示命令选择器");
console.log("2. 用户按 Enter");
console.log("3. CommandSelector 的 handleKey 捕获 Enter，调用 onSelect");
console.log("4. ChatInput 的 handleCommandSelect 设置 input='/clear' 并调用 onSubmit");
console.log("5. commandExecutor.execute('/clear') 返回 CommandResult");
console.log("6. app.tsx 的 onSubmit 检测到 result，设置 commandResult 并执行 setInput('')");
console.log("✅ 输入框被清空，不会再发送给 agent\n");

console.log("场景 2: 用户输入 '/claer'（拼写错误）");
console.log("1. ChatInput 检测到以 / 开头，显示命令选择器");
console.log("2. 命令选择器为空（因为没有匹配的命令）");
console.log("3. 用户按 Enter");
console.log("4. CommandSelector 不触发（没有选中命令）");
console.log("5. Input 的 onSubmit 被触发");
console.log("6. commandExecutor.execute('/claer') 返回 null（不是有效命令）");
console.log("7. onSubmit 将 '/claer' 当作普通消息发送给 agent");
console.log("❌ 这是预期行为 - 拼写错误的命令会被当作消息\n");

console.log("场景 3: 命令选择器可见，但用户按 Backspace");
console.log("1. 用户删除所有字符，input 变成 ''");
console.log("2. showCommandSelector 应该变为 false");
console.log("3. 但如果 input 中还有残留，比如退回到 help 页面后...");
