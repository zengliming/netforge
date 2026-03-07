import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import InstanceCard from './components/InstanceCard';
import DataPanel from './components/DataPanel';
import LogPanel from './components/LogPanel';
import { Sidebar, type TabType } from './components/Sidebar';
import type { 
  ProxyInstance, 
  ServerInstance, 
  ClientInstance, 
  Connection, 
  Message, 
  DataFormat,
  UdpInstance,
  WsServerInstance,
  WsClientInstance
} from './types';

import { loadState, saveState } from './utils/storage';
import { useShortcuts } from './hooks/useShortcuts';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('proxy');
  
  // Proxy state
  const [proxyInstances, setProxyInstances] = useState<ProxyInstance[]>([]);
  const [selectedProxyId, setSelectedProxyId] = useState<string | null>(null);
  const [proxyConnections, setProxyConnections] = useState<Connection[]>([]);
  
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
  
  // UDP state
  const [udpInstances, setUdpInstances] = useState<UdpInstance[]>([]);
  const [selectedUdpId, setSelectedUdpId] = useState<string | null>(null);
  const [udpMessages, setUdpMessages] = useState<Message[]>([]);
  
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
  
  // Format state
  const [format, setFormat] = useState<DataFormat>('text');
  
  // Logs
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>(() => [
    { message: 'NetForge GUI 已启动', timestamp: Date.now() }
  ]);

  // 防止重复设置监听器
  const listenersSetup = useRef(false);
  const cleanupFns = useRef<(() => void)[]>([]);

  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Setup keyboard shortcuts
  useShortcuts({
    onNewInstance: () => {
      switch (activeTab) {
        case 'proxy': handleAddProxy(); break;
        case 'server': handleAddServer(); break;
        case 'client': handleAddClient(); break;
        case 'udp': handleAddUdp(); break;
        case 'ws-server': handleAddWsServer(); break;
        case 'ws-client': handleAddWsClient(); break;
      }
    },
    onSendMessage: () => {
      // 发送消息快捷键需要配合输入框使用
      addLog('快捷键发送功能需要配合输入框使用');
    },
    onSaveConfig: async () => {
      try {
        const config = await invoke('export_config');
        console.log('导出配置:', config);
        addLog('配置已保存');
      } catch (e) {
        console.error(e);
        addLog('保存配置失败');
      }
    },
  });

  // Add log
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };

  // Setup event listeners (只执行一次)
  useEffect(() => {
    if (listenersSetup.current) return;
    listenersSetup.current = true;
    
    const setupListeners = async () => {
      try {
        // Socket events
        const unlistenSocketClient = await listen<{ client_addr?: string; instance_id: string }>('socket:client_connected', (event) => {
          const clientAddr = event.payload.client_addr;
          if (clientAddr) {
            setServerClients(prev => prev.includes(clientAddr) ? prev : [...prev, clientAddr]);
            addLog(`客户端连接: ${clientAddr}`);
          }
        });

        const unlistenSocketClientDisconnected = await listen<{ client_addr?: string; instance_id: string }>('socket:client_disconnected', (event) => {
          const clientAddr = event.payload.client_addr;
          if (clientAddr) {
            setServerClients(prev => prev.filter(c => c !== clientAddr));
            addLog(`客户端断开: ${clientAddr}`);
          }
        });

        const unlistenSocketData = await listen<{ data: string; direction: string; source: string }>('socket:data', (event) => {
          const { data, direction, source } = event.payload;
          const msg: Message = { direction: direction === 'in' ? 'in' : 'out', type: 'data', content: data, timestamp: Date.now() };
          if (source === 'server') setServerMessages(prev => [...prev, msg]);
          else if (source === 'client') setClientMessages(prev => [...prev, msg]);
        });

        const unlistenSocketConnected = await listen<{ server?: string; instance_id: string }>('socket:connected', (event) => {
          if (event.payload.server) addLog(`已连接到服务器: ${event.payload.server}`);
        });

        const unlistenSocketError = await listen<{ message: string; instance_id?: string }>('socket:error', (event) => {
          addLog(`连接错误: ${event.payload.message}`);
        });

        // Proxy events
        const unlistenConnection = await listen<{ id: string; source: string; target: string }>('proxy:connection', (event) => {
          const { id, source, target } = event.payload;
          setProxyConnections(prev => [...prev, { id, source, target, bytesIn: 0, bytesOut: 0 }]);
          addLog(`代理连接: ${source} -> ${target}`);
        });

        const unlistenData = await listen<{ id: string; bytesFromClient: number; bytesFromServer: number }>('proxy:data', (event) => {
          const { id, bytesFromClient, bytesFromServer } = event.payload;
          setProxyConnections(prev => prev.map(c => c.id === id ? { ...c, bytesIn: c.bytesIn + bytesFromClient, bytesOut: c.bytesOut + bytesFromServer } : c));
        });

        const unlistenClosed = await listen<{ id: string }>('proxy:closed', (event) => {
          setProxyConnections(prev => prev.filter(c => c.id !== event.payload.id));
          addLog(`连接关闭: ${event.payload.id}`);
        });

        // UDP events
        const unlistenUdpData = await listen<{ direction: string; remote_addr: string; data: string }>('udp:data', (event) => {
          const { direction, remote_addr, data } = event.payload;
          setUdpMessages(prev => [...prev, { direction: direction === 'in' ? 'in' : 'out', type: 'data', content: `[${remote_addr}] ${data}`, timestamp: Date.now() }]);
        });

        const unlistenUdpError = await listen<{ message: string }>('udp:error', (event) => {
          addLog(`UDP 错误: ${event.payload.message}`);
        });

        // WebSocket Server events
        const unlistenWsServer = await listen<{ event: string; payload: Record<string, unknown> }>('ws:event', (eventWrapper) => {
          const { event, payload } = eventWrapper.payload;
          if (event === 'ws:client_connected') {
            const clientAddr = (payload.client_addr || payload.session_id) as string;
            if (clientAddr) {
              setWsServerClients(prev => prev.includes(clientAddr) ? prev : [...prev, clientAddr]);
              addLog(`WebSocket 客户端连接: ${clientAddr}`);
            }
          } else if (event === 'ws:client_disconnected') {
            const clientAddr = (payload.client_addr || payload.session_id) as string;
            if (clientAddr) {
              setWsServerClients(prev => prev.filter(c => c !== clientAddr));
              addLog(`WebSocket 客户端断开: ${clientAddr}`);
            }
          } else if (event === 'ws:data') {
            setWsServerMessages(prev => [...prev, { direction: payload.direction === 'out' ? 'out' : 'in', type: 'data', content: (payload.data as string) || '', timestamp: Date.now() }]);
          } else if (event === 'ws:error') {
            addLog(`WebSocket 错误: ${payload.message as string}`);
          }
        });

        // WebSocket Client events
        const unlistenWsClient = await listen<{ event: string; payload: Record<string, unknown> }>('ws:client_event', (eventWrapper) => {
          const { event, payload } = eventWrapper.payload;
          if (event === 'ws:client:connected') addLog('WebSocket 已连接');
          else if (event === 'ws:client:disconnected') addLog('WebSocket 已断开');
          else if (event === 'ws:client:data' || event === 'ws:data') {
            setWsClientMessages(prev => [...prev, { direction: payload.direction === 'out' ? 'out' : 'in', type: 'data', content: (payload.data as string) || '', timestamp: Date.now() }]);
          } else if (event === 'ws:error') addLog(`WebSocket 错误: ${payload.message as string}`);
        });

        cleanupFns.current = [
          unlistenSocketClient, unlistenSocketClientDisconnected, unlistenSocketData, unlistenSocketConnected,
          unlistenSocketError, unlistenConnection, unlistenData, unlistenClosed, unlistenUdpData, unlistenUdpError,
          unlistenWsServer, unlistenWsClient,
        ];
      } catch (e) {
        console.error('[ERROR] Failed to setup event listeners:', e);
        listenersSetup.current = false;
      }
    };
    setupListeners();
    return () => cleanupFns.current.forEach(fn => fn());
  }, []);

  // 加载持久化状态
  useEffect(() => {
    if (isInitialStateLoaded) return;
    const loadInitialState = async () => {
      try {
        const state = await loadState();
        setProxyInstances(state.proxyInstances);
        setServerInstances(state.serverInstances);
        setClientInstances(state.clientInstances);
        setIsInitialStateLoaded(true);
        addLog('已加载保存的状态');
      } catch (error) {
        console.error('加载状态失败:', error);
        setIsInitialStateLoaded(true);
        addLog('加载状态失败');
      }
    };
    loadInitialState();
  }, [isInitialStateLoaded]);

  // 保存状态
  useEffect(() => {
    if (!isInitialStateLoaded) return;
    const save = async () => {
      try {
        await saveState({ proxyInstances, serverInstances, clientInstances });
        addLog('状态已保存');
      } catch (error) {
        console.error('保存状态失败:', error);
        addLog('保存状态失败');
      }
    };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(save, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [proxyInstances, serverInstances, clientInstances, isInitialStateLoaded]);

  // ========== Handlers ==========
  const handleAddProxy = () => {
    const newInstance: ProxyInstance = { id: generateId(), name: `代理 ${proxyInstances.length + 1}`, listen: '127.0.0.1:8080', target: '127.0.0.1:9000', status: 'stopped' };
    setProxyInstances(prev => [...prev, newInstance]);
    setSelectedProxyId(newInstance.id);
  };
  const handleDeleteProxy = (id: string) => {
    setProxyInstances(prev => prev.filter(i => i.id !== id));
    if (selectedProxyId === id) setSelectedProxyId(null);
  };
  const handleUpdateProxy = (id: string, updates: Partial<ProxyInstance>) => {
    setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };
  const handleStartProxy = async (id: string) => {
    const instance = proxyInstances.find(i => i.id === id);
    if (!instance) return;
    try {
      await invoke('start_proxy', { instance_id: id, listen: instance.listen, target: instance.target, tls: false, cert: null, key: null });
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`代理已启动: ${instance.listen} -> ${instance.target}`);
    } catch (e) {
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`代理启动失败: ${e}`);
    }
  };
  const handleStopProxy = async (id: string) => {
    try {
      await invoke('stop_proxy', { instance_id: id });
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      setProxyConnections([]);
      addLog('代理已停止');
    } catch (e) { addLog(`停止代理失败: ${e}`); }
  };

  const handleAddServer = () => {
    const newInstance: ServerInstance = { id: generateId(), name: `服务端 ${serverInstances.length + 1}`, listen: '127.0.0.1:8888', status: 'stopped' };
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
      await invoke('start_socket_server', { instance_id: id, listen: instance.listen, format: format });
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
    } catch (e) { addLog(`停止服务端失败: ${e}`); }
  };
  const handleServerSendMessage = async (message: string, targetClient?: string) => {
    if (!targetClient) return;
    try { await invoke('send_socket_data', { session_id: targetClient, data: message }); } 
    catch (e) { addLog(`发送失败: ${e}`); }
  };

  const handleAddClient = () => {
    const newInstance: ClientInstance = { id: generateId(), name: `客户端 ${clientInstances.length + 1}`, server: '127.0.0.1:8888', status: 'stopped' };
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
      await invoke('start_socket_client', { instance_id: id, server: instance.server, format: format });
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
    } catch (e) { addLog(`断开失败: ${e}`); }
  };
  const handleClientSendMessage = async (message: string) => {
    try { await invoke('send_client_data', { data: message }); } 
    catch (e) { addLog(`发送失败: ${e}`); }
  };

  const handleAddUdp = () => {
    const newInstance: UdpInstance = { id: generateId(), name: `UDP ${udpInstances.length + 1}`, bindAddr: '127.0.0.1:9000', status: 'stopped' };
    setUdpInstances(prev => [...prev, newInstance]);
    setSelectedUdpId(newInstance.id);
  };
  const handleDeleteUdp = (id: string) => {
    setUdpInstances(prev => prev.filter(i => i.id !== id));
    if (selectedUdpId === id) setSelectedUdpId(null);
  };
  const handleUpdateUdp = (id: string, updates: Partial<UdpInstance>) => {
    setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };
  const handleStartUdp = async (id: string) => {
    const instance = udpInstances.find(i => i.id === id);
    if (!instance) return;
    try {
      await invoke('start_udp', { instance_id: id, bind_addr: instance.bindAddr });
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`UDP 已启动: ${instance.bindAddr}`);
    } catch (e) {
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`UDP 启动失败: ${e}`);
    }
  };
  const handleStopUdp = async (id: string) => {
    try {
      await invoke('stop_udp', { instance_id: id });
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      addLog('UDP 已停止');
    } catch (e) { addLog(`停止 UDP 失败: ${e}`); }
  };
  const handleSendUdp = async (id: string, targetAddr: string, data: string) => {
    try {
      await invoke('send_udp', { instance_id: id, target_addr: targetAddr, data: data });
      setUdpMessages(prev => [...prev, { direction: 'out', type: 'data', content: `[${targetAddr}] ${data}`, timestamp: Date.now() }]);
    } catch (e) { addLog(`发送 UDP 失败: ${e}`); }
  };

  const handleAddWsServer = () => {
    const newInstance: WsServerInstance = { id: generateId(), name: `WS 服务端 ${wsServerInstances.length + 1}`, listen: 'ws://127.0.0.1:8080', status: 'stopped' };
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
      await invoke('start_ws_server', { instance_id: id, listen: instance.listen });
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
    } catch (e) { addLog(`停止 WebSocket 服务端失败: ${e}`); }
  };
  const handleWsServerSendMessage = async (message: string, targetClient?: string) => {
    if (!targetClient) return;
    try { await invoke('send_ws_server_data', { session_id: targetClient, data: message }); } 
    catch (e) { addLog(`发送失败: ${e}`); }
  };

  const handleAddWsClient = () => {
    const newInstance: WsClientInstance = { id: generateId(), name: `WS 客户端 ${wsClientInstances.length + 1}`, serverUrl: 'ws://127.0.0.1:8080', status: 'stopped' };
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
      await invoke('start_ws_client', { instance_id: id, server_url: instance.serverUrl });
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
    } catch (e) { addLog(`断开失败: ${e}`); }
  };
  const handleWsClientSendMessage = async (message: string) => {
    try { await invoke('send_ws_client_data', { data: message }); } 
    catch (e) { addLog(`发送失败: ${e}`); }
  };

  return (
    <div className="app flex h-screen">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <div 
        className="left-panel flex flex-col"
        style={{ 
          width: 320, 
          borderRight: '1px solid var(--color-bg-elevated)',
          backgroundColor: 'var(--color-bg-primary)'
        }}
      >
        <div 
          className="instance-header flex items-center justify-between"
          style={{ 
            height: 48, 
            padding: '0 16px',
            borderBottom: '1px solid var(--color-bg-elevated)'
          }}
        >
          <span style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 600 }}>实例列表</span>
          <button 
            onClick={() => {
              switch (activeTab) {
                case 'proxy': handleAddProxy(); break;
                case 'server': handleAddServer(); break;
                case 'client': handleAddClient(); break;
                case 'udp': handleAddUdp(); break;
                case 'ws-server': handleAddWsServer(); break;
                case 'ws-client': handleAddWsClient(); break;
              }
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor: '#1A1A1A',
              border: 'none',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            +
          </button>
        </div>

        <div className="instance-list flex-1" style={{ padding: '8px 0', overflow: 'auto' }}>
          {activeTab === 'proxy' && proxyInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={`${instance.listen} -> ${instance.target}`}
              selected={selectedProxyId === instance.id}
              onSelect={() => setSelectedProxyId(instance.id)}
              onDelete={() => handleDeleteProxy(instance.id)}
            />
          ))}
          {activeTab === 'server' && serverInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={instance.listen}
              selected={selectedServerId === instance.id}
              onSelect={() => setSelectedServerId(instance.id)}
              onDelete={() => handleDeleteServer(instance.id)}
            />
          ))}
          {activeTab === 'client' && clientInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={instance.server}
              selected={selectedClientId === instance.id}
              onSelect={() => setSelectedClientId(instance.id)}
              onDelete={() => handleDeleteClient(instance.id)}
            />
          ))}
          {activeTab === 'udp' && udpInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={instance.bindAddr}
              selected={selectedUdpId === instance.id}
              onSelect={() => setSelectedUdpId(instance.id)}
              onDelete={() => handleDeleteUdp(instance.id)}
            />
          ))}
          {activeTab === 'ws-server' && wsServerInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={instance.listen}
              selected={selectedWsServerId === instance.id}
              onSelect={() => setSelectedWsServerId(instance.id)}
              onDelete={() => handleDeleteWsServer(instance.id)}
            />
          ))}
          {activeTab === 'ws-client' && wsClientInstances.map(instance => (
            <InstanceCard
              key={instance.id}
              name={instance.name}
              status={instance.status}
              info={instance.serverUrl}
              selected={selectedWsClientId === instance.id}
              onSelect={() => setSelectedWsClientId(instance.id)}
              onDelete={() => handleDeleteWsClient(instance.id)}
            />
          ))}
        </div>

        {activeTab === 'server' && selectedServerId && serverInstances.find(i => i.id === selectedServerId)?.status === 'running' && (
          <div className="clients-panel" style={{ padding: '12px 16px', borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              已连接客户端 ({serverClients.length})
            </div>
            {serverClients.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>暂无客户端连接</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {serverClients.map((client) => (
                  <button
                    key={client}
                    onClick={() => setSelectedServerClient(client)}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      textAlign: 'left',
                      backgroundColor: selectedServerClient === client ? 'var(--color-bg-tertiary)' : 'transparent',
                      border: '1px solid',
                      borderColor: selectedServerClient === client ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                      borderRadius: 4,
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ws-server' && selectedWsServerId && wsServerInstances.find(i => i.id === selectedWsServerId)?.status === 'running' && (
          <div className="clients-panel" style={{ padding: '12px 16px', borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              已连接客户端 ({wsServerClients.length})
            </div>
            {wsServerClients.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>暂无客户端连接</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {wsServerClients.map((client) => (
                  <button
                    key={client}
                    onClick={() => setSelectedWsServerClient(client)}
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      textAlign: 'left',
                      backgroundColor: selectedWsServerClient === client ? 'var(--color-bg-tertiary)' : 'transparent',
                      border: '1px solid',
                      borderColor: selectedWsServerClient === client ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                      borderRadius: 4,
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'proxy' && selectedProxyId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = proxyInstances.find(i => i.id === selectedProxyId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>监听地址</label>
                    <input
                      type="text"
                      value={instance.listen}
                      onChange={(e) => handleUpdateProxy(instance.id, { listen: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>目标地址</label>
                    <input
                      type="text"
                      value={instance.target}
                      onChange={(e) => handleUpdateProxy(instance.id, { target: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleStopProxy(instance.id) : handleStartProxy(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '停止' : '启动'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'server' && selectedServerId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = serverInstances.find(i => i.id === selectedServerId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>监听地址</label>
                    <input
                      type="text"
                      value={instance.listen}
                      onChange={(e) => handleUpdateServer(instance.id, { listen: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleStopServer(instance.id) : handleStartServer(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '停止' : '启动'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'client' && selectedClientId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = clientInstances.find(i => i.id === selectedClientId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>服务器地址</label>
                    <input
                      type="text"
                      value={instance.server}
                      onChange={(e) => handleUpdateClient(instance.id, { server: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleDisconnectClient(instance.id) : handleConnectClient(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '断开' : '连接'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'udp' && selectedUdpId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = udpInstances.find(i => i.id === selectedUdpId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>绑定地址</label>
                    <input
                      type="text"
                      value={instance.bindAddr}
                      onChange={(e) => handleUpdateUdp(instance.id, { bindAddr: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleStopUdp(instance.id) : handleStartUdp(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '停止' : '启动'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'ws-server' && selectedWsServerId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = wsServerInstances.find(i => i.id === selectedWsServerId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>监听地址</label>
                    <input
                      type="text"
                      value={instance.listen}
                      onChange={(e) => handleUpdateWsServer(instance.id, { listen: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleStopWsServer(instance.id) : handleStartWsServer(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '停止' : '启动'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'ws-client' && selectedWsClientId && (
          <div className="config-panel" style={{ padding: 16, borderTop: '1px solid var(--color-bg-elevated)', backgroundColor: 'var(--color-bg-primary)' }}>
            {(() => {
              const instance = wsClientInstances.find(i => i.id === selectedWsClientId);
              if (!instance) return null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ color: 'var(--color-text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>服务器地址</label>
                    <input
                      type="text"
                      value={instance.serverUrl}
                      onChange={(e) => handleUpdateWsClient(instance.id, { serverUrl: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: 4,
                        color: 'var(--color-text-primary)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => instance.status === 'running' ? handleDisconnectWsClient(instance.id) : handleConnectWsClient(instance.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: instance.status === 'running' ? '#EF4444' : '#22C55E',
                      color: 'var(--color-bg-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    {instance.status === 'running' ? '断开' : '连接'}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex-1" style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
           <DataPanel
            messages={
              activeTab === 'proxy' ? [] :
              activeTab === 'server' ? serverMessages :
              activeTab === 'client' ? clientMessages :
              activeTab === 'udp' ? udpMessages :
              activeTab === 'ws-server' ? wsServerMessages :
              wsClientMessages
            }
            format={format}
            onFormatChange={setFormat}
            onClear={() => {
              if (activeTab === 'server') setServerMessages([]);
              else if (activeTab === 'client') setClientMessages([]);
              else if (activeTab === 'udp') setUdpMessages([]);
              else if (activeTab === 'ws-server') setWsServerMessages([]);
              else if (activeTab === 'ws-client') setWsClientMessages([]);
            }}
            connectionStats={
              activeTab === 'proxy' ? { active: proxyConnections.length, bytesUp: 0, bytesDown: 0 } :
              undefined
            }
            onSend={
              (activeTab === 'server' && selectedServerClient) ? 
                (msg: string) => handleServerSendMessage(msg, selectedServerClient) :
              activeTab === 'client' ?
                handleClientSendMessage :
              activeTab === 'udp' ?
                undefined : // UDP uses separate send input
              (activeTab === 'ws-server' && selectedWsServerClient) ?
                (msg: string) => handleWsServerSendMessage(msg, selectedWsServerClient) :
              activeTab === 'ws-client' ?
                handleWsClientSendMessage :
              undefined
            }
            sendPlaceholder={
              activeTab === 'udp' ? '输入地址:消息' : '输入消息...'
            }
          />
        </div>

        <div className="log-panel flex-1" style={{ borderTop: '1px solid var(--color-bg-elevated)', padding: 0, minHeight: 200 }}>
          <LogPanel logs={logs} title="日志" />
        </div>
      </main>
    </div>
  );
}

export default App;
