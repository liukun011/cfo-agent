import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../store'
import { updatePathMatchContactViewStatus } from '../../api'
import { CONTACT_VIEW_STATUS, STATUS_COLORS } from '../../config/appConfig'
import { refreshEnterpriseAnalysis, refreshEnterpriseDetail, saveOrUpdateEnterpriseLead, startEnterpriseAnalysis, startEnterpriseInvestorResolution, updateEnterpriseAfterChat, waitForEnterpriseDetection } from '../../services/enterpriseAnalysis'
import { loadEnterprisePortalData } from '../../services/portalLoaders'
import {
  buildEnterprisePayload,
  buildEnterpriseLeadPayload,
  buildSummaryText,
  getChatAnswers,
} from './enterpriseFlow'
import {
  buildEnterpriseFields,
  getCoreEnterpriseFields,
  getExtendedEnterpriseFields,
  getEnterpriseProducts,
  hasValue,
} from './utils/enterpriseFields'
import { Icons } from '../../shared/components/Icons'
import Topbar from '../../shared/components/Topbar'
import Toast from '../../shared/components/Toast'
import {
  ChatDialog,
  CollectedHomeHero,
  EnterpriseLeadForm,
  EnterpriseInfoSection,
  GenerationStatus,
  IdleHomeHero,
  ProductMatchList,
} from './components'

const REINITIABLE_CONTACT_STATUSES = new Set(['未发起', '待审核', '暂不推送', '暂不接收'])

function canInitiateContact(investor) {
  return REINITIABLE_CONTACT_STATUSES.has(investor?.status || '未发起')
}

function getInitiateContactLabel(investor) {
  return investor?.status === '未发起' || investor?.status === '待审核' || !investor?.status ? '发起对接' : '重新发起对接'
}

function getInvestorStatusText(status) {
  if (status === '待审核' || status === '待确认') return '待资金方确认'
  if (status === '已推送' || status === '已确认') return '已确认'
  if (status === '暂不推送' || status === '暂不接收') return '暂不推送'
  return status || '未发起'
}

function hasResolutionInvestorResults(analysis, pathMatchResultId) {
  if (!pathMatchResultId || !Array.isArray(analysis)) return false
  const selectedPath = analysis.find(route => String(route?.id || '') === String(pathMatchResultId))
  return Array.isArray(selectedPath?.investors) && selectedPath.investors.some(investor => {
    const status = String(investor?.matchStatus || investor?.match_status || '').trim().toUpperCase()
    const score = Number.parseInt(investor?.matchScore ?? investor?.match_score ?? 0, 10) || 0
    const hasInvestor = Boolean(
      (investor?.investorIdCode || investor?.investor_id_code || investor?.investor_id)
      && (investor?.investorName || investor?.investor_name),
    )
    return hasInvestor && score > 0 && (!status || status === 'MATCHED')
  })
}

function getNextActionState({ hasMissingFields, isSupplementChecking, isPlanGenerating, hasGeneratedPlan, canGeneratePlan }) {
  if (isSupplementChecking) return 'checking'
  if (isPlanGenerating) return 'generating'
  if (hasGeneratedPlan) return 'generated'
  if (canGeneratePlan) return 'ready'
  return 'idle'
}

function getGenerationActionCopy(nextActionState, hasMissingFields) {
  const copyMap = {
    checking: {
      title: '正在检查资料完整度',
      desc: '正在整理企业资料。',
      label: '检测中',
      className: 'generation-action-running',
    },
    ready: {
      title: '可生成融资产品',
      desc: '确认资料无误后，点击生成融资产品。',
      label: '可生成',
      className: 'generation-action-ready',
    },
    generating: {
      title: '融资产品生成中',
      desc: '正在生成产品，请稍候。',
      label: '生成中',
      className: 'generation-action-running',
    },
    generated: {
      title: '融资产品已生成',
      desc: '可查看融资产品和匹配机构，并选择发起对接。',
      label: '已生成',
      className: 'generation-action-done',
    },
    failed: {
      title: '融资产品生成失败',
      desc: '请稍后重试，或刷新后查看最新结果。',
      label: '生成失败',
      className: 'generation-action-failed',
    },
    idle: {
      title: '等待生成融资产品',
      desc: '完成采集后即可生成融资产品。',
      label: '待生成',
      className: '',
    },
  }
  return copyMap[nextActionState] || copyMap.idle
}

