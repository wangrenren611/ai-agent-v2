import { motion } from 'framer-motion';
import { TrendingUp, Target, Globe, Zap } from 'lucide-react';

export default function Slide08() {
  const highlights = [
    {
      icon: TrendingUp,
      title: "万亿级市场机遇",
      desc: "多模态AI市场规模快速扩张，语音、视频、音频需求爆发式增长",
      stat: "$100B+"
    },
    {
      icon: Target,
      title: "技术领先地位",
      desc: "全模态唯一性+垂直领域第一，构建难以复制的竞争壁垒",
      stat: "#1"
    },
    {
      icon: Globe,
      title: "全球化布局",
      desc: "200+国家覆盖，2.12亿用户验证，13万开发者生态",
      stat: "200+"
    },
    {
      icon: Zap,
      title: "商业化路径清晰",
      desc: "B2B API + B2C产品双轨变现，收入来源多元化",
      stat: "2x"
    }
  ];

  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-accent-500/12 rounded-full blur-[140px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          投资亮点总结
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          把握AI多模态时代的核心投资机遇
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.15 }}
              className="glass rounded-2xl p-6 border border-primary-400/30 hover:border-primary-400/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-300">
                  {item.stat}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-secondary leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-10 p-8 rounded-2xl bg-gradient-to-br from-primary-500/25 to-accent-500/25 border border-primary-400/40 text-center"
        >
          <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            携手 MiniMax，共创 AI 未来
          </h3>
          <p className="text-secondary text-lg max-w-2xl mx-auto mb-6">
            加入我们，成为多模态AI时代的核心参与者
          </p>
          <div className="flex justify-center gap-4">
            <span className="px-6 py-3 rounded-xl bg-primary-500/30 text-primary-100 font-medium border border-primary-400/30">
              Series A 融资进行中
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
