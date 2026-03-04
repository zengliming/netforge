import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { WsServerInstance, WsClientInstance, Message } from '../types';

export function useWebSocket() {
  // WebSocket Server state
  const [wsServerInstances, setWsServerInstances] = useState<WsServerInstance[]>([]);
  const [selectedWsServerId, setSelectedWsServerId] = useState<string | null>(null);
  const [wsServerMessages, setWsServerMessages] = useState<Message[]>([]);
  const [wsServerClients, setWsServerClients] = useState<string[]>([]);
  const [selectedWsServerClient, setSelectedWsServerClient] = useState<string | null>(null);
  
  // WebSocket Client state
  const [wsClientInstances, setWsClientInstances] = useState<WsClientInstance[]>([]);
  const [selectedWsClientId, setSelectedWsClientId] = useState<string | null>(null);
  const [wsClientMessages, setWsClientMessages] = useState<Message[]>([]);
  
  // Utility function to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log state
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };
  
  // ========== WebSocket Server handlers ==========
  const handleAddWsServer = () => {
    const newInstance: WsServerInstance = {
      id: generateId(),
      name: `WS 服务端 ${wsServerInstances.length + 1}`,
      listen: 'ws://127.0.0.1:8080',
      status: 'stopped',
    };
    setWsServerInstances(prev => [...prev, newInstance]);
    setSelectedWsServerId(newInstance.id);
  };

  const handleDeleteWsServer = (id: string) => {
    setWsServerInstances(prev => prev.filter(i => i.id !== id));
    if (selectedWsServerId === id) setSelectedWsServerId(null);
  };

  const handleUpdateWsServer = (id: string, updates: Partial<WsServerInstance>) => {
    setWsServerInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleStartWsServer = async (id: string) => {
    const instance = wsServerInstances.find(i => i.id === id);
    if (!instance) return;
    
    try {
      await invoke('start_ws_server', {
        instance_id: id,
        listen: instance.listen,
      });
      setWsServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`WebSocket 服务端已启动: ${instance.listen}`);
    } catch (e) {
      setWsServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`WebSocket 服务端启动失败: ${e}`);
    }
  };

  const handleStopWsServer = async (id: string) => {
    try {
      await invoke('stop_ws_server', { instance_id: id });
      setWsServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      setWsServerClients([]);
      setSelectedWsServerClient(null);
      addLog('WebSocket 服务端已停止');
    } catch (e) {
      addLog(`停止 WebSocket 服务端失败: ${e}`);
    }
  };

  const handleWsServerSendMessage = async (message: string, targetClient?: string) => {
    if (!targetClient) return;
    try {
      await invoke('send_ws_server_data', {
        session_id: targetClient,
        data: message,
      });
    } catch (e) {
      addLog(`发送失败: ${e}`);
    }
  };

  // ========== WebSocket Client handlers ==========
  const handleAddWsClient = () => {
    const newInstance: WsClientInstance = {
      id: generateId(),
      name: `WS 客户端 ${wsClientInstances.length + 1}`,
      serverUrl: 'ws://127.0.0.1:8080',
      status: 'stopped',
    };
    setWsClientInstances(prev => [...prev, newInstance]);
    setSelectedWsClientId(newInstance.id);
  };

  const handleDeleteWsClient = (id: string) => {
    setWsClientInstances(prev => prev.filter(i => i.id !== id));
    if (selectedWsClientId === id) setSelectedWsClientId(null);
  };

  const handleUpdateWsClient = (id: string, updates: Partial<WsClientInstance>) => {
    setWsClientInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleConnectWsClient = async (id: string) => {
    const instance = wsClientInstances.find(i => i.id === id);
    if (!instance) return;
    
    try {
      await invoke('start_ws_client', {
        instance_id: id,
        server_url: instance.serverUrl,
      });
      setWsClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`已连接到: ${instance.serverUrl}`);
    } catch (e) {
      setWsClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`连接失败: ${e}`);
    }
  };

  const handleDisconnectWsClient = async (id: string) => {
    try {
      await invoke('stop_ws_client', { instance_id: id });
      setWsClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      addLog('已断开连接');
    } catch (e) {
      addLog(`断开失败: ${e}`);
    }
  };

  const handleWsClientSendMessage = async (message: string) => {
    try {
      await invoke('send_ws_client_data', { data: message });
    } catch (e) {
      addLog(`发送失败: ${e}`);
    }
  };

  return {
    // WebSocket Server state
    wsServerInstances,
    selectedWsServerId,
    wsServerMessages,
    wsServerClients,
    selectedWsServerClient,
    // WebSocket Client state
    wsClientInstances,
    selectedWsClientId,
    wsClientMessages,
    // Logs
    logs,
    // WebSocket Server handlers
    handleAddWsServer,
    handleDeleteWsServer,
    handleUpdateWsServer,
    handleStartWsServer,
    handleStopWsServer,
    handleWsServerSendMessage,
    // WebSocket Client handlers
    handleAddWsClient,
    handleDeleteWsClient,
    handleUpdateWsClient,
    handleConnectWsClient,
    handleDisconnectWsClient,
    handleWsClientSendMessage,
    // State setters
    setSelectedWsServerId,
    setSelectedWsServerClient,
    setWsServerMessages,
    setWsServerClients,
    setSelectedWsClientId,
    setWsClientMessages,
  };
}
