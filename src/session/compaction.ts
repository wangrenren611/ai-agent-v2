import { Console } from "console";
import { message } from "../providers/base";

const CHARS_PER_TOKEN = 4;

export class Compaction {
    
     isOverflow(input:string,historyMessages:message[]): boolean {
        console.log(historyMessages)
        console.log((this.estimate(input)+this.estimate(historyMessages.map(m=>m.content).join("")))/1024)
        return this.estimate(input) + this.estimate(historyMessages.map(m=>m.content).join(""))>200*1024;
     }

    estimate(input: string) {
    // 处理空值：使用空字符串代替
    const text = input || ""

    // 计算并返回 token 数量
    // Math.round() 四舍五入到最接近的整数
    // Math.max(0, ...) 确保结果不为负数
    return Math.max(0, Math.round(text.length / CHARS_PER_TOKEN))
  }
}