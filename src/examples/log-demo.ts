import Log from '../util/log';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main() {
  Log.setLevel(process.env.DEBUG ? 'debug' : 'info');

  Log.info('服务启动');
  Log.warn('配置项缺失，使用默认值');

  const authLog = Log.scope('auth');
  authLog.info('开始鉴权');
  authLog.debug({ userId: 'u123', roles: ['admin'] });
  const s1 = authLog.spinner('鉴权中');
  await sleep(500);
  Log.spinnerSucceed(s1, '鉴权完成');
  authLog.success('登录成功');

  const syncLog = Log.scope('sync');
  const s2 = syncLog.spinner('同步远端配置');
  await sleep(500);
  Log.spinnerFail(s2, '同步失败');
  syncLog.error(new Error('网络不可达'));

  Log.json({ id: 'p-1', status: 'ready', meta: { size: 10 } }, '资源快照');
  Log.info('初始化完成');
}

main().catch((e) => Log.error(e, 'demo'));
