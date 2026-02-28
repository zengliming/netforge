import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import ProxyTab from './components/ProxyTab';
import ServerTab from './components/ServerTab';
import ClientTab from './components/ClientTab';
import type { 
  ProxyInstance, 
  ServerInstance, 
  ClientInstance, 
  Connection, 
  Message, 
  DataFormat 
} from './types';
import './App.css';

type TabType = 'proxy' | 'server' | 'client';

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
  
  // Format state
  const [format, setFormat] = useState<DataFormat>('text');
  
  // Logs
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([
    { message: 'NetForge GUI 已启动', timestamp: Date.now() }
  ]);

  // 防止重复设置监听器
  const listenersSetup = useRef(false);
  const cleanupFns = useRef<(() => void)[]>([]);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add log
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };

  // Setup event listeners (只执行一次)
  useEffect(() => {
    if (listenersSetup.current) {
      console.log('[DEBUG] Listeners already setup, skipping');
      return;
    }
    
    listenersSetup.current = true;
    console.log('[DEBUG] Setting up event listeners...');
    
    const setupListeners = async () => {
      try {
        // Socket events - 服务端监听客户端连接
        const unlistenSocketClient = await listen<{ client_addr?: string; instance_id: string }>('socket:client_connected', (event) => {
          console.log('[DEBUG] socket:client_connected received:', event.payload);
          // 只有服务端收到的客户端连接才有 client_addr
          const clientAddr = event.payload.client_addr;
          if (clientAddr) {
            setServerClients(prev => {
              if (prev.includes(clientAddr)) {
                return prev; // 已存在，不添加
              }
              return [...prev, clientAddr];
            });
            addLog(`客户端连接: ${clientAddr}`);
          }
        });

        const unlistenSocketClientDisconnected = await listen<{ client_addr?: string; instance_id: string }>('socket:client_disconnected', (event) => {
          console.log('[DEBUG] socket:client_disconnected received:', event.payload);
          const clientAddr = event.payload.client_addr;
          if (clientAddr) {
            setServerClients(prev => prev.filter(c => c !== clientAddr));
            addLog(`客户端断开: ${clientAddr}`);
          }
        });

        const unlistenSocketData = await listen<{ data: string; direction: string; source: string }>('socket:data', (event) => {
          console.log('[DEBUG] socket:data received:', event.payload);
          const { data, direction, source } = event.payload;
          const msg: Message = {
            direction: direction === 'in' ? 'in' : 'out',
            content: data,
            timestamp: Date.now(),
          };
          // 根据来源更新对应的消息列表
          if (source === 'server') {
            setServerMessages(prev => [...prev, msg]);
          } else if (source === 'client') {
            setClientMessages(prev => [...prev, msg]);
          }
        });

        // 客户端自己的连接状态
        const unlistenSocketConnected = await listen<{ server?: string; instance_id: string }>('socket:connected', (event) => {
          console.log('[DEBUG] socket:connected received:', event.payload);
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

        cleanupFns.current = [
          unlistenSocketClient,
          unlistenSocketClientDisconnected,
          unlistenSocketData,
          unlistenSocketConnected,
          unlistenConnection,
          unlistenData,
          unlistenClosed,
        ];
        console.log('[DEBUG] All event listeners set up successfully');
      } catch (e) {
        console.error('[ERROR] Failed to setup event listeners:', e);
        listenersSetup.current = false;
      }
    };
    setupListeners();
    
    return () => {
      console.log('[DEBUG] Cleaning up event listeners');
      cleanupFns.current.forEach(fn => fn());
    };
  }, []); // 空依赖数组，只在挂载时执行一次

  // Proxy handlers
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

  // Server handlers
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
      setServerMessages(prev => [...prev, { direction: 'out', content: message, timestamp: Date.now() }]);
    } catch (e) {
      addLog(`发送失败: ${e}`);
    }
  };

  // Client handlers
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
      setClientMessages(prev => [...prev, { direction: 'out', content: message, timestamp: Date.now() }]);
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
