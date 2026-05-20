import { Icons } from '../../../shared/components/Icons'
import { formatDisplayValue } from '../utils/adminDisplay'

export default function QuestionBankPage({
  questionStatus,
  questionError,
  questions,
  newQuestion,
  editingQuestionId,
  editingQuestionName,
  editingQuestionText,
  editingQuestionSort,
  questionSubmittingId,
  onNewQuestionChange,
  onRefresh,
  onAddQuestion,
  onStartEditQuestion,
  onCancelEditQuestion,
  onEditingQuestionNameChange,
  onEditingQuestionTextChange,
  onEditingQuestionSortChange,
  onSaveQuestionEdit,
  onDeleteQuestion,
  onMoveQuestion,
}) {
  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <h2 className="page-heading">问答题库</h2>
          <p className="page-subtitle">维护企业端对话问题。</p>
        </div>
        <button className="btn-outline btn-sm" onClick={onRefresh} disabled={questionStatus === 'loading'}>刷新</button>
      </div>
      {questionStatus === 'loading' && <div className="inline-loading"><span className="spinner" />正在加载题库...</div>}
      {questionError && (
        <div className="empty-panel error mb-16">
          <strong>题库加载失败</strong>
          <p>{questionError}</p>
          <button className="btn-outline btn-sm" onClick={onRefresh}>重试</button>
        </div>
      )}
      <div className="question-add mb-16">
        <label className="question-add-field">
          <span>字段名称 *</span>
          <input
            className="form-input"
            placeholder="例如：融资用途"
            value={newQuestion.questionName || ''}
            onChange={(e) => onNewQuestionChange({ ...newQuestion, questionName: e.target.value })}
          />
        </label>
        <label className="question-add-field">
          <span>问题描述 *</span>
          <textarea
            className="form-textarea"
            placeholder="例如：请说明本次融资主要用途？"
            value={newQuestion.description || ''}
            onChange={(e) => onNewQuestionChange({ ...newQuestion, description: e.target.value })}
            rows={2}
          />
        </label>
        <p className="question-add-hint">新增后将追加到题库末尾，可用上下移动调整顺序。</p>
        <button
          className="btn-primary btn-sm mt-8"
          onClick={onAddQuestion}
          disabled={!String(newQuestion.questionName || '').trim() || !String(newQuestion.description || '').trim() || questionStatus === 'loading'}
        >
          {Icons.plus} 新增问题
        </button>
      </div>
      {!questionError && questionStatus !== 'loading' && questions.length === 0 ? (
        <div className="empty-panel">
          <strong>暂无对话题目</strong>
          <p>可先新增一条对话问题。</p>
          <button className="btn-outline btn-sm" onClick={onRefresh}>刷新</button>
        </div>
      ) : (
        <div className="question-list">
          {questions.map((q, idx) => (
            <div key={q.id} className={`question-card ${editingQuestionId === q.id ? 'is-editing' : ''}`}>
              <div className="question-header">
                <span className="question-number">问题 {idx + 1}</span>
                <div className="question-header-actions">
                  {editingQuestionId === q.id ? (
                    <>
                      <button className="btn-outline btn-sm" onClick={onCancelEditQuestion} disabled={questionSubmittingId === q.id}>取消</button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => onSaveQuestionEdit(q)}
                        disabled={questionSubmittingId === q.id || !editingQuestionName.trim() || !editingQuestionText.trim()}
                      >
                        {questionSubmittingId === q.id ? '保存中...' : '保存'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-outline btn-sm question-icon-btn question-move-up" aria-label="上移" onClick={() => onMoveQuestion(q, -1)} disabled={Boolean(questionSubmittingId) || idx === 0}>{Icons.chevronDown}</button>
                      <button className="btn-outline btn-sm question-icon-btn" aria-label="下移" onClick={() => onMoveQuestion(q, 1)} disabled={Boolean(questionSubmittingId) || idx === questions.length - 1}>{Icons.chevronDown}</button>
                      <button className="btn-outline btn-sm" onClick={() => onStartEditQuestion(q)} disabled={Boolean(questionSubmittingId)}>编辑</button>
                      <button className="btn-danger btn-sm" onClick={() => onDeleteQuestion(q)} disabled={Boolean(questionSubmittingId)}>
                        {questionSubmittingId === q.id ? '删除中...' : '删除'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editingQuestionId === q.id ? (
                <div className="question-edit-panel">
                  <label className="question-name-field">
                    <span>字段名称 *</span>
                    <input
                      className="form-input"
                      value={editingQuestionName}
                      onChange={(e) => onEditingQuestionNameChange(e.target.value)}
                      placeholder="输入字段名称..."
                      disabled={questionSubmittingId === q.id}
                    />
                  </label>
                  <label className="question-sort-field">
                    <span>排序</span>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      max={questions.length}
                      step="1"
                      value={editingQuestionSort}
                      onChange={(e) => onEditingQuestionSortChange(e.target.value)}
                      disabled={questionSubmittingId === q.id}
                    />
                  </label>
                  <label className="question-description-field">
                    <span>问题描述 *</span>
                    <textarea
                      className="form-textarea question-edit-input"
                      value={editingQuestionText}
                      onChange={(e) => onEditingQuestionTextChange(e.target.value)}
                      rows={3}
                      placeholder="输入问题描述..."
                      disabled={questionSubmittingId === q.id}
                    />
                  </label>
                </div>
              ) : (
                <div className="question-display">
                  <div className="question-name-display">{formatDisplayValue(q.questionName || q.name || q.title)}</div>
                  <p className="question-text">{q.text}</p>
                </div>
              )}
              <span className="question-note">排序 {q.sortOrder ?? q.sort ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
