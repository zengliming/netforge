import type { Message } from '../types';

/**
 * 使用正则表达式过滤消息
 * @param messages 消息数组
 * @param pattern 正则表达式字符串
 * @returns 过滤后的消息数组
 */
export function filterMessages(messages: Message[], pattern: string): Message[] {
  // 空模式返回所有消息
  if (!pattern.trim()) {
    return messages;
  }

  try {
    // 创建正则表达式（支持全局匹配）
    const regex = new RegExp(pattern, 'i');
    
    // 过滤匹配的消息
    return messages.filter((msg) => {
      // 在 content 字段中匹配
      return regex.test(msg.content);
    });
  } catch (error) {
    // 无效正则表达式，返回空数组
    console.error('Invalid regex pattern:', error);
    return [];
  }
}
