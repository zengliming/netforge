import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ServerInstance, ClientInstance, Message } from '../types';

export function useSocket(format: string = 'text') {
  // Server state
  const [serverInstances, setServerInstances] = useState<ServerInstance[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [serverClients, setServerClients] = useState<string[]>([]);
  const [selectedServerClient, setSelectedServerClient] = useState<string | null>(null);
  
  // Client state
  const [clientInstances, setClientInstances] = useState<ClientInstance[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientMessages, setClientMessages] = useState<Message[]>([]);
  
  // Utility function to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log state
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };
  
  // ========== Server handlers ==========
  const handleAddServer = () => {
    const newInstance: ServerInstance = {
      id: generateId(),
      name: `服务端 ${serverInstances.length + 1}`,
      listen: '127.0.0.1:8888',
      status: 'stopped',
    };
    setServerInstances(prev => [...prev, newInstance]);
    setSelectedServerId(newInstance.id);
  };

  const handleDeleteServer = (id: string) => {
    setServerInstances(prev => prev.filter(i => i.id !== id));
    if (selectedServerId === id) setSelectedServerId(null);
  };

  const handleUpdateServer = (id: string, updates: Partial<ServerInstance>) => {
    setServerInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleStartServer = async (id: string) => {
    const instance = serverInstances.find(i => i.id === id);
    if (!instance) return;
    
    try {
      await invoke('start_socket_server', {
        instance_id: id,
        listen: instance.listen,
        format: format,
      });
      setServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`服务端已启动: ${instance.listen}`);
    } catch (e) {
      setServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`服务端启动失败: ${e}`);
    }
  };

  const handleStopServer = async (id: string) => {
    try {
      await invoke('stop_socket_server', { instance_id: id });
      setServerInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      setServerClients([]);
      setSelectedServerClient(null);
      addLog('服务端已停止');
    } catch (e) {
      addLog(`停止服务端失败: ${e}`);
    }
  };

  const handleServerSendMessage = async (message: string, targetClient?: string) => {
    if (!targetClient) return;
    try {
      await invoke('send_socket_data', {
        session_id: targetClient,
        data: message,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      addLog(`发送失败: ${errorMsg}`);
    }
  };

  // ========== Client handlers ==========
  const handleAddClient = () => {
    const newInstance: ClientInstance = {
      id: generateId(),
      name: `客户端 ${clientInstances.length + 1}`,
      server: '127.0.0.1:8888',
      status: 'stopped',
    };
    setClientInstances(prev => [...prev, newInstance]);
    setSelectedClientId(newInstance.id);
  };

  const handleDeleteClient = (id: string) => {
    setClientInstances(prev => prev.filter(i => i.id !== id));
    if (selectedClientId === id) setSelectedClientId(null);
  };

  const handleUpdateClient = (id: string, updates: Partial<ClientInstance>) => {
    setClientInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleConnectClient = async (id: string) => {
    const instance = clientInstances.find(i => i.id === id);
    if (!instance) return;
    
    try {
      await invoke('start_socket_client', {
        instance_id: id,
        server: instance.server,
        format: format,
      });
      setClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`已连接到: ${instance.server}`);
    } catch (e) {
      setClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`连接失败: ${e}`);
    }
  };

  const handleDisconnectClient = async (id: string) => {
    try {
      await invoke('stop_socket_client', { instance_id: id });
      setClientInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      addLog('已断开连接');
    } catch (e) {
      addLog(`断开失败: ${e}`);
    }
  };

  const handleClientSendMessage = async (message: string) => {
    try {
      await invoke('send_client_data', { data: message });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      addLog(`发送失败: ${errorMsg}`);
    }
  };

  return {
    // Server state
    serverInstances,
    selectedServerId,
    serverMessages,
    serverClients,
    selectedServerClient,
    // Client state
    clientInstances,
    selectedClientId,
    clientMessages,
    // Logs
    logs,
    // Server handlers
    handleAddServer,
    handleDeleteServer,
    handleUpdateServer,
    handleStartServer,
    handleStopServer,
    handleServerSendMessage,
    // Client handlers
    handleAddClient,
    handleDeleteClient,
    handleUpdateClient,
    handleConnectClient,
    handleDisconnectClient,
    handleClientSendMessage,
    // State setters
    setSelectedServerId,
    setSelectedServerClient,
    setServerMessages,
    setServerClients,
    setSelectedClientId,
    setClientMessages,
  };
}
