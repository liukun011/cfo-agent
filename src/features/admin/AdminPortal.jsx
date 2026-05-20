import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../store'
import { deleteQuestion, saveQuestion, updateQuestion } from '../../api'
import { STATUS_COLORS } from '../../config/appConfig'
import {
  loadAdminEnterpriseAnalysis,
  loadAdminEnterpriseDetail,
  loadAdminPortalData,
  loadAdminQuestionBank,
} from '../../services/portalLoaders'
import { Icons } from '../../shared/components/Icons'
import Topbar from '../../shared/components/Topbar'
import Toast from '../../shared/components/Toast'
import { AdminDashboardPage, EnterpriseDetailSummary, ExtendedInfoSection, FormBuilderPage, MatchingRulesPage, QuestionBankPage } from './components'
import {
  formatDisplayValue,
  getCfoVisibleInvestors,
  getLatestQuestionSort,
  normalizeContactStatus,
  summarizeInvestorContacts,
} from './utils/adminDisplay'

export default function AdminPortal({ onLogout, theme, setTheme }) {
  const { state, dispatch } = useAppStore()
  const [page, setPage] = useState('dashboard')
  const [selectedEnterprise, setSelectedEnterprise] = useState(null)
  const [newQuestion, setNewQuestion] = useState({ questionName: '', description: '' })
  const [editingQuestionId, setEditingQuestionId] = useState('')
  const [editingQuestionName, setEditingQuestionName] = useState('')
  const [editingQuestionText, setEditingQuestionText] = useState('')
  const [editingQuestionSort, setEditingQuestionSort] = useState('')
  const [questionSubmittingId, setQuestionSubmittingId] = useState('')
  const [expandedSections, setExpandedSections] = useState({ ext: false })
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [detailState, setDetailState] = useState({ status: 'idle', error: '' })
  const [analysisState, setAnalysisState] = useState({ status: 'idle', error: '' })
  const hasLoadedApiRef = useRef(false)
  const hasLoadedQuestionsRef = useRef(false)
  const detailLoadSeqRef = useRef(0)
  const analysisLoadSeqRef = useRef(0)
  const showToast = useCallback((msg, t = 'success') => setToast({ message: msg, type: t }), [])
  const closeToast = useCallback(() => setToast(null), [])
  const enterprises = state.enterprises

  const loadData = useCallback(async (scope = page) => {
    setLoadError('')
    try {
      await loadAdminPortalData(dispatch, { scope })
    } catch (e) {
      console.log('管理端接口加载失败', e.message)
      setLoadError('企业需求加载失败，请稍后重试')
      showToast('企业需求加载失败，请稍后重试', 'error')
    }
  }, [dispatch, page, showToast])

  const loadQuestions = useCallback(async () => {
    await loadAdminQuestionBank(dispatch)
  }, [dispatch])

  const loadEnterpriseAnalysis = useCallback(async (enterpriseId, seq = analysisLoadSeqRef.current) => {
    setAnalysisState({ status: 'loading', error: '' })
    try {
      await loadAdminEnterpriseAnalysis(dispatch, enterpriseId)
      if (seq !== analysisLoadSeqRef.current) return
      setAnalysisState({ status: 'success', error: '' })
    } catch (e) {
      if (seq !== analysisLoadSeqRef.current) return
      setAnalysisState({ status: 'error', error: e.message || '方案加载失败' })
    }
  }, [dispatch])

  const handleOpenEnterpriseDetail = useCallback(async (enterprise) => {
    const detailSeq = detailLoadSeqRef.current + 1
    detailLoadSeqRef.current = detailSeq
    analysisLoadSeqRef.current += 1
    setSelectedEnterprise(enterprise)
    setExpandedSections({ ext: false })
    setPage('detail')
    setDetailState({ status: 'loading', error: '' })
    setAnalysisState({ status: 'idle', error: '' })

    try {
      const detail = await loadAdminEnterpriseDetail(dispatch, enterprise.id)
      if (detailSeq !== detailLoadSeqRef.current) return
      setSelectedEnterprise(detail)
      setDetailState({ status: 'success', error: '' })
      void loadEnterpriseAnalysis(detail.id, analysisLoadSeqRef.current)
    } catch (e) {
      if (detailSeq !== detailLoadSeqRef.current) return
      setDetailState({ status: 'error', error: e.message || '详情加载失败' })
      setAnalysisState({ status: 'idle', error: '' })
    }
  }, [dispatch, loadEnterpriseAnalysis])

  const handleRetryDetail = useCallback(() => {
    if (!selectedEnterprise) return
    void handleOpenEnterpriseDetail(selectedEnterprise)
  }, [handleOpenEnterpriseDetail, selectedEnterprise])

  useEffect(() => {
    if (hasLoadedApiRef.current) return
    hasLoadedApiRef.current = true
    loadData('dashboard')
  }, [loadData])

  useEffect(() => {
    if (page !== 'questions') return
    if (hasLoadedQuestionsRef.current) return
    hasLoadedQuestionsRef.current = true
    void loadQuestions()
  }, [loadQuestions, page])

  const handleAddQuestion = async () => {
    const questionName = String(newQuestion.questionName || '').trim()
    const description = String(newQuestion.description || '').trim()
    if (!questionName || !description) {
      showToast('请填写字段名称和问题描述', 'error')
      return
    }
    try {
      const latestSort = getLatestQuestionSort(state.questions)
      const payload = {
        questionName,
        description,
        sortOrder: latestSort,
      }
      await saveQuestion(payload)
      setNewQuestion({ questionName: '', description: '' })
      await loadQuestions()
      showToast('已添加')
    } catch (e) {
      showToast('新增问题失败，请稍后重试', 'error')
    }
  }

  const handleStartEditQuestion = useCallback((question) => {
    setEditingQuestionId(question.id)
    setEditingQuestionName(question.questionName || question.name || question.title || '')
    setEditingQuestionText(question.text || '')
    setEditingQuestionSort(String(question.sortOrder ?? question.sort ?? ''))
  }, [])

  const handleCancelEditQuestion = useCallback(() => {
    setEditingQuestionId('')
    setEditingQuestionName('')
    setEditingQuestionText('')
    setEditingQuestionSort('')
  }, [])

  const handleSaveQuestionEdit = async (question) => {
    const questionName = editingQuestionName.trim()
    const description = editingQuestionText.trim()
    const sortOrder = Number(editingQuestionSort)
    if (!question?.id) return
    if (!questionName || !description) {
      showToast('请填写字段名称和问题描述', 'error')
      return
    }
    if (!Number.isFinite(sortOrder)) {
      showToast('请输入有效排序值', 'error')
      return
    }
    if (sortOrder < 1 || sortOrder > (state.questions || []).length) {
      showToast('排序值需在当前题目范围内', 'error')
      return
    }
    try {
      setQuestionSubmittingId(question.id)
      const updatedQuestion = { ...question, questionName, name: questionName, title: questionName, label: questionName, description, text: description }
      const orderedQuestions = reorderQuestionToIndex(
        (state.questions || []).map(item => item.id === question.id ? updatedQuestion : item),
        question.id,
        sortOrder - 1,
      )
      await persistQuestionOrder(orderedQuestions)
      setEditingQuestionId('')
      setEditingQuestionName('')
      setEditingQuestionText('')
      setEditingQuestionSort('')
      await loadQuestions()
      showToast('已保存')
    } catch (e) {
      showToast('保存问题失败，请稍后重试', 'error')
    } finally {
      setQuestionSubmittingId('')
    }
  }

  const handleDeleteQuestion = async (question) => {
    if (!question?.id) return
    if (typeof window !== 'undefined' && !window.confirm('确认删除这条问题？')) return
    try {
      setQuestionSubmittingId(question.id)
      await deleteQuestion(question.id)
      if (editingQuestionId === question.id) {
        setEditingQuestionId('')
        setEditingQuestionName('')
        setEditingQuestionText('')
        setEditingQuestionSort('')
      }
      await loadQuestions()
      showToast('已删除')
    } catch (e) {
      showToast('删除问题失败，请稍后重试', 'error')
    } finally {
      setQuestionSubmittingId('')
    }
  }

  const buildQuestionUpdatePayload = (question, sortOrder = question?.sortOrder ?? question?.sort ?? 0) => ({
    id: question.id,
    questionName: question.questionName || question.name || question.title || `问题 ${question.sort || ''}`.trim(),
    questionType: question.questionType || '',
    sortOrder,
    description: question.description || question.text || '',
  })

  const persistQuestionOrder = async (orderedQuestions) => {
    await Promise.all(orderedQuestions.map((item, index) => updateQuestion(buildQuestionUpdatePayload(item, index + 1))))
  }

  const reorderQuestionToIndex = (questions, questionId, targetIndex) => {
    const currentIndex = questions.findIndex(item => item.id === questionId)
    if (currentIndex < 0) return questions
    const next = [...questions]
    const [moving] = next.splice(currentIndex, 1)
    next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, moving)
    return next
  }

  const handleMoveQuestion = async (question, direction) => {
    const questions = state.questions || []
    const index = questions.findIndex(item => item.id === question?.id)
    const targetIndex = index + direction
    const target = questions[targetIndex]
    if (index < 0 || !target) return
    const orderedQuestions = [...questions]
    const [moving] = orderedQuestions.splice(index, 1)
    orderedQuestions.splice(targetIndex, 0, moving)
    try {
      setQuestionSubmittingId(question.id)
      await persistQuestionOrder(orderedQuestions)
      await loadQuestions()
      showToast('排序已更新')
    } catch (e) {
      showToast('排序更新失败，请稍后重试', 'error')
    } finally {
      setQuestionSubmittingId('')
    }
  }

  const handleBackToDashboard = useCallback(() => {
    setPage('dashboard')
    setDetailState({ status: 'idle', error: '' })
    setAnalysisState({ status: 'idle', error: '' })
  }, [])

  return (
    <div className="portal admin-portal">
      <Topbar
        role="平台管理员"
        theme={theme}
        setTheme={setTheme}
        onLogout={onLogout}
        leftSlot={page === 'detail' ? (
            <button className="topbar-back" onClick={handleBackToDashboard}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>返回</span>
            </button>
        ) : null}
      />

      <main className="main-content">

        {/* ===== 企业需求工作台 ===== */}
        {page === 'dashboard' && (
          <AdminDashboardPage
            isLoading={state.loading}
            loadError={loadError}
            enterprises={enterprises}
            onRefresh={loadData}
            onOpenEnterpriseDetail={handleOpenEnterpriseDetail}
          />
        )}

        {/* ===== 企业需求详情 ===== */}
        {page === 'detail' && selectedEnterprise && (
          <div className="page-content admin-detail-page">
            <EnterpriseDetailSummary enterprise={selectedEnterprise} detailState={detailState} onRetry={handleRetryDetail} />

            <ExtendedInfoSection
              extendedInfo={selectedEnterprise.extendedInfo}
              isExpanded={expandedSections.ext}
              onToggle={() => setExpandedSections(prev => ({ ...prev, ext: !prev.ext }))}
            />

            {renderAdminContactSection({
              enterpriseId: selectedEnterprise.id,
              products: state.enterpriseProducts[selectedEnterprise.id] || [],
              analysisState,
              onRetry: () => void loadEnterpriseAnalysis(selectedEnterprise.id),
            })}
          </div>
        )}

        {/* ===== 问答题库 ===== */}
        {page === 'questions' && (
          <QuestionBankPage
            questionStatus={state.questionStatus}
            questionError={state.questionError}
            questions={state.questions}
            newQuestion={newQuestion}
            onNewQuestionChange={setNewQuestion}
            onRefresh={loadQuestions}
            onAddQuestion={handleAddQuestion}
            editingQuestionId={editingQuestionId}
            editingQuestionName={editingQuestionName}
            editingQuestionText={editingQuestionText}
            editingQuestionSort={editingQuestionSort}
            questionSubmittingId={questionSubmittingId}
            onStartEditQuestion={handleStartEditQuestion}
            onCancelEditQuestion={handleCancelEditQuestion}
            onEditingQuestionNameChange={setEditingQuestionName}
            onEditingQuestionTextChange={setEditingQuestionText}
            onEditingQuestionSortChange={setEditingQuestionSort}
            onSaveQuestionEdit={handleSaveQuestionEdit}
            onDeleteQuestion={handleDeleteQuestion}
            onMoveQuestion={handleMoveQuestion}
          />
        )}

        {/* ===== 表单配置 ===== */}
        {page === 'forms' && (
          <FormBuilderPage
            onSaved={message => showToast(message)}
            onError={message => showToast(message, 'error')}
          />
        )}

        {/* ===== 匹配规则 ===== */}
        {page === 'matchingRules' && (
          <MatchingRulesPage
            onSaved={message => showToast(message)}
            onError={message => showToast(message, 'error')}
          />
        )}

      </main>

      {page !== 'detail' && (
        <nav className="admin-nav">
          <div className="admin-nav-list">
            <button className={`admin-nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>{Icons.briefcase}<span>企业需求</span></button>
            <button className={`admin-nav-item ${page === 'questions' ? 'active' : ''}`} onClick={() => setPage('questions')}>{Icons.tag}<span>问答题库</span></button>
            <button className={`admin-nav-item ${page === 'forms' ? 'active' : ''}`} onClick={() => setPage('forms')}>{Icons.files}<span>表单配置</span></button>
            <button className={`admin-nav-item ${page === 'matchingRules' ? 'active' : ''}`} onClick={() => setPage('matchingRules')}>{Icons.shield}<span>匹配规则</span></button>
          </div>
        </nav>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}

function renderAdminContactSection({ enterpriseId, products, analysisState, onRetry }) {
  const contactSummary = summarizeInvestorContacts(products)
  return (
    <div className="matching-review-block admin-detail-section">
      <div className="admin-detail-section-head admin-detail-section-head-static">
        <div>
          <span className="admin-detail-section-title">融资方案与对接状态</span>
          <p>查看方案结果和当前对接进展。</p>
        </div>
        {contactSummary.total > 0 && <span className="count-pill">{contactSummary.total} 条</span>}
      </div>

      {contactSummary.total > 0 && (
        <div className="status-summary-strip">
          {contactSummary.items.map(item => (
            <div key={item.label} className="status-summary-item">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      )}

      {renderProductReviewSection({
        enterpriseId,
        products,
        analysisState,
        onRetry,
      })}
    </div>
  )
}

function renderProductReviewSection({ enterpriseId, products, analysisState, onRetry }) {
  if (analysisState.status === 'loading' && products.length === 0) {
    return (
      <div className="empty-panel">
        <span className="spinner" />
        <strong className="loading-panel-title">正在加载融资方案</strong>
      </div>
    )
  }

  if (analysisState.status === 'error' && products.length === 0) {
    return (
      <div className="empty-panel error">
        <strong>融资方案加载失败</strong>
        <p>{analysisState.error || '请重试'}</p>
        <button className="btn-outline btn-sm" onClick={onRetry}>重试</button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="empty-panel">
        <strong>暂无融资方案</strong>
        <p>企业生成方案后将在这里展示。</p>
      </div>
    )
  }

  const hasAnyVisibleInvestors = products.some(product => getCfoVisibleInvestors(product).length > 0)

  return (
    <div className="detail-product-section">
      {analysisState.status === 'loading' && products.length > 0 && (
        <div className="inline-loading"><span className="spinner" />正在加载融资方案...</div>
      )}
      {analysisState.status === 'error' && (
        <div className="inline-error-strip">
          <span>方案加载失败，请重试。</span>
          <button className="btn-text" onClick={onRetry}>重试</button>
        </div>
      )}
      {products.map(product => {
        const visibleInvestors = getCfoVisibleInvestors(product)
        return (
          <div key={product.id} className="admin-product-card">
            <div className="admin-product-header">
              <div>
                <span className="admin-product-name">{formatDisplayValue(product.name)}</span>
                <span className="product-tag">{formatDisplayValue(product.tag)}</span>
              </div>
              <span className="score-number-sm">{product.score}分</span>
            </div>
            {!hasAnyVisibleInvestors ? (
              <div className="admin-product-contact-state">
                <span>对接状态</span>
                <strong>未发起</strong>
              </div>
            ) : (
              <div className="admin-investor-list">
                {visibleInvestors.length === 0 ? (
                  <div className="admin-investor-empty compact">
                    <strong>本方案暂未发起对接</strong>
                  </div>
                ) : visibleInvestors.map(inv => (
                  <div key={inv.id} className="admin-investor-item">
                    <div className="admin-investor-info">
                      <span className="inv-name">{formatDisplayValue(inv.name)}</span>
                      <span className="inv-match-rate">{inv.matchRate}%</span>
                      <span className={`badge ${STATUS_COLORS[inv.status] || 'badge-default'}`} style={{ marginTop: 4, alignSelf: 'flex-start' }}>{normalizeContactStatus(inv.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
