import { Icons } from '../../../shared/components/Icons'

export default function ChatDialog({
  enterprise,
  questions,
  chatStep,
  chatLog,
  inputText,
  setInputText,
  isListening,
  isAnswering,
  isSubmitting,
  chatEndRef,
  chatInputRef,
  onClose,
  onVoiceInput,
  onKeyDown,
  onSend,
  onFinish,
}) {
  return (
    <div className="chat-dialog-overlay">
      <div className="chat-dialog">
        <div className="chat-header">
          <button className="chat-back" onClick={() => onClose(enterprise ? 'collected' : 'idle')}>{Icons.back}</button>
          <span className="chat-header-title">CFO-Agent</span>
          <span className="chat-progress">{Math.min(chatStep, questions.length)}/{questions.length}</span>
        </div>
        <div className="chat-messages">
          {chatLog.map((msg, idx) => (
            <div key={idx} className={`chat-msg ${msg.role}`}>
              {msg.role === 'agent' && <div className="msg-avatar">A</div>}
              <div className="msg-bubble">{msg.text}</div>
              {msg.role === 'user' && <div className="msg-avatar-user">企</div>}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input-bar">
          <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={onVoiceInput} disabled={isAnswering}>{Icons.mic}</button>
          {chatStep <= questions.length ? (
            <>
              <textarea
                ref={chatInputRef}
                className="chat-input"
                placeholder={`问题 ${chatStep}/${questions.length}：输入您的回答...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={isAnswering}
              />
              <button className="send-btn" onClick={onSend} disabled={!inputText.trim() || isAnswering}>{Icons.send}</button>
            </>
          ) : (
            <button className="btn-primary" style={{ flex: 1, borderRadius: 24, padding: '12px 20px' }} onClick={onFinish} disabled={isSubmitting}>
              {Icons.check} {isSubmitting ? '正在整理资料...' : '保存并查看结果'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
