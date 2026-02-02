import { motion } from 'framer-motion';
import { Trophy, Target, Cpu, Zap } from 'lucide-react';

export default function Slide04() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-primary-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-accent-500/10 rounded-full blur-[80px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          技术优势与壁垒
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          三年深耕，铸就行业领先的评估体系与训练方法论
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Role-Play Excellence */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">角色扮演领域标杆</h3>
                <p className="text-primary-300 text-sm">三年持续优化</p>
              </div>
            </div>
            <ul className="space-y-3 text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>构建完整 Role-Play Bench 评估系统</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>100轮对话测试综合排名第一</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span> Worlds × Stories × User Preferences 框架</span>
              </li>
            </ul>
          </motion.div>

          {/* Agentic Data Synthesis */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Agentic Data Synthesis</h3>
                <p className="text-primary-300 text-sm">智能体数据合成</p>
              </div>
            </div>
            <ul className="space-y-3 text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>四阶段流水线：采样→生成→评估→修正</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>Best-of-N 采样筛选确保高质量</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>多样性保障机制防止模式崩溃</span>
              </li>
            </ul>
          </motion.div>

          {/* Online Preference Learning */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Online Preference Learning</h3>
                <p className="text-primary-300 text-sm">在线偏好学习</p>
              </div>
            </div>
            <ul className="space-y-3 text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>分层偏差消除：活跃度、交互风格、时间因素</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>因果推断区分主效应和交互效应</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>熵监控防止模式崩溃</span>
              </li>
            </ul>
          </motion.div>

          {/* Performance */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">基准测试领先</h3>
                <p className="text-primary-300 text-sm">性能对标国际巨头</p>
              </div>
            </div>
            <ul className="space-y-3 text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>SWEBench Verified 超越 Claude Sonnet 4.5</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>语音合成全球第一（超越 OpenAI/ElevenLabs）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-400 mt-1">•</span>
                <span>VIBE 基准综合得分 88.6</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
