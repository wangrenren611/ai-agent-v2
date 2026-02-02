import { motion } from 'framer-motion';
import { TrendingUp, Award, Globe2, Code } from 'lucide-react';

export default function Slide02() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent-500/10 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          执行摘要
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          三年内成长为全球多模态AI领域的核心玩家
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Core Achievement */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">全球第一语音合成</h3>
            </div>
            <p className="text-secondary mb-4">Artificial Analysis Speech Arena & Hugging Face TTS Arena 双冠</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-200 text-xs">超越OpenAI</span>
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-200 text-xs">超越ElevenLabs</span>
            </div>
          </motion.div>

          {/* Market Reach */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent-500/50 flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">全球化市场覆盖</h3>
            </div>
            <p className="text-secondary mb-4">产品服务遍及200+国家和地区，真正全球化布局</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-200 text-xs">2.12亿用户</span>
              <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-200 text-xs">13万+开发者</span>
            </div>
          </motion.div>

          {/* Technical Excellence */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-600/50 flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">编程能力领先</h3>
            </div>
            <p className="text-secondary mb-4">M2.1多语言编程模型，超越Claude Sonnet 4.5</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-200 text-xs">SWE-bench Verified</span>
              <span className="px-3 py-1 rounded-full bg-primary-500/20 text-primary-200 text-xs">VIBE基准88.6分</span>
            </div>
          </motion.div>

          {/* Growth Trajectory */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">高速迭代能力</h3>
            </div>
            <p className="text-secondary mb-4">2025-2026持续发布重磅产品，技术迭代速度行业领先</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 text-xs">Speech 2.6</span>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 text-xs">Hailuo 2.3</span>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 text-xs">M2-her</span>
            </div>
          </motion.div>
        </div>

        {/* Key Metrics Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-400/30"
        >
          <div className="flex justify-around text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-1">5</div>
              <div className="text-secondary text-sm">核心模态</div>
            </div>
            <div className="w-px bg-primary-400/30" />
            <div>
              <div className="text-4xl font-bold text-white mb-1">10+</div>
              <div className="text-secondary text-sm">重磅产品发布</div>
            </div>
            <div className="w-px bg-primary-400/30" />
            <div>
              <div className="text-4xl font-bold text-white mb-1">100+</div>
              <div className="text-secondary text-sm">国家/地区</div>
            </div>
            <div className="w-px bg-primary-400/30" />
            <div>
              <div className="text-4xl font-bold text-white mb-1">3</div>
              <div className="text-secondary text-sm">年快速成长</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
