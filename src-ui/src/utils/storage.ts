import { LazyStore } from '@tauri-apps/plugin-store';
import type { ProxyInstance, ServerInstance, ClientInstance, Message } from '../types';

// 持久化状态接口（不包含 status）
interface PersistedState {
  proxyInstances: Omit<ProxyInstance, 'status'>[];
  serverInstances: Omit<ServerInstance, 'status'>[];
  clientInstances: Omit<ClientInstance, 'status'>[];
}

const STORE_FILE = 'netforge-state.json';
let store: LazyStore | null = null;

/**
 * 初始化存储
 */
async function initStore(): Promise<LazyStore> {
  if (!store) {
    store = new LazyStore(STORE_FILE);
  }
  return store;
}

/**
 * 加载持久化状态
 * @returns 包含实例的状态对象，status 统一设置为 'stopped'
 */
export async function loadState(): Promise<{
  proxyInstances: ProxyInstance[];
  serverInstances: ServerInstance[];
  clientInstances: ClientInstance[];
}> {
  try {
    const s = await initStore();
    const state = await s.get<PersistedState>('state');

    if (!state) {
      // 返回默认空状态
      return {
        proxyInstances: [],
        serverInstances: [],
        clientInstances: [],
      };
    }

    // 恢复状态时，将所有实例的 status 重置为 'stopped'
    return {
      proxyInstances: state.proxyInstances.map(p => ({
        ...p,
        status: 'stopped' as const,
      })),
      serverInstances: state.serverInstances.map(s => ({
        ...s,
        status: 'stopped' as const,
      })),
      clientInstances: state.clientInstances.map(c => ({
        ...c,
        status: 'stopped' as const,
      })),
    };
  } catch (error) {
    console.error('加载状态失败:', error);
    // 失败时返回空状态
    return {
      proxyInstances: [],
      serverInstances: [],
      clientInstances: [],
    };
  }
}

/**
 * 保存状态到持久化存储
 * @param proxyInstances 代理实例列表
 * @param serverInstances 服务端实例列表
 * @param clientInstances 客户端实例列表
 */
export async function saveState({
  proxyInstances,
  serverInstances,
  clientInstances,
}: {
  proxyInstances: ProxyInstance[];
  serverInstances: ServerInstance[];
  clientInstances: ClientInstance[];
}): Promise<void> {
  try {
    const s = await initStore();

    // 保存时移除 status 字段（仅持久化配置信息）
    const persistedState: PersistedState = {
      proxyInstances: proxyInstances.map(({ status, ...rest }) => rest),
      serverInstances: serverInstances.map(({ status, ...rest }) => rest),
      clientInstances: clientInstances.map(({ status, ...rest }) => rest),
    };

    await s.set('state', persistedState);
    await s.save();
  } catch (error) {
    console.error('保存状态失败:', error);
    throw error;
  }
}

/**
 * 清空持久化状态
 */
export async function clearState(): Promise<void> {
  try {
    const s = await initStore();
    await s.delete('state');
    await s.save();
  } catch (error) {
    console.error('清空状态失败:', error);
    throw error;
  }
}

/**
 * 加载指定实例的消息
 * @param instanceId 实例 ID
 * @returns 消息列表
 */
export async function loadMessages(instanceId: string): Promise<Message[]> {
  try {
    const s = await initStore();
    const messages = await s.get<Message[]>(`messages:${instanceId}`);
    return messages || [];
  } catch (error) {
    console.error(`加载消息失败 (instanceId: ${instanceId}):`, error);
    return [];
  }
}

/**
 * 保存指定实例的消息
 * @param instanceId 实例 ID
 * @param messages 消息列表
 */
export async function saveMessages(instanceId: string, messages: Message[]): Promise<void> {
  try {
    const s = await initStore();
    // 限制保存最近 100 条消息
    const limitedMessages = messages.slice(-100);
    await s.set(`messages:${instanceId}`, limitedMessages);
    await s.save();
  } catch (error) {
    console.error(`保存消息失败 (instanceId: ${instanceId}):`, error);
    throw error;
  }
}
