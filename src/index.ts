import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
const env = process.env.NODE_ENV || 'development';
import Agent from './agent';

dotenv.config({ path: `.env.${env}`, override: true });
import { connectDB } from './storage/mongoose';

async function main() {

    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY is not set');
    }

    if (!process.env.DEEPSEEK_BASE_URL) {
        throw new Error('DEEPSEEK_BASE_URL is not set');
    }



    const openaiProvider = new OpenAIProvider({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL,
    });

    const agent = new Agent(openaiProvider);
    await agent.init();

    try {
        await agent.run('你好')
    } catch (error) {
        console.error(error);
    }

    // await openaiProvider.generate('你好', {
    //     model: 'deepseek-chat',
    // })
    // console.log(openaiProvider.countTokens());
    //conn.disconnect();
}

main().catch(console.error);
