import EventEmitter from "events";
import { LLMProvider, message } from "../providers/base";
import Log, { ScopedLogger } from "../util/log";
import Memory from "../storage/memory";



export default class Agent extends EventEmitter {
    LLM: LLMProvider;
    logger: ScopedLogger;
    maxLoop: number;
    memory: Memory
    constructor(LLM: LLMProvider, maxRetries: number = 3) {
        super();
        this.LLM = LLM;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = 100;
        this.memory = new Memory();
    }

    async init() {
        await this.memory.init();
    }
    
    async run(query: string) {
        const spinner = this.logger.spinner('Agent is running...');

        const messages: message[] = [
            {
                role: 'system',
                content: 'You are a helpful assistant.',
            },
            {
                role: 'user',
                content: query,
            }
        ]

        let loopCount = 0;

        while (loopCount < this.maxLoop) {
            loopCount++;
            try {
                const llmResponse = await this.LLM.generate(messages, {
                    model: 'deepseek-chat',
                })

                if (!llmResponse) {
                    this.emit('loopFailure', llmResponse);
                    spinner.fail('Agent failed to run...');
                    return null;
                }

                this.emit('loopSuccess', llmResponse);
                spinner.succeed('Agent succeeded to run');
                
                this.logger.json(llmResponse);

                return llmResponse;

            } catch (error) {
                spinner.fail('Agent failed to run...');
                this.emit('loopFailure', error);
                return null;
            } finally {
                spinner.stop();
                this.emit('loopEnd');
            }
        }

    }
}
