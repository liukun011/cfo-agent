import { Icons } from '../../../shared/components/Icons'

export default function ProfileImportPanel({
  investor,
  profileImportTab,
  profileImportText,
  isListeningProfile,
  isImportingProfile,
  profileImportMessage,
  profileFileInputRef,
  selectedProfileFile,
  selectedProfileFilePreview,
  onTabChange,
  onTextChange,
  onVoiceInput,
  onImportText,
  onFileParse,
  onChooseFile,
  onImportSelectedFile,
}) {
  return (
    <div className="import-panel smart-import-panel">
      <div className="import-panel-head">
        <div>
          <strong>选择导入方式</strong>
          <p>{investor ? '用于补充当前机构资料，核对后再保存。' : '用于首次创建本机构资料，导入后进入字段核对。'}</p>
        </div>
        <span className="import-panel-badge">{investor ? '补充资料' : '首次导入'}</span>
      </div>
      <div className="page-tabs" style={{ position: 'static', padding: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-input)' }}>
        <button className={`page-tab ${profileImportTab === 'text' ? 'active' : ''}`} style={{ padding: '10px 0', fontSize: 14, borderBottom: 'none', margin: 0, color: profileImportTab === 'text' ? 'var(--accent)' : 'var(--text-ter)' }} onClick={() => onTabChange('text')} disabled={isImportingProfile}>文本导入</button>
        <button className={`page-tab ${profileImportTab === 'file' ? 'active' : ''}`} style={{ padding: '10px 0', fontSize: 14, borderBottom: 'none', margin: 0, color: profileImportTab === 'file' ? 'var(--accent)' : 'var(--text-ter)' }} onClick={() => onTabChange('file')} disabled={isImportingProfile}>上传文件</button>
      </div>
      {profileImportTab === 'text' ? (
        <div className="import-panel-body">
          <div className="voice-input-shell">
            <textarea
              className="form-textarea voice-input-area"
              rows={6}
              placeholder="请输入或粘贴机构资料..."
              value={profileImportText}
              onChange={e => onTextChange(e.target.value)}
              disabled={isImportingProfile}
            />
            <button
              type="button"
              className={`voice-input-mic ${isListeningProfile ? 'is-listening' : ''}`}
              onClick={onVoiceInput}
              disabled={isImportingProfile}
              aria-label={isListeningProfile ? '停止语音录入' : '开始语音录入'}
            >
              <span>{Icons.mic}</span>
            </button>
          </div>
          <button className="btn-primary btn-full" onClick={onImportText} disabled={!profileImportText.trim() || isImportingProfile}>
            {isImportingProfile ? '导入中...' : '导入资料'}
          </button>
        </div>
      ) : (
        <div className="import-panel-body file-import-body">
          <div className="file-import-icon">{Icons.files}</div>
          <strong>上传 .txt / .md 机构资料</strong>
          <p>支持机构简介、资金偏好、准入要求等内容。</p>
          <input ref={profileFileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" style={{ display: 'none' }} onChange={onFileParse} disabled={isImportingProfile} />
          <button className="btn-outline" onClick={onChooseFile} disabled={isImportingProfile}>
            {selectedProfileFile ? '重新选择文件' : '选择文件'}
          </button>
          {selectedProfileFile && (
            <div className="selected-file-card">
              <div>
                <strong>{selectedProfileFile.name}</strong>
                <p>{selectedProfileFilePreview || '已选择文件，点击下方按钮开始导入。'}</p>
              </div>
              <button className="btn-primary btn-sm" onClick={onImportSelectedFile} disabled={isImportingProfile}>
                {isImportingProfile ? '导入中...' : '开始导入'}
              </button>
            </div>
          )}
        </div>
      )}
      {isImportingProfile && <div className="inline-loading mt-12"><span className="spinner" />{profileImportMessage || '正在整理机构资料...'}</div>}
    </div>
  )
}