export default function EnterprisePortal({ onLogout, theme, setTheme }) {
  const { state, dispatch } = useAppStore()
  const [phase, setPhase] = useState('idle')
  const [chatStep, setChatStep] = useState(0)
  const [chatLog, setChatLog] = useState([])
  const [inputText, setInputText] = useState('')
  const [isAnswering, setIsAnswering] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [enterprise, setEnterprise] = useState(null)
  const products = enterprise ? getEnterpriseProducts(state.enterpriseProducts, enterprise.id) : []
  const analysisTaskStatus = String(enterprise?.analysisTaskStatus || '').toUpperCase()
  const importTaskStatus = String(enterprise?.importTaskStatus || '').toUpperCase()
  const hasProducts = products.length > 0
  const hasGeneratedPlan = analysisTaskStatus === 'SUCCESS' || hasProducts
  const isRemotePlanRunning = analysisTaskStatus === 'RUNNING' && !hasProducts
  const enterpriseFields = enterprise ? buildEnterpriseFields(enterprise) : []
  const questions = state.questions
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [showMatching, setShowMatching] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [expandedEnterpriseText, setExpandedEnterpriseText] = useState({})
  const [expandedInvestorReasons, setExpandedInvestorReasons] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCheckingSupplement, setIsCheckingSupplement] = useState(false)
  const [generationPhase, setGenerationPhase] = useState('idle')
  const [generationMessage, setGenerationMessage] = useState('')
  const [analysisPolling, setAnalysisPolling] = useState(null)
  const [resolutionPolling, setResolutionPolling] = useState(null)
  const [resolutionMatchingKey, setResolutionMatchingKey] = useState('')
  const [contactSubmittingKey, setContactSubmittingKey] = useState('')
  const isSupplementChecking = isCheckingSupplement || importTaskStatus === 'RUNNING'
  const isBusy = isSubmitting || isGenerating || isSupplementChecking || isRemotePlanRunning
  const missingFields = enterprise?.missingFields || []
  const hasMissingFields = missingFields.length > 0
  const coreEnterpriseFields = getCoreEnterpriseFields(enterpriseFields)
  const extendedEnterpriseFields = getExtendedEnterpriseFields(enterprise)
  const canGeneratePlan = enterprise && !isSupplementChecking && !isRemotePlanRunning
  const isPlanGenerating = isRemotePlanRunning || isGenerating || Boolean(analysisPolling) || ['submitting', 'polling', 'background'].includes(generationPhase)
  const canShowMatching = showMatching && (hasGeneratedPlan || hasProducts)
  const nextActionState = generationPhase === 'failed'
    ? 'failed'
    : getNextActionState({ hasMissingFields, isSupplementChecking, isPlanGenerating, hasGeneratedPlan, canGeneratePlan })
  const generationAction = getGenerationActionCopy(nextActionState, hasMissingFields)
  const planStepClass = isPlanGenerating ? 'active' : hasGeneratedPlan ? 'done' : canGeneratePlan ? 'active' : ''
  const planStepLabel = isPlanGenerating ? '生成中' : hasGeneratedPlan ? '产品完成' : '生成产品'
  const [toast, setToast] = useState(null)
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)
  const generationSectionRef = useRef(null)
  const hasLoadedApiRef = useRef(false)
  const answerLockRef = useRef(false)
  const matchingCollapsedRef = useRef(false)
  const showToast = useCallback((msg, type) => setToast({ message: msg, type }), [])
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [chatLog])

  useEffect(() => {
    if (phase === 'chatting' && chatStep > 0 && chatStep <= questions.length && !isAnswering) {
      requestAnimationFrame(() => chatInputRef.current?.focus())
    }
  }, [phase, chatStep, questions.length, isAnswering])

  useEffect(() => {
    if (hasLoadedApiRef.current) return
    hasLoadedApiRef.current = true

    loadEnterprisePortalData(dispatch, {
      selectLatestEnterprise: latest => {
        setEnterprise(latest)
        setPhase('collected')
      },
    }).catch(e => {
      console.log('企业端接口加载失败', e.message)
      showToast('企业数据加载失败，请稍后重试', 'error')
    })
  }, [dispatch, showToast])

  useEffect(() => {
    if ((hasGeneratedPlan || hasProducts) && !showMatching && !matchingCollapsedRef.current) {
      setShowMatching(true)
      setShowSummary(false)
    }
  }, [hasGeneratedPlan, hasProducts, hasMissingFields, showMatching])

  useEffect(() => {
    matchingCollapsedRef.current = false
    setExpandedEnterpriseText({})
    setExpandedInvestorReasons({})
    setExpandedProduct(null)
    setShowSummary(false)
  }, [enterprise?.id])

  useEffect(() => {
    if (!enterprise?.id || analysisTaskStatus !== 'RUNNING' || analysisPolling) return
    setGenerationPhase('polling')
    setGenerationMessage('融资产品生成中，请稍候。')
    setAnalysisPolling({ enterpriseId: enterprise.id, taskId: '' })
  }, [enterprise?.id, analysisTaskStatus, analysisPolling])

  useEffect(() => {
    if (!enterprise?.id || importTaskStatus !== 'RUNNING') return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      try {
        const detail = await refreshEnterpriseDetail(enterprise.id, dispatch)
        if (cancelled) return
        setEnterprise(detail)
        if (String(detail.importTaskStatus || '').toUpperCase() !== 'RUNNING') {
          window.clearInterval(timer)
          setIsCheckingSupplement(false)
        }
      } catch {
        // 单次同步失败不影响后续轮询。
      }
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enterprise?.id, importTaskStatus, dispatch])

  useEffect(() => {
    if (!analysisPolling) return undefined
    let cancelled = false
    let attempts = 0

    const pollAnalysis = async () => {
      attempts += 1
      setGenerationPhase(attempts > 8 ? 'background' : 'polling')
      setGenerationMessage(attempts > 8 ? '生成时间较长，可稍后刷新查看。' : '正在刷新生成进度...')
      try {
        const { taskStatus, analysis } = await refreshEnterpriseAnalysis(
          analysisPolling.enterpriseId,
          analysisPolling.taskId,
          dispatch,
          { resultSource: analysisPolling.resultSource || 'stored' },
        )
        if (cancelled) return
        if (analysis) {
          setGenerationPhase('ready')
          setGenerationMessage('融资产品已生成。')
          setAnalysisPolling(null)
          setIsGenerating(false)
          setEnterprise(prev => prev ? { ...prev, analysisTaskStatus: 'SUCCESS' } : prev)
          setShowMatching(true)
          setShowSummary(false)
          showToast('融资产品已生成', 'success')
          return
        }
        if (taskStatus === 'FAILED') {
          setGenerationPhase('failed')
          setGenerationMessage('融资产品生成失败，请稍后重试。')
          setAnalysisPolling(null)
          setIsGenerating(false)
        }
      } catch (e) {
        if (attempts > 3) {
          setGenerationMessage('进度刷新暂时不稳定，可稍后手动刷新。')
        }
      }
    }

    pollAnalysis()
    const timer = window.setInterval(pollAnalysis, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [analysisPolling, dispatch, showToast])

  useEffect(() => {
    if (!resolutionPolling) return undefined
    let cancelled = false
    let attempts = 0

    const pollResolution = async () => {
      attempts += 1
      try {
        const { taskStatus, analysis } = await refreshEnterpriseAnalysis(
          resolutionPolling.enterpriseId,
          resolutionPolling.taskId,
          dispatch,
        )
        if (cancelled) return
        if (hasResolutionInvestorResults(analysis, resolutionPolling.pathMatchResultId)) {
          setResolutionPolling(null)
          setResolutionMatchingKey('')
          setExpandedProduct(resolutionPolling.productId)
          showToast('资金方匹配结果已更新', 'success')
          return
        }
        if (taskStatus === 'FAILED') {
          setResolutionPolling(null)
          setResolutionMatchingKey('')
          showToast('资金方匹配失败，请稍后重试', 'error')
          return
        }
        if (taskStatus === 'SUCCESS' && attempts > 10) {
          setResolutionPolling(null)
          setResolutionMatchingKey('')
          setExpandedProduct(resolutionPolling.productId)
          showToast('该方案暂未匹配到可对接资金方，可稍后重新匹配', 'error')
          return
        }
      } catch (e) {
        if (attempts > 3) showToast('匹配进度同步暂不稳定，请稍后刷新', 'error')
      }
    }

    pollResolution()
    const timer = window.setInterval(pollResolution, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [resolutionPolling, dispatch, showToast])

  const openLeadForm = () => {
    if (isBusy) return
    setPhase('leadForm')
  }

  const startChatSession = useCallback(() => {
    if (questions.length === 0) {
      showToast('对话题库还没有加载到，请稍后再试', 'error')
      return false
    }
    setPhase('chatting')
    setChatLog([
      { role: 'agent', text: `您好！我是 CFO-Agent，将协助您完成融资需求采集。请回答以下 ${questions.length} 个问题，我将为您匹配合适的融资产品。` },
      { role: 'agent', text: `问题 1/${questions.length}：${questions[0].text}` },
    ])
    setChatStep(1)
    setInputText('')
    setIsAnswering(false)
    answerLockRef.current = false
    return true
  }, [questions, showToast])

  const beginChat = useCallback(() => {
    if (isBusy) return
    startChatSession()
  }, [isBusy, startChatSession])

  const handleLeadSubmit = async values => {
    if (isSubmitting) return
    if (questions.length === 0) {
      showToast('对话题库还没有加载到，请稍后再试', 'error')
      return
    }
    setIsSubmitting(true)
    try {
      const savedEnterprise = await saveOrUpdateEnterpriseLead(buildEnterpriseLeadPayload(values), enterprise, dispatch)
      setEnterprise(savedEnterprise)
      startChatSession()
    } catch (e) {
      console.log('企业基础信息保存失败', e)
      showToast('基础信息保存失败，请稍后重试', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const askNextQuestion = useCallback((step) => {
    if (step >= questions.length) { setChatLog(prev => [...prev, { role: 'agent', text: '感谢您的回答！已完成融资需求采集，请保存并查看结果。' }]); setChatStep(questions.length + 1); return }
    setChatLog(prev => [...prev, { role: 'agent', text: `问题 ${step + 1}/${questions.length}：${questions[step].text}` }])
    setChatStep(step + 1)
  }, [questions])

  const sendMessage = () => {
    if (answerLockRef.current || !inputText.trim() || chatStep > questions.length) return
    answerLockRef.current = true
    setIsAnswering(true)
    const text = inputText.trim()
    const currentStep = chatStep
    setInputText('')
    setChatLog(prev => [...prev, { role: 'user', text }])
    setTimeout(() => {
      if (currentStep === questions.length) { setChatLog(prev => [...prev, { role: 'agent', text: '感谢您的回答！已完成融资需求采集，请保存并查看结果。' }]); setChatStep(questions.length + 1) }
      else askNextQuestion(currentStep)
      answerLockRef.current = false
      setIsAnswering(false)
      requestAnimationFrame(() => chatInputRef.current?.focus())
    }, 800)
  }

  const finishChat = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    if (!enterprise?.id) {
      showToast('请先保存基础信息', 'error')
      setPhase('leadForm')
      setIsSubmitting(false)
      return
    }
    const payload = buildEnterprisePayload(questions, getChatAnswers(chatLog), enterprise)
    try {
      const savedEnterprise = await updateEnterpriseAfterChat(enterprise, payload, dispatch)
      setEnterprise(savedEnterprise)
      setPhase('collected')
      setShowMatching(false)
      setShowSummary(false)
      setIsCheckingSupplement(true)
      showToast('采集结果已保存，正在整理企业资料', 'success')

      const detectedEnterprise = await waitForEnterpriseDetection(savedEnterprise.id, dispatch)
      if (detectedEnterprise) {
        setEnterprise(detectedEnterprise)
        if ((detectedEnterprise.missingFields || []).length === 0) {
          showToast('资料检测完成，可生成融资产品', 'success')
        }
      }
    } catch (e) {
      console.log('融资方接口调用失败', e)
      showToast('采集结果保存失败，请稍后重试', 'error')
    } finally {
      setIsCheckingSupplement(false)
      setIsSubmitting(false)
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast('您的浏览器不支持语音识别', 'error'); return }
    setIsListening(true)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.lang = 'zh-CN'
    r.onresult = (e) => { setInputText(prev => prev + e.results[0][0].transcript); setIsListening(false) }
    r.onerror = () => { setIsListening(false); showToast('语音识别失败', 'error') }
    r.onend = () => setIsListening(false)
    r.start()
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isAnswering) sendMessage() } }

  const handleInitiateContact = async (productId, investorId) => {
    const contactKey = `${productId}-${investorId}`
    if (contactSubmittingKey === contactKey) return
    const product = products?.find(p => p.id === productId)
    const investor = product?.matchedInvestors.find(i => i.id === investorId)
    const matchId = investor?.matchId || investor?.raw?.id
    if (!matchId) {
      showToast('缺少资金方匹配记录，暂不能发起对接', 'error')
      return
    }
    try {
      setContactSubmittingKey(contactKey)
      await updatePathMatchContactViewStatus({
        id: matchId,
        contactViewStatus: CONTACT_VIEW_STATUS.PENDING_PLATFORM_REVIEW,
      })
      dispatch({ type: 'INITIATE_CONTACT', payload: { enterpriseId: enterprise.id, productId, investorId } })
      showToast(`已向 ${investor?.name || '资金方'} 发起对接，等待资金方确认`, 'success')
    } catch (e) {
      showToast(`对接申请失败：${e.message}`, 'error')
    } finally {
      setContactSubmittingKey('')
    }
  }

  const handleMatchInvestors = async (product) => {
    const pathMatchResultId = product?.pathMatchResultId || product?.id
    if (!enterprise?.id || !pathMatchResultId || resolutionMatchingKey) return
    try {
      setResolutionMatchingKey(product.id)
      setExpandedProduct(product.id)
      const task = await startEnterpriseInvestorResolution(pathMatchResultId)
      setResolutionPolling({
        enterpriseId: enterprise.id,
        productId: product.id,
        pathMatchResultId,
        taskId: task?.taskId || task?.id || '',
      })
      showToast('已开始匹配该方案下的资金方', 'success')
    } catch (e) {
      setResolutionMatchingKey('')
      showToast(`资金方匹配失败：${e.message}`, 'error')
    }
  }

  const getSummaryText = () => buildSummaryText(enterprise, products)

  const handleGenerateAnalysis = async () => {
    if (!enterprise || isGenerating || !canGeneratePlan) return
    matchingCollapsedRef.current = false
    setIsGenerating(true)
    setShowMatching(true)
    setShowSummary(false)
    setExpandedProduct(null)
    setGenerationPhase('submitting')
    setGenerationMessage('正在生成融资产品...')
    try {
      const targetEnterprise = enterprise
      dispatch({ type: 'CLEAR_ENTERPRISE_PRODUCTS', payload: targetEnterprise.id })
      const task = await startEnterpriseAnalysis(targetEnterprise.id)
      setGenerationPhase('polling')
      setGenerationMessage('已开始生成融资产品。')
      setAnalysisPolling({
        enterpriseId: targetEnterprise.id,
        taskId: task?.taskId || task?.id || '',
        resultSource: 'stored',
      })
      showToast('已开始生成融资产品', 'success')
    } catch (e) {
      setGenerationPhase('failed')
      setGenerationMessage('融资产品生成失败。')
      showToast('融资产品生成失败，请稍后重试', 'error')
      setIsGenerating(false)
    } finally {
    }
  }

  const handleShowGeneratedAnalysis = async () => {
    if (!enterprise) return
    matchingCollapsedRef.current = false
    setShowMatching(true)
    setShowSummary(false)
    if (products.length > 0) return

    setGenerationPhase('background')
    setGenerationMessage('正在加载融资产品...')
    try {
      const { analysis } = await refreshEnterpriseAnalysis(enterprise.id, '', dispatch)
      setGenerationPhase(analysis ? 'ready' : 'background')
      setGenerationMessage(analysis ? '融资产品已更新。' : '暂未获取到产品明细，请稍后刷新。')
      if (!analysis) showToast('产品明细暂未返回，请稍后再试', 'error')
    } catch (e) {
      setGenerationPhase('failed')
      setGenerationMessage('产品明细加载失败。')
      showToast('产品明细加载失败，请稍后重试', 'error')
    }
  }

  const handleRefreshMatchingStatus = async () => {
    if (!enterprise || analysisPolling || resolutionPolling) return
    try {
      const { analysis } = await refreshEnterpriseAnalysis(enterprise.id, '', dispatch, { preserveProductsOnEmpty: true })
      showToast(analysis ? '产品状态已刷新' : '暂未获取到新的产品状态', analysis ? 'success' : 'error')
    } catch (e) {
      showToast('状态刷新失败，请稍后重试', 'error')
    }
  }

  const handleCopySummary = () => {
    navigator.clipboard.writeText(getSummaryText())
      .then(() => showToast('已复制', 'success'), () => showToast('复制失败', 'error'))
  }

  const handleCollapseMatching = () => {
    matchingCollapsedRef.current = true
    setShowMatching(false)
    setShowSummary(false)
    setExpandedProduct(null)
    setExpandedInvestorReasons({})
  }

  const toggleEnterpriseText = (fieldId) => {
    setExpandedEnterpriseText(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  const toggleInvestorReason = (reasonKey) => {
    setExpandedInvestorReasons(prev => ({ ...prev, [reasonKey]: !prev[reasonKey] }))
  }

  const renderEnterpriseFieldValue = (field) => {
    const key = field.id || field.label
    const value = hasValue(field.value) ? String(field.value) : '暂未填写'
    const isLong = value.length > 34
    const isExpanded = Boolean(expandedEnterpriseText[key])
    return (
      <div className="info-value-wrap">
        <p className={`info-text ${isLong && !isExpanded ? 'text-clamp-2' : ''}`}>{value}</p>
        {isLong && (
          <button className={`expand-toggle expand-toggle-inline ${isExpanded ? 'is-open' : ''}`} onClick={() => toggleEnterpriseText(key)}>
            <span>{isExpanded ? '收起' : '查看全文'}</span>
            {Icons.chevronDown}
          </button>
        )}
      </div>
    )
  }

  const renderIdleHome = () => <IdleHomeHero isBusy={isBusy} onStartChat={openLeadForm} />

  const renderLeadForm = () => (
    <EnterpriseLeadForm
      initialValues={enterprise}
      isSubmitting={isSubmitting}
      onBack={() => setPhase(enterprise ? 'collected' : 'idle')}
      onSubmit={handleLeadSubmit}
    />
  )

  const renderCollectedHome = () => (
    <div className="page-content">
      <CollectedHomeHero
        companyName={enterprise.companyName}
        generationActionLabel={generationAction.label}
        isSupplementChecking={isSupplementChecking}
        hasMissingFields={hasMissingFields}
        planStepClass={planStepClass}
        planStepLabel={planStepLabel}
      />

      <EnterpriseInfoSection
        coreEnterpriseFields={coreEnterpriseFields}
        extendedEnterpriseFields={extendedEnterpriseFields}
        isBusy={isBusy}
        renderEnterpriseFieldValue={renderEnterpriseFieldValue}
        onRestartChat={openLeadForm}
      />

      <section className="section panel-section" ref={generationSectionRef}>
        {!canShowMatching ? (
          <div className="generation-action-panel">
            <div className="generation-action-head">
              <div>
                <strong>{generationAction.title}</strong>
                <p>{isPlanGenerating && generationMessage ? generationMessage : generationAction.desc}</p>
              </div>
              <span className={`generation-action-state ${generationAction.className}`}>{generationAction.label}</span>
            </div>
            {(isPlanGenerating || generationPhase === 'failed') && renderGenerationStatus()}
            <div className="generation-action-footer">
              {hasGeneratedPlan && (
                <button className="btn-primary" onClick={handleShowGeneratedAnalysis} disabled={isBusy}>
                  查看融资产品
                </button>
              )}
              <button
                className={hasGeneratedPlan ? 'btn-outline' : 'btn-primary'}
                onClick={handleGenerateAnalysis}
                disabled={isBusy || !canGeneratePlan || isPlanGenerating}
              >
                {isPlanGenerating ? '正在生成产品...' : generationPhase === 'failed' ? '重新生成融资产品' : hasGeneratedPlan ? '重新生成' : '生成融资产品'}
              </button>
            </div>
          </div>
        ) : (
            <div className="matching-section">
              <div className="matching-overview">
                <div className="section-title-row matching-overview-head">
                  <div>
                    <span className="matching-overview-kicker">产品结果</span>
                    <h3 className="section-title" style={{ marginBottom: 0 }}>融资产品与资金方匹配</h3>
                    <p className="section-subtitle">{hasProducts ? `已生成 ${products.length} 个融资产品，选择产品后继续匹配资金方。` : '正在加载产品结果'}</p>
                  </div>
                  <span className="matching-plan-count">{hasProducts ? `${products.length} 个产品` : '加载中'}</span>
                </div>
                <div className="matching-toolbar">
                  <button className={`matching-summary-action ${showSummary ? 'is-open' : ''}`} onClick={() => setShowSummary(prev => !prev)}>
                    <span>融资摘要</span>
                    <strong>{showSummary ? '收起' : '查看'}</strong>
                  </button>
                  <div className="matching-toolbar-actions">
                    <button className="btn-outline btn-sm" onClick={handleRefreshMatchingStatus} disabled={Boolean(analysisPolling || resolutionPolling)}>
                      刷新状态
                    </button>
                    <button className="btn-outline btn-sm" onClick={handleGenerateAnalysis} disabled={isBusy || isPlanGenerating || !canGeneratePlan}>
                      {isPlanGenerating ? '生成中...' : '重新生成'}
                    </button>
                    <button className="btn-text btn-sm" onClick={handleCollapseMatching}>收起</button>
                  </div>
                </div>
              </div>
              {showSummary && (
                <div className="summary-panel-wrap">
                  <div className="material-section">
                    <div className="material-header"><h4>融资需求摘要</h4><button className="btn-text" onClick={handleCopySummary} disabled={isBusy}>复制</button></div>
                    <pre className="material-content">{getSummaryText()}</pre>
                  </div>
                </div>
              )}
              {hasProducts ? renderProductList() : renderGenerationStatus()}
            </div>
        )}
      </section>
    </div>
  )

  const renderGenerationStatus = () => {
    return (
      <GenerationStatus
        isPlanGenerating={isPlanGenerating}
        generationPhase={generationPhase}
        generationMessage={generationMessage}
        hasGeneratedPlan={hasGeneratedPlan}
      />
    )
  }

  const renderProductList = () => (
    <ProductMatchList
      products={products}
      expandedProduct={expandedProduct}
      expandedInvestorReasons={expandedInvestorReasons}
      contactSubmittingKey={contactSubmittingKey}
      resolutionMatchingKey={resolutionMatchingKey}
      statusColors={STATUS_COLORS}
      canInitiateContact={canInitiateContact}
      getInvestorStatusText={getInvestorStatusText}
      getInitiateContactLabel={getInitiateContactLabel}
      onToggleProduct={setExpandedProduct}
      onToggleInvestorReason={toggleInvestorReason}
      onInitiateContact={handleInitiateContact}
      onMatchInvestors={handleMatchInvestors}
    />
  )

  return (
    <div className="portal enterprise-portal">
      <Topbar role="企业用户" theme={theme} setTheme={setTheme} onLogout={onLogout} />
      <main className="main-content">
        {phase === 'idle' && renderIdleHome()}
        {phase === 'leadForm' && renderLeadForm()}
        {phase === 'collected' && enterprise && renderCollectedHome()}
      </main>

      {phase === 'chatting' && (
        <ChatDialog
          enterprise={enterprise}
          questions={questions}
          chatStep={chatStep}
          chatLog={chatLog}
          inputText={inputText}
          setInputText={setInputText}
          isListening={isListening}
          isAnswering={isAnswering}
          isSubmitting={isSubmitting}
          chatEndRef={chatEndRef}
          chatInputRef={chatInputRef}
          onClose={setPhase}
          onVoiceInput={handleVoiceInput}
          onKeyDown={handleKeyDown}
          onSend={sendMessage}
          onFinish={finishChat}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}
