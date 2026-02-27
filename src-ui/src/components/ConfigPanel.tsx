import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './ConfigPanel.css';

interface AppConfig {
  proxyListen?: string;
  proxyTarget?: string;
  socketFormat: string;
}

const defaultConfig: AppConfig = {
  proxyListen: '127.0.0.1:8080',
  proxyTarget: '127.0.0.1:9000',
  socketFormat: 'text',
};

export default function ConfigPanel() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const c = await invoke<AppConfig>('get_config');
      if (c) {
        setConfig({ ...defaultConfig, ...c });
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      await invoke('save_config', { config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setConfig(defaultConfig);
    setError(null);
  }

  return (
    <div className="config-panel">
      <div className="config-form">
        <div className="form-group">
          <label className="text-sm">默认监听地址</label>
          <input
            type="text"
            value={config.proxyListen || ''}
            onChange={(e) => setConfig({ ...config, proxyListen: e.target.value })}
            placeholder="127.0.0.1:8080"
            className="w-full"
          />
        </div>
        <div className="form-group">
          <label className="text-sm">默认目标地址</label>
          <input
            type="text"
            value={config.proxyTarget || ''}
            onChange={(e) => setConfig({ ...config, proxyTarget: e.target.value })}
            placeholder="127.0.0.1:9000"
            className="w-full"
          />
        </div>
        <div className="form-group">
          <label className="text-sm">Socket 默认格式</label>
          <select
            value={config.socketFormat}
            onChange={(e) => setConfig({ ...config, socketFormat: e.target.value })}
            className="w-full"
          >
            <option value="text">Text</option>
            <option value="hex">Hex</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <div className="button-group">
          <button onClick={handleReset} className="btn-secondary">
            重置
          </button>
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
        {saved && <div className="success-message text-sm">配置已保存</div>}
        {error && <div className="error-message text-sm">{error}</div>}
      </div>
    </div>
  );
}
