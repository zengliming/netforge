import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import ProxyTab from './components/ProxyTab';
import ServerTab from './components/ServerTab';
import ClientTab from './components/ClientTab';
import UdpTab from './components/UdpTab';
import WsServerTab from './components/WsServerTab';
import WsClientTab from './components/WsClientTab';
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
import { useTheme } from './hooks/useTheme';
import { useShortcuts } from './hooks/useShortcuts';
import './App.css';

type TabType = 'proxy' | 'server' | 'client' | 'udp' | 'ws-server' | 'ws-client';

function App() {
  // Tab state
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
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([
    { message: 'NetForge GUI 已启动', timestamp: Date.now() }
  ]);

  // 防止重复设置监听器
  const listenersSetup = useRef(false);
  const cleanupFns = useRef<(() => void)[]>([]);

  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { theme, toggleTheme } = useTheme();

  // Setup keyboard shortcuts
  useShortcuts({
    onNewInstance: () => {
      switch (activeTab) {
        case 'proxy':
          handleAddProxy();
          break;
        case 'server':
          handleAddServer();
          break;
        case 'client':
          handleAddClient();
          break;
        case 'udp':
          handleAddUdp();
          break;
        case 'ws-server':
          handleAddWsServer();
          break;
        case 'ws-client':
          handleAddWsClient();
          break;
      }
    },
    onSendMessage: () => {
      // 发送消息快捷键需要配合输入框使用
      // 由于快捷键无法直接获取输入框内容，这里只作为占位符
      // 实际实现时，可以添加一个全局的输入框焦点检测
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
    if (listenersSetup.current) {
      return;
    }
    
    listenersSetup.current = true;
    
    const setupListeners = async () => {
      try {
        // Socket events - 服务端监听客户端连接
        const unlistenSocketClient = await listen<{ client_addr?: string; instance_id: string }>('socket:client_connected', (event) => {
          const clientAddr = event.payload.client_addr;
          if (clientAddr) {
            setServerClients(prev => {
              if (prev.includes(clientAddr)) {
                return prev;
              }
              return [...prev, clientAddr];
            });
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
          const msg: Message = {
            direction: direction === 'in' ? 'in' : 'out',
            content: data,
            timestamp: Date.now(),
          };
          if (source === 'server') {
            setServerMessages(prev => [...prev, msg]);
          } else if (source === 'client') {
            setClientMessages(prev => [...prev, msg]);
          }
        });

        // 客户端自己的连接状态
        const unlistenSocketConnected = await listen<{ server?: string; instance_id: string }>('socket:connected', (event) => {
          if (event.payload.server) {
            addLog(`已连接到服务器: ${event.payload.server}`);
          }
        });

        // Proxy events
        const unlistenConnection = await listen<{ id: string; source: string; target: string }>('proxy:connection', (event) => {
          const { id, source, target } = event.payload;
          setProxyConnections(prev => [...prev, { id, source, target, bytesIn: 0, bytesOut: 0 }]);
          addLog(`代理连接: ${source} -> ${target}`);
        });

        const unlistenData = await listen<{ id: string; bytesFromClient: number; bytesFromServer: number }>('proxy:data', (event) => {
          const { id, bytesFromClient, bytesFromServer } = event.payload;
          setProxyConnections(prev => prev.map(c =>
            c.id === id ? { ...c, bytesIn: c.bytesIn + bytesFromClient, bytesOut: c.bytesOut + bytesFromServer } : c
          ));
        });

        const unlistenClosed = await listen<{ id: string }>('proxy:closed', (event) => {
          setProxyConnections(prev => prev.filter(c => c.id !== event.payload.id));
          addLog(`连接关闭: ${event.payload.id}`);
        });

        // UDP events
        const unlistenUdpData = await listen<{ direction: string; remote_addr: string; data: string }>('udp:data', (event) => {
          const { direction, remote_addr, data } = event.payload;
          const msg: Message = {
            direction: direction === 'in' ? 'in' : 'out',
            content: `[${remote_addr}] ${data}`,
            timestamp: Date.now(),
          };
          setUdpMessages(prev => [...prev, msg]);
        });

        const unlistenUdpError = await listen<{ message: string }>('udp:error', (event) => {
          addLog(`UDP 错误: ${event.payload.message}`);
        });

        // WebSocket Server events - 监听通用 ws:event 并解析内嵌事件
        const unlistenWsServer = await listen<{ event: string; payload: any }>('ws:event', (eventWrapper) => {
          const { event, payload } = eventWrapper.payload;
          
          if (event === 'ws:client_connected') {
            const clientAddr = payload.client_addr || payload.session_id;
            if (clientAddr) {
              setWsServerClients(prev => {
                if (prev.includes(clientAddr)) return prev;
                return [...prev, clientAddr];
              });
              addLog(`WebSocket 客户端连接: ${clientAddr}`);
            }
          } else if (event === 'ws:client_disconnected') {
            const clientAddr = payload.client_addr || payload.session_id;
            if (clientAddr) {
              setWsServerClients(prev => prev.filter(c => c !== clientAddr));
              addLog(`WebSocket 客户端断开: ${clientAddr}`);
            }
          } else if (event === 'ws:data') {
            const msg: Message = {
              direction: payload.direction === 'out' ? 'out' : 'in',
              content: payload.data || '',
              timestamp: Date.now(),
            };
            setWsServerMessages(prev => [...prev, msg]);
          } else if (event === 'ws:error') {
            addLog(`WebSocket 错误: ${payload.message}`);
          }
        });

        // WebSocket Client events
        const unlistenWsClient = await listen<{ event: string; payload: any }>('ws:client_event', (eventWrapper) => {
          const { event, payload } = eventWrapper.payload;
          
          if (event === 'ws:client:connected') {
            addLog('WebSocket 已连接');
          } else if (event === 'ws:client:disconnected') {
            addLog('WebSocket 已断开');
          } else if (event === 'ws:client:data' || event === 'ws:data') {
            const msg: Message = {
              direction: payload.direction === 'out' ? 'out' : 'in',
              content: payload.data || '',
              timestamp: Date.now(),
            };
            setWsClientMessages(prev => [...prev, msg]);

          } else if (event === 'ws:error') {
            addLog(`WebSocket 错误: ${payload.message}`);
          }
        });

        cleanupFns.current = [
          unlistenSocketClient,
          unlistenSocketClientDisconnected,
          unlistenSocketData,
          unlistenSocketConnected,
          unlistenConnection,
          unlistenData,
          unlistenClosed,
          unlistenUdpData,
          unlistenUdpError,
          unlistenWsServer,
          unlistenWsClient,
        ];
      
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error('[ERROR] Failed to setup event listeners:', errorMsg);
        listenersSetup.current = false;
      }
    };
    setupListeners();
    
    return () => {
      cleanupFns.current.forEach(fn => fn());
    };
  }, []); // 空依赖数组，只在挂载时执行一次

  // 加载持久化状态（挂载时执行）
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

  // 保存状态（实例变化时执行，带防抖）
  useEffect(() => {
    if (!isInitialStateLoaded) return;

    const save = async () => {
      try {
        await saveState({
          proxyInstances,
          serverInstances,
          clientInstances,
        });
        addLog('状态已保存');
      } catch (error) {
        console.error('保存状态失败:', error);
        addLog('保存状态失败');
      }
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(save, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [proxyInstances, serverInstances, clientInstances, isInitialStateLoaded]);

  // ========== Proxy handlers ==========
  const handleAddProxy = () => {
    const newInstance: ProxyInstance = {
      id: generateId(),
      name: `代理 ${proxyInstances.length + 1}`,
      listen: '127.0.0.1:8080',
      target: '127.0.0.1:9000',
      status: 'stopped',
    };
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
      await invoke('start_proxy', {
        instance_id: id,
        listen: instance.listen,
        target: instance.target,
        tls: false,
        cert: null,
        key: null,
      });
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
    } catch (e) {
      addLog(`停止代理失败: ${e}`);
    }
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
      // 不在这里添加消息，等后端返回 socket:data 事件后再添加
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
      // 不在这里添加消息，等后端返回 socket:data 事件后再添加
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      addLog(`发送失败: ${errorMsg}`);
    }
  };

  // ========== UDP handlers ==========
  const handleAddUdp = () => {
    const newInstance: UdpInstance = {
      id: generateId(),
      name: `UDP ${udpInstances.length + 1}`,
      bindAddr: '127.0.0.1:9000',
      status: 'stopped',
    };
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
      await invoke('start_udp', {
        instance_id: id,
        bind_addr: instance.bindAddr,
      });
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
    } catch (e) {
      addLog(`停止 UDP 失败: ${e}`);
    }
  };

  const handleSendUdp = async (id: string, targetAddr: string, data: string) => {
    try {
      await invoke('send_udp', {
        instance_id: id,
        target_addr: targetAddr,
        data: data,
      });
      setUdpMessages(prev => [...prev, { direction: 'out', content: `[${targetAddr}] ${data}`, timestamp: Date.now() }]);
    } catch (e) {
      addLog(`发送 UDP 失败: ${e}`);
    }
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
      // 不在这里添加消息，等后端返回 ws:data 事件后再添加
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
      // 不在这里添加消息，等后端返回 ws:data 事件后再添加
    } catch (e) {
      addLog(`发送失败: ${e}`);
    }
  };


  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">NetForge</h1>
        <div className="main-tabs">
          <button
            className={`main-tab ${activeTab === 'proxy' ? 'active' : ''}`}
            onClick={() => setActiveTab('proxy')}
          >
            代理
          </button>
          <button
            className={`main-tab ${activeTab === 'server' ? 'active' : ''}`}
            onClick={() => setActiveTab('server')}
          >
            服务端
          </button>
          <button
            className={`main-tab ${activeTab === 'client' ? 'active' : ''}`}
            onClick={() => setActiveTab('client')}
          >
            客户端
          </button>
          <button
            className={`main-tab ${activeTab === 'udp' ? 'active' : ''}`}
            onClick={() => setActiveTab('udp')}
          >
            UDP
          </button>
          <button
            className={`main-tab ${activeTab === 'ws-server' ? 'active' : ''}`}
            onClick={() => setActiveTab('ws-server')}
          >
            WS 服务端
          </button>
          <button
            className={`main-tab ${activeTab === 'ws-client' ? 'active' : ''}`}
            onClick={() => setActiveTab('ws-client')}
          >
            WS 客户端
          </button>
        </div>
        <div className="header-actions">
          <button className="config-btn" onClick={async () => {
            try {
              const config = await invoke('export_config');
              console.log('导出配置:', config);
              alert('配置已导出');
            } catch (e) { console.error(e); }
          }}>导出</button>
          <button className="config-btn" onClick={async () => {
            try {
              await invoke('import_config', { config: {} });
              alert('配置已导入');
            } catch (e) { console.error(e); }
          }}>导入</button>
          <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="app-content">
        {activeTab === 'proxy' && (
          <ProxyTab
            instances={proxyInstances}
            selectedId={selectedProxyId}
            onSelect={setSelectedProxyId}
            onAdd={handleAddProxy}
            onDelete={handleDeleteProxy}
            connections={proxyConnections}
            onStart={handleStartProxy}
            onStop={handleStopProxy}
            onUpdate={handleUpdateProxy}
          />
        )}
        {activeTab === 'server' && (
          <ServerTab
            instances={serverInstances}
            selectedId={selectedServerId}
            onSelect={setSelectedServerId}
            onAdd={handleAddServer}
            onDelete={handleDeleteServer}
            onUpdate={handleUpdateServer}
            onStart={handleStartServer}
            onStop={handleStopServer}
            messages={serverMessages}
            onSendMessage={handleServerSendMessage}
            format={format}
            onFormatChange={setFormat}
            clients={serverClients}
            selectedClient={selectedServerClient}
            onSelectClient={setSelectedServerClient}
          />
        )}
        {activeTab === 'client' && (
          <ClientTab
            instances={clientInstances}
            selectedId={selectedClientId}
            onSelect={setSelectedClientId}
            onAdd={handleAddClient}
            onDelete={handleDeleteClient}
            onUpdate={handleUpdateClient}
            onConnect={handleConnectClient}
            onDisconnect={handleDisconnectClient}
            messages={clientMessages}
            onSendMessage={handleClientSendMessage}
            format={format}
            onFormatChange={setFormat}
          />
        )}
        {activeTab === 'udp' && (
          <UdpTab
            instances={udpInstances}
            selectedId={selectedUdpId}
            onSelect={setSelectedUdpId}
            onAdd={handleAddUdp}
            onDelete={handleDeleteUdp}
            onUpdate={handleUpdateUdp}
            onStart={handleStartUdp}
            onStop={handleStopUdp}
            onSend={handleSendUdp}
            messages={udpMessages}
            format={format}
            onFormatChange={setFormat}
          />
        )}
        {activeTab === 'ws-server' && (
          <WsServerTab
            instances={wsServerInstances}
            selectedId={selectedWsServerId}
            onSelect={setSelectedWsServerId}
            onAdd={handleAddWsServer}
            onDelete={handleDeleteWsServer}
            onUpdate={handleUpdateWsServer}
            onStart={handleStartWsServer}
            onStop={handleStopWsServer}
            messages={wsServerMessages}
            onSendMessage={handleWsServerSendMessage}
            format={format}
            onFormatChange={setFormat}
            clients={wsServerClients}
            selectedClient={selectedWsServerClient}
            onSelectClient={setSelectedWsServerClient}
          />
        )}
        {activeTab === 'ws-client' && (
          <WsClientTab
            instances={wsClientInstances}
            selectedId={selectedWsClientId}
            onSelect={setSelectedWsClientId}
            onAdd={handleAddWsClient}
            onDelete={handleDeleteWsClient}
            onUpdate={handleUpdateWsClient}
            onConnect={handleConnectWsClient}
            onDisconnect={handleDisconnectWsClient}
            messages={wsClientMessages}
            onSendMessage={handleWsClientSendMessage}
            format={format}
            onFormatChange={setFormat}
          />
        )}
      </div>

      <div className="app-footer">
        <div className="log-area">
          <div className="log-header">日志</div>
          <div className="log-content">
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">
                  [{new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}]
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="status-bar">
          <span className="version">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}

export default App;
