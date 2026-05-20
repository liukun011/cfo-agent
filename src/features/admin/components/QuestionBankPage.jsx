import { Icons } from '../../../shared/components/Icons'
import { formatDisplayValue } from '../utils/adminDisplay'

export default function QuestionBankPage({
  questionStatus,
  questionError,
  questions,
  newQuestion,
  editingQuestionId,
  editingQuestionText,
  editingQuestionSort,
  questionSubmittingId,
  onNewQuestionChange,
  onRefresh,
  onAddQuestion,
  onStartEditQuestion,
  onCancelEditQuestion,
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
        <textarea className="form-textarea" placeholder="输入新问题文案..." value={newQuestion} onChange={(e) => onNewQuestionChange(e.target.value)} rows={2} />
        <p className="question-add-hint">新增后将追加到题库末尾，可用上下移动调整顺序。</p>
        <button className="btn-primary btn-sm mt-8" onClick={onAddQuestion} disabled={!newQuestion.trim() || questionStatus === 'loading'}>{Icons.plus} 新增问题</button>
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
                        disabled={questionSubmittingId === q.id || !editingQuestionText.trim()}
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
                  <textarea
                    className="form-textarea question-edit-input"
                    value={editingQuestionText}
                    onChange={(e) => onEditingQuestionTextChange(e.target.value)}
                    rows={3}
                    placeholder="输入问题文案..."
                    disabled={questionSubmittingId === q.id}
                  />
                </div>
              ) : (
                <p className="question-text">{q.text}</p>
              )}
              <span className="question-note">排序 {q.sortOrder ?? q.sort ?? 0} · {formatDisplayValue(q.note)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
