import { motion } from 'framer-motion';
import { Medal, Network, Shield, Rocket } from 'lucide-react';

export default function Slide06() {
  const advantages = [
    {
      icon: Medal,
      title: "全模态唯一性",
      desc: "全球唯一同时拥有文本、语音、视频、音乐自研模型的公司",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Network,
      title: "全球领先地位",
      desc: "语音合成全球第一，编程能力对标Claude，多个垂直领域第一",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "技术壁垒深厚",
      desc: "三年角色扮演优化，完整评估体系，Agentic数据合成方法论",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Rocket,
      title: "生态合作伙伴",
      desc: "与LiveKit、Pipecat、Vapi等主流平台深度合作，MCP Server集成主流开发工具",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const partners = [
    "LiveKit", "Pipecat", "Vapi", "Factory AI", "Cline", "RooCode",
    "Haivivi", "Bubble Pal", "Rokid", "Cursor", "Windsurf", "OpenAI"
  ];

  return (
    <div className="slide-page bg-[var(--bg-base)]">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-primary-500/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent-500/10 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-10 mb-8 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-3"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          核心竞争优势
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary"
        >
          技术、产品、市场三重壁垒，构建难以复制的竞争护城河
        </motion.p>
      </header>

      <div className="slide-content relative z-10">
        <div className="grid grid-cols-2 gap-5 max-w-5xl mx-auto">
          {advantages.map((advantage, index) => (
            <motion.div
              key={advantage.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.15 }}
              className="glass rounded-2xl p-6 border border-primary-400/30 hover:border-primary-400/50 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${advantage.color} flex items-center justify-center shrink-0 shadow-lg`}>
                  <advantage.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{advantage.title}</h3>
                  <p className="text-secondary leading-relaxed">{advantage.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partners */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-400/20"
        >
          <h4 className="text-white font-semibold text-center mb-4">生态合作伙伴网络</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {partners.map((partner, index) => (
              <span
                key={partner}
                className="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-200 text-sm border border-primary-400/30"
              >
                {partner}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
