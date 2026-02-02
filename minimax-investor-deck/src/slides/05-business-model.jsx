import { motion } from 'framer-motion';
import { Building2, Smartphone, Globe2, Users } from 'lucide-react';

export default function Slide05() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          商业模式与变现路径
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          B2B + B2C 双轨并行，全球规模化变现
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* B2B Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-8 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">B2B 企业服务</h3>
            </div>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary-500/15 border border-primary-400/20">
                <h4 className="text-white font-semibold mb-2">Open Platform API</h4>
                <p className="text-secondary text-sm">模型能力开放，开发者/企业接入，按调用量计费</p>
              </div>

              <div className="p-4 rounded-xl bg-primary-500/15 border border-primary-400/20">
                <h4 className="text-white font-semibold mb-2">MiniMax Agent</h4>
                <p className="text-secondary text-sm">企业级AI智能助手，提供定制化解决方案</p>
              </div>

              <div className="p-4 rounded-xl bg-primary-500/15 border border-primary-400/20">
                <h4 className="text-white font-semibold mb-2">Coding Plan</h4>
                <p className="text-secondary text-sm">编程订阅服务，开发者效率工具</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-primary-400/20">
              <div className="flex items-center justify-between">
                <span className="text-secondary">开发者数量</span>
                <span className="text-2xl font-bold text-primary-200">13万+</span>
              </div>
            </div>
          </motion.div>

          {/* B2C Section */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-8 border border-primary-400/30"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">B2C 消费者应用</h3>
            </div>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-accent-500/15 border border-accent-400/20">
                <h4 className="text-white font-semibold mb-2">Talkie</h4>
                <p className="text-secondary text-sm">角色扮演社交应用，虚拟角色互动体验</p>
              </div>

              <div className="p-4 rounded-xl bg-accent-500/15 border border-accent-400/20">
                <h4 className="text-white font-semibold mb-2">Hailuo AI</h4>
                <p className="text-secondary text-sm">视频创作平台，一键生成专业视频</p>
              </div>

              <div className="p-4 rounded-xl bg-accent-500/15 border border-accent-400/20">
                <h4 className="text-white font-semibold mb-2">MiniMax Audio</h4>
                <p className="text-secondary text-sm">语音合成与克隆，个性化语音体验</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-primary-400/20">
              <div className="flex items-center justify-between">
                <span className="text-secondary">全球用户</span>
                <span className="text-2xl font-bold text-accent-200">2.12亿</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Global Coverage */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-400/20"
        >
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <Globe2 className="w-6 h-6 text-primary-400" />
              <div>
                <div className="text-2xl font-bold text-white">200+</div>
                <div className="text-secondary text-sm">国家与地区</div>
              </div>
            </div>
            <div className="w-px h-12 bg-primary-400/30" />
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-accent-400" />
              <div>
                <div className="text-2xl font-bold text-white">100+</div>
                <div className="text-secondary text-sm">服务国家</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
