import { motion } from 'framer-motion';
import { Sparkles, Globe, Bot, Layers } from 'lucide-react';

export default function Slide07() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/12 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          未来愿景
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          从AI工具到创作伙伴，重新定义人机协作
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Worldplay */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Worldplay 愿景</h3>
            <h4 className="text-primary-300 text-sm mb-3">从"角色扮演"到"世界共创"</h4>
            <ul className="space-y-2 text-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>动态世界状态建模（实体、关系、因果链）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>多角色协同，关系动态演化</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>从"进入预设世界"到"共同创造世界"</span>
              </li>
            </ul>
          </motion.div>

          {/* Agent Deepening */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Agent 能力深化</h3>
            <h4 className="text-primary-300 text-sm mb-3">更强的规划与执行能力</h4>
            <ul className="space-y-2 text-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>识别伏笔，确保戏剧性时刻完美呈现</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>跨数百轮对话的一致性保证</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>端到端办公自动化（行政、财务、HR）</span>
              </li>
            </ul>
          </motion.div>

          {/* Multimodal Fusion */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 shadow-lg">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">多模态融合</h3>
            <h4 className="text-primary-300 text-sm mb-3">统一创作入口</h4>
            <ul className="space-y-2 text-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Media Agent 代表的多模态创作统一入口</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>自然语言交互创作成为下一代平台标准</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>文本→音频→图片→视频无缝转换</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary-500/15 via-accent-500/10 to-primary-500/15 border border-primary-400/20"
        >
          <h4 className="text-white font-semibold text-center mb-5">产品演进路线图</h4>
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-500/50 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">2022</span>
              </div>
              <p className="text-secondary text-xs">公司成立</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-primary-500/50 to-accent-500/50 mx-4" />
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-500/50 flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">2025</span>
              </div>
              <p className="text-secondary text-xs">全模态发布</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-accent-500/50 to-primary-500/50 mx-4" />
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-medium text-sm">2026+</p>
              <p className="text-secondary text-xs">Worldplay</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
