import { motion } from 'framer-motion';
import { Sparkles, Globe, Users, Zap } from 'lucide-react';

export default function Slide01() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary-400/10 rounded-full blur-[80px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <span className="text-primary-100 font-bold text-xl tracking-wide">MiniMax</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-6xl font-bold text-white mb-4 leading-tight"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Intelligence with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">Everyone</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="text-2xl text-secondary font-light"
        >
          让智能触手可及
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="card-fit glass rounded-2xl p-6 text-center border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-primary-500/30 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-primary-200" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2">200+</h3>
            <p className="text-secondary text-sm">国家与地区覆盖</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="card-fit glass rounded-2xl p-6 text-center border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-500/30 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-accent-200" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2">2.12亿</h3>
            <p className="text-secondary text-sm">全球注册用户</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="card-fit glass rounded-2xl p-6 text-center border border-primary-400/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2">13万+</h3>
            <p className="text-secondary text-sm">企业与开发者</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500/20 border border-primary-400/30">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-primary-100 text-sm font-medium">2022年成立 · 全球领先多模态AI基础模型公司</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
