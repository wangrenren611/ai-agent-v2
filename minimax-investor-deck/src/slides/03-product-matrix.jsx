import { motion } from 'framer-motion';
import { Brain, Mic, Video, Music, Layers } from 'lucide-react';

export default function Slide03() {
  const productCategories = [
    {
      icon: Brain,
      title: "文本模型",
      products: ["M2-her 角色扮演专家", "M2.1 多语言编程"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Mic,
      title: "语音模型",
      products: ["Speech 2.6 语音智能体", "Speech 02 语音合成"],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Video,
      title: "视频模型",
      products: ["Hailuo 2.3 视频生成", "Media Agent 媒体智能体"],
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Music,
      title: "音乐模型",
      products: ["Music 2.5 音乐生成"],
      color: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-accent-500/8 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          全模态产品矩阵
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          全球唯一同时拥有文本、语音、视频、音乐自研模型的公司
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-4 gap-5 max-w-6xl mx-auto">
          {productCategories.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.15 }}
              className="card-fit glass rounded-2xl p-5 border border-primary-400/30 hover:border-primary-400/50 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 shadow-lg`}>
                <category.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{category.title}</h3>
              <ul className="space-y-2">
                {category.products.map((product, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed">
                    • {product}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Center Core Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary-500/20 via-accent-500/10 to-transparent border border-primary-400/30 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Layers className="w-6 h-6 text-primary-300" />
            <h3 className="text-xl font-bold text-white">统一的多模态创作平台</h3>
          </div>
          <p className="text-secondary max-w-2xl mx-auto">
            从创意构思到素材生成、分镜编排、视频剪辑、配乐配音，全链路端到端覆盖
          </p>
        </motion.div>

        {/* Unique Position */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-6 text-center"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-500/30 to-accent-500/30 border border-primary-400/40">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-primary-100 font-medium">行业唯一：全模态自研能力</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
