import { motion } from 'framer-motion';
import { Mail, Globe, Sparkles } from 'lucide-react';

export default function Slide09() {
  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-primary-500/12 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary-500/5 to-accent-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="slide-content relative z-10 flex flex-col items-center justify-center h-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-2xl shadow-primary-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            MiniMax
          </span>
        </motion.div>

        {/* Mission */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-3xl text-white mb-12 font-light text-center"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Intelligence with Everyone
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-xl text-secondary mb-12"
        >
          让智能触手可及
        </motion.p>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-primary-500/20 border border-primary-400/30">
            <Globe className="w-5 h-5 text-primary-300" />
            <span className="text-primary-100">www.minimaxi.com</span>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-accent-500/20 border border-accent-400/30">
            <Mail className="w-5 h-5 text-accent-300" />
            <span className="text-primary-100">ir@minimax.io</span>
          </div>
        </motion.div>

        {/* Thank You */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-2xl text-white font-medium mb-2">感谢关注</p>
          <p className="text-secondary">期待与您携手共创AI未来</p>
        </motion.div>
      </div>
    </div>
  );
}
