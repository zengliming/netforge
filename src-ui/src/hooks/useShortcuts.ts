import { useEffect } from 'react';

/**
 * 快捷键回调接口
 */
export interface ShortcutCallbacks {
  /** Ctrl+N: 新建实例 */
  onNewInstance?: () => void;
  /** Ctrl+Enter: 发送消息 */
  onSendMessage?: () => void;
  /** Ctrl+S: 保存配置 */
  onSaveConfig?: () => void;
}

/**
 * 键盘快捷键 Hook
 *
 * 使用示例:
 * ```tsx
 * useShortcuts({
 *   onNewInstance: () => console.log('新建实例'),
 *   onSendMessage: () => console.log('发送消息'),
 *   onSaveConfig: () => console.log('保存配置'),
 * });
 * ```
 */
export function useShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查是否按下了 Ctrl 键 (Mac 上是 Cmd 键)
      const modifierKey = event.ctrlKey || event.metaKey;

      if (!modifierKey) {
        return;
      }

      // Ctrl+N: 新建实例
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        callbacks.onNewInstance?.();
      }
      // Ctrl+Enter: 发送消息
      else if (event.key === 'Enter') {
        event.preventDefault();
        callbacks.onSendMessage?.();
      }
      // Ctrl+S: 保存配置
      else if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        callbacks.onSaveConfig?.();
      }
    };

    // 绑定事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数：组件卸载时移除监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callbacks]);
}
