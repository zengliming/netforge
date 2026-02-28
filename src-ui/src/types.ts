// 通用类型定义

export type InstanceStatus = 'running' | 'stopped' | 'error';

// 代理实例
export interface ProxyInstance {
  id: string;
  name: string;
  listen: string;
  target: string;
  status: InstanceStatus;
}

// 服务端实例
export interface ServerInstance {
  id: string;
  name: string;
  listen: string;
  status: InstanceStatus;
}

// 客户端实例
export interface ClientInstance {
  id: string;
  name: string;
  server: string;
  status: InstanceStatus;
}

// 连接信息
export interface Connection {
  id: string;
  source: string;
  target: string;
  bytesIn: number;
  bytesOut: number;
}

// 消息
export interface Message {
  direction: 'in' | 'out';
  content: string;
  timestamp: number;
}

// 数据格式
export type DataFormat = 'hex' | 'text' | 'json';

// 日志条目
export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
}
