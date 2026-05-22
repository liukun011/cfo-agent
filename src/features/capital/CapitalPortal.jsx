import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../../store'
import { associateInvestorByInvitation, supplementInvestorFile, supplementInvestorJsonText, updateContactViewStatus, uploadInvestorTextFile } from '../../api'
import { HIDDEN_INVESTOR_FIELD_IDS, buildInvestorFieldDrafts } from '../../data/investorFields'
import { CONTACT_VIEW_STATUS, STATUS_COLORS, USER_ROLES } from '../../config/appConfig'
import { loadCapitalPortalData } from '../../services/portalLoaders'
import { getCurrentUserId } from '../../services/authSession'
import {
  flattenTagFormFields,
  getInvestorFilledTagForm,
  getInvestorTagFormOptions,
  getInvestorTagFormSchemaById,
  getTagFormMissingRequiredLabels,
  hydrateInvestorTagFormSchema,
  submitInvestorTagForm,
  updateTagFormFieldValue,
} from '../../services/formSchemaService'
import { Icons } from '../../shared/components/Icons'
import Topbar from '../../shared/components/Topbar'
import Toast from '../../shared/components/Toast'
import { AssociatedInstitutionsTab, LabelMaintenanceTab, OpportunitiesTab } from './components'
import {
  buildInstitutionSummaryItems,
  collectAccessibleInstitutionCodes,
  formatAmountRange,
  formatMaybePercent,
  formatWan,
  getAssociatedSourceText,
  getCurrentInstitution,
  getFriendlyError,
  getInvestorIdSet,
  getPartnerFieldValue,
  hasInvestorFieldChanges,
  isPendingInvestorConfirm,
  isRequestOwnedByCurrentInstitution,
  isSupportedProfileFile,
  normalizeInvestorFields,
  normalizeCapitalOpportunityRequest,
  sortCapitalRequests,
  sortInvestorFieldsForDisplay,
  waitForProfileImportResult,
  waitForProfileSupplementResult,
} from './utils/capitalPortalUtils'

export default function CapitalPortal({ onLogout, theme, setTheme }) {
  const { state, dispatch } = useAppStore()
  const [tab, setTab] = useState('requests')
  const investor = state.currentInvestor
  const visibleRequests = state.capitalRequests
    .map(normalizeCapitalOpportunityRequest)
    .filter(req => req.status === '待确认' || req.status === '已确认')
    .sort(sortCapitalRequests)
  const capitalStatistics = {
    matchedCount: visibleRequests.length,
    contactExchangedCount: visibleRequests.filter(req => req.status === '已确认').length,
    recentMatches: visibleRequests.map(req => ({
      company: req.status === '已确认' ? req.companyName : '',
      amount: formatWan(req.allocatedAmountWan) || formatWan(req.suggestedAmountWan) || req.amount,
      date: req.pushTime,
      score: req.matchRate,
      product: [req.productName || req.routeName || req.product, req.endpointName].filter(Boolean).join(' · '),
      reason: req.matchReason,
      industry: req.fundingPurposeCovered || req.demandType,
      status: req.status === '已确认' ? '已对接' : req.status,
    })),
  }
  const [showStat, setShowStat] = useState(false)
  const [statType, setStatType] = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [labelDrafts, setLabelDrafts] = useState([])
  const [tagFormOptions, setTagFormOptions] = useState([])
  const [selectedTagFormId, setSelectedTagFormId] = useState('')
  const [activeTagFormSchema, setActiveTagFormSchema] = useState(null)
  const [isLoadingTagForms, setIsLoadingTagForms] = useState(false)
  const [isSavingLabels, setIsSavingLabels] = useState(false)
  const [labelSaveNotice, setLabelSaveNotice] = useState('')
  const [profileImportTab, setProfileImportTab] = useState('text')
  const [profileImportText, setProfileImportText] = useState('')
  const [selectedProfileFile, setSelectedProfileFile] = useState(null)
  const [selectedProfileFilePreview, setSelectedProfileFilePreview] = useState('')
  const [isImportingProfile, setIsImportingProfile] = useState(false)
  const [profileImportMessage, setProfileImportMessage] = useState('')
  const [isListeningProfile, setIsListeningProfile] = useState(false)
  const [showProfileImport, setShowProfileImport] = useState(false)
  const [expandedPartnerIds, setExpandedPartnerIds] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [isAssociating, setIsAssociating] = useState(false)
  const [confirmingRequestId, setConfirmingRequestId] = useState('')
  const [expandedRequestIds, setExpandedRequestIds] = useState([])
  const [profileDraftNeedsSave, setProfileDraftNeedsSave] = useState(false)
  const profileFileInputRef = useRef(null)
  const profileRecognitionRef = useRef(null)
  const pendingPreferredInvestorIdRef = useRef('')
  const hasLoadedApiRef = useRef(false)
  const isLoadingDataRef = useRef(false)
  const lastLoadedTabRef = useRef('')
  const tagFormsLoadedRef = useRef(false)
  const showToast = useCallback((msg, type = 'success') => setToast({ message: msg, type }), [])
  const closeToast = useCallback(() => setToast(null), [])

  const loadData = useCallback(async (options = {}) => {
    if (isLoadingDataRef.current) return
    isLoadingDataRef.current = true
    const targetTab = options.tab || tab
    setLoadError('')
    try {
      const pendingPreferredInvestorId = !investor?.id ? pendingPreferredInvestorIdRef.current : ''
      const preferredInvestorId = options.preferredInvestorId || investor?.id || investor?.investorIdCode || pendingPreferredInvestorId
      await loadCapitalPortalData(dispatch, {
        preferredInvestorId,
        requirePreferredInvestor: Boolean(options.requirePreferredInvestor || pendingPreferredInvestorId),
        includeOpportunities: targetTab === 'requests',
      })
    } catch (e) {
      console.log('资金方接口加载失败', e.message)
      const message = getFriendlyError(e, '资金方数据加载失败，请稍后重试')
      setLoadError(message)
      showToast(message, 'error')
    } finally {
      isLoadingDataRef.current = false
    }
  }, [dispatch, investor?.id, investor?.investorIdCode, showToast, tab])

  const selectTagForm = useCallback(async (formId, options = {}) => {
    const target = (options.formOptions || tagFormOptions).find(item => item.id === formId)
    if (!target) return
    setIsLoadingTagForms(true)
    try {
      const schema = await getInvestorTagFormSchemaById(target.id, target.parentId)
      const hydrated = hydrateInvestorTagFormSchema(schema, investor?.fields || labelDrafts, investor)
      setSelectedTagFormId(target.id)
      setActiveTagFormSchema(hydrated)
      setLabelDrafts(flattenTagFormFields(hydrated))
      if (!options.silent) setProfileDraftNeedsSave(true)
      setLabelSaveNotice('')
    } catch (e) {
      showToast(getFriendlyError(e, '表单配置加载失败，请稍后重试'), 'error')
    } finally {
      setIsLoadingTagForms(false)
    }
  }, [investor, labelDrafts, showToast, tagFormOptions])

  const loadTagForms = useCallback(async () => {
    if (isLoadingTagForms) return
    setIsLoadingTagForms(true)
    try {
      const options = await getInvestorTagFormOptions()
      setTagFormOptions(options)
      // 只有当前账号名下的本机构才能作为已填表单读取来源；
      // 本地缓存的旧机构 ID 不能把新建流程拉回修改态。
      const detailId = investor?.id
      if (detailId) {
        try {
          const filled = await getInvestorFilledTagForm(detailId)
          if (filled?.sections?.length) {
            const selectedId = filled.id || options.find(item => item.title === filled.title)?.id || options[0]?.id || ''
            setSelectedTagFormId(selectedId)
            setActiveTagFormSchema(filled)
            setLabelDrafts(flattenTagFormFields(filled))
            setProfileDraftNeedsSave(false)
            return
          }
        } catch (e) {
          console.log('动态表单已填值加载失败', e.message)
        }
      }
      const first = options[0]
      if (first) {
        const schema = await getInvestorTagFormSchemaById(first.id, first.parentId)
        const hydrated = hydrateInvestorTagFormSchema(schema, investor?.fields || labelDrafts, investor)
        setSelectedTagFormId(first.id)
        setActiveTagFormSchema(hydrated)
        setLabelDrafts(flattenTagFormFields(hydrated))
        setProfileDraftNeedsSave(false)
      }
    } catch (e) {
      showToast(getFriendlyError(e, '表单配置加载失败，请稍后重试'), 'error')
    } finally {
      setIsLoadingTagForms(false)
    }
  }, [investor, isLoadingTagForms, labelDrafts, showToast])

  useEffect(() => {
    if (hasLoadedApiRef.current) return
    hasLoadedApiRef.current = true
    lastLoadedTabRef.current = tab
    loadData({ tab })
  }, [loadData, tab])

  useEffect(() => {
    if (!hasLoadedApiRef.current) return
    if (lastLoadedTabRef.current === tab) return
    lastLoadedTabRef.current = tab
    loadData({ tab })
  }, [tab, loadData])

  useEffect(() => {
    setLabelDrafts(buildInvestorFieldDrafts(investor?.fields || []))
    setActiveTagFormSchema(null)
    setSelectedTagFormId('')
    tagFormsLoadedRef.current = false
  }, [investor?.id, investor?.fields])

  useEffect(() => {
    if (tab !== 'labels') return
    if (tagFormsLoadedRef.current && activeTagFormSchema) return
    tagFormsLoadedRef.current = true
    loadTagForms()
  }, [activeTagFormSchema, loadTagForms, tab])

  const handleConfirmRequest = async (req) => {
    const matchId = req.matchId || req.id
    const investorIdCode = req.investorIdCode || currentInstitution?.investorIdCode || currentInstitution?.id || ''
    if (!matchId || !investorIdCode) {
      showToast('缺少匹配记录 ID 或当前机构编码，暂不能确认对接', 'error')
      return
    }
    if (!isPendingInvestorConfirm(req)) {
      showToast('当前状态不需要确认对接', 'error')
      return
    }
    if (!isRequestOwnedByCurrentInstitution(req, currentInstitution, accessibleInstitutionCodes)) {
      showToast('该机会不属于当前机构，无法确认对接', 'error')
      return
    }
    try {
      setConfirmingRequestId(req.id)
      await updateContactViewStatus({
        id: matchId,
        investorIdCode,
        contactViewStatus: CONTACT_VIEW_STATUS.APPROVED,
      })
      showToast('已确认对接', 'success')
      await loadData()
    } catch (e) {
      showToast(getFriendlyError(e, '确认对接失败，请稍后重试'), 'error')
    } finally {
      setConfirmingRequestId('')
    }
  }

  const handleRejectRequest = async (req) => {
    const matchId = req.matchId || req.id
    const investorIdCode = req.investorIdCode || currentInstitution?.investorIdCode || currentInstitution?.id || ''
    if (!matchId || !investorIdCode) {
      showToast('缺少匹配记录 ID 或当前机构编码，暂不能处理对接', 'error')
      return
    }
    if (!isPendingInvestorConfirm(req)) {
      showToast('当前状态不需要处理', 'error')
      return
    }
    if (!isRequestOwnedByCurrentInstitution(req, currentInstitution, accessibleInstitutionCodes)) {
      showToast('该机会不属于当前机构，无法处理', 'error')
      return
    }
    try {
      setConfirmingRequestId(req.id)
      await updateContactViewStatus({
        id: matchId,
        investorIdCode,
        contactViewStatus: CONTACT_VIEW_STATUS.INVESTOR_REJECTED,
      })
      showToast('已暂不接收该对接', 'success')
      await loadData()
    } catch (e) {
      showToast(getFriendlyError(e, '处理失败，请稍后重试'), 'error')
    } finally {
      setConfirmingRequestId('')
    }
  }

  useEffect(() => {
    setShowProfileImport(false)
    if (!investor) {
      setLabelSaveNotice('')
      setSelectedProfileFile(null)
      setSelectedProfileFilePreview('')
      setProfileImportMessage('')
    }
  }, [investor])

  const updateLabelDraft = (fieldId, value) => {
    if (labelSaveNotice) setLabelSaveNotice('')
    if (!profileDraftNeedsSave) setProfileDraftNeedsSave(true)
    setActiveTagFormSchema(schema => {
      if (!schema) return schema
      const next = updateTagFormFieldValue(schema, fieldId, value)
      setLabelDrafts(flattenTagFormFields(next))
      return next
    })
    setLabelDrafts(fields => fields.map(field => (
      (field.id || field.field_id || field.label) === fieldId ? { ...field, value } : field
    )))
  }

  const handleVoiceProfileInput = () => {
    if (isListeningProfile && profileRecognitionRef.current) {
      profileRecognitionRef.current.stop()
      return
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('浏览器不支持语音识别', 'error')
      return
    }
    setIsListeningProfile(true)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    profileRecognitionRef.current = recognition
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = false
    let finalText = ''
    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }
    }
    recognition.onerror = () => {
      setIsListeningProfile(false)
      profileRecognitionRef.current = null
      showToast('语音识别失败', 'error')
    }
    recognition.onend = () => {
      setIsListeningProfile(false)
      profileRecognitionRef.current = null
      if (finalText) {
        setProfileImportText(prev => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${finalText}`)
        showToast('语音识别完成')
      }
    }
    recognition.start()
  }

  const importProfileText = async () => {
    if (!profileImportText.trim() || isImportingProfile) return
    if (investor?.id) {
      await importProfileSupplement({ text: profileImportText.trim() })
      return
    }
    const file = new File([profileImportText], `资金方资料-${Date.now()}.txt`, { type: 'text/plain;charset=utf-8' })
    await importProfileFile(file)
  }

  const handleProfileFileParse = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedProfileFile(file)) {
      showToast('目前仅支持 .txt / .md 格式文件', 'error')
      event.target.value = ''
      return
    }
    setSelectedProfileFile(file)
    setSelectedProfileFilePreview(file.name)
    setProfileImportMessage('文件已选择，请确认后导入。')
    event.target.value = ''
  }

  const importSelectedProfileFile = async () => {
    if (!selectedProfileFile || isImportingProfile) return
    if (investor?.id) {
      await importProfileSupplement({ file: selectedProfileFile })
    } else {
      await importProfileFile(selectedProfileFile)
    }
  }

  const importProfileFile = async file => {
    setIsImportingProfile(true)
    setIsListeningProfile(false)
    setProfileImportMessage('正在导入机构资料...')
    try {
      const knownIds = getInvestorIdSet(state.capitalPartners)
      const result = await uploadInvestorTextFile(file, { userId: getCurrentUserId(), userRole: USER_ROLES.INVESTOR })
      const imported = await waitForProfileImportResult(result, knownIds, setProfileImportMessage)
      const importedFields = normalizeInvestorFields(imported?.investmentField)
      const importedDrafts = importedFields.length > 0 ? buildInvestorFieldDrafts(importedFields) : []
      if (importedFields.length > 0 && activeTagFormSchema) {
        const hydrated = hydrateInvestorTagFormSchema(activeTagFormSchema, importedFields, investor)
        setActiveTagFormSchema(hydrated)
        setLabelDrafts(flattenTagFormFields(hydrated))
      } else if (importedDrafts.length > 0) setLabelDrafts(importedDrafts)
      await loadData()
      if (!activeTagFormSchema && importedDrafts.length > 0) setLabelDrafts(importedDrafts)
      setShowProfileImport(false)
      setProfileDraftNeedsSave(true)
      setLabelSaveNotice('资料已回填，请核对字段后保存。')
      setSelectedProfileFile(null)
      setSelectedProfileFilePreview('')
      setProfileImportMessage('')
      showToast('资料已回填，请核对后保存')
    } catch (e) {
      setProfileImportMessage('')
      showToast(getFriendlyError(e, '机构资料导入失败，请稍后重试'), 'error')
    } finally {
      setIsImportingProfile(false)
    }
  }

  const importProfileSupplement = async ({ text = '', file = null }) => {
    if (!investor?.id) return
    setIsImportingProfile(true)
    setIsListeningProfile(false)
    setProfileImportMessage('正在补充机构资料...')
    try {
      const result = file
        ? await supplementInvestorFile(investor.id, file)
        : await supplementInvestorJsonText(investor.id, text)
      const updatedInvestor = await waitForProfileSupplementResult(result, investor.id, setProfileImportMessage)
      const updatedFields = normalizeInvestorFields(updatedInvestor?.investmentField)
      const updatedDrafts = updatedFields.length > 0 ? buildInvestorFieldDrafts(updatedFields) : []
      if (updatedFields.length > 0 && activeTagFormSchema) {
        const hydrated = hydrateInvestorTagFormSchema(activeTagFormSchema, updatedFields, investor)
        setActiveTagFormSchema(hydrated)
        setLabelDrafts(flattenTagFormFields(hydrated))
      } else if (updatedDrafts.length > 0) setLabelDrafts(updatedDrafts)
      await loadData()
      if (!activeTagFormSchema && updatedDrafts.length > 0) setLabelDrafts(updatedDrafts)
      setShowProfileImport(false)
      setProfileDraftNeedsSave(true)
      setLabelSaveNotice('补充资料已回填，请核对字段后保存。')
      setSelectedProfileFile(null)
      setSelectedProfileFilePreview('')
      setProfileImportMessage('')
      showToast('补充资料已回填，请核对后保存')
    } catch (e) {
      setProfileImportMessage('')
      showToast(getFriendlyError(e, '机构资料补充失败，请稍后重试'), 'error')
    } finally {
      setIsImportingProfile(false)
    }
  }

  const handleBackFromImport = () => {
    setIsListeningProfile(false)
    profileRecognitionRef.current?.stop?.()
    profileRecognitionRef.current = null
    setSelectedProfileFile(null)
    setSelectedProfileFilePreview('')
    setProfileImportMessage('')
    if (investor) {
      setShowProfileImport(false)
    } else {
      setShowProfileImport(false)
    }
  }

  const handleSelectTagForm = (formId) => {
    selectTagForm(formId)
  }

  const visibleLabelDrafts = labelDrafts
    .filter(field => !HIDDEN_INVESTOR_FIELD_IDS.has(field.id))
    .sort(sortInvestorFieldsForDisplay)
  const requiredDrafts = visibleLabelDrafts.filter(field => field.required)
  const missingRequiredLabels = requiredDrafts.filter(field => !String(field.value ?? '').trim()).map(field => field.label)
  const hasLabelChanges = hasInvestorFieldChanges(labelDrafts, investor?.fields || [])
  const dynamicMissingRequiredLabels = activeTagFormSchema ? getTagFormMissingRequiredLabels(activeTagFormSchema) : missingRequiredLabels
  const hasUnsavedLabelWork = hasLabelChanges || profileDraftNeedsSave
  const hasConfiguredInvestorProfile = Boolean(investor)
  const currentInstitution = getCurrentInstitution(investor, state.capitalPartners)
  const accessibleInstitutionCodes = collectAccessibleInstitutionCodes(currentInstitution, state.capitalPartners)
  const associatedInstitutions = currentInstitution?.subInstitutions || []
  const institutionSummaryItems = buildInstitutionSummaryItems(currentInstitution)
  const associatedSourceText = getAssociatedSourceText(currentInstitution)
  const invitationCode = currentInstitution?.invitationCode || ''
  const requiredProgress = requiredDrafts.length
    ? Math.round(((requiredDrafts.length - dynamicMissingRequiredLabels.length) / requiredDrafts.length) * 100)
    : 100
  const canSaveLabels = dynamicMissingRequiredLabels.length === 0
  const saveLabelText = isSavingLabels
    ? '保存中...'
    : investor
      ? (hasUnsavedLabelWork ? '保存修改' : '已保存')
      : dynamicMissingRequiredLabels.length > 0
        ? `还差 ${dynamicMissingRequiredLabels.length} 项`
        : '保存并启用'

  const handleSaveLabels = async () => {
    if (isSavingLabels) return
    if (!canSaveLabels) {
      showToast(`请先补充：${dynamicMissingRequiredLabels.join('、')}`, 'error')
      return
    }
    if (!activeTagFormSchema || !selectedTagFormId) {
      showToast('请先选择表单配置', 'error')
      return
    }
    try {
      setIsSavingLabels(true)
      const listInvestorId = investor?.id || investor?.investorIdCode || ''
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        showToast('登录状态已失效，请重新登录后保存', 'error')
        return
      }
      // /investor/submit uses presence of id to decide update vs create.
      // Do not reuse cached form ids or ids hydrated from an old filled schema after
      // the institution has moved away from the current account.
      const submitInvestorId = investor?.id || ''
      const submitResult = await submitInvestorTagForm({
        id: submitInvestorId,
        categoryId: selectedTagFormId,
        userId: currentUserId,
        userRole: USER_ROLES.INVESTOR,
        sections: activeTagFormSchema.sections || [],
      })
      const savedInvestorId = (
        typeof submitResult === 'string'
          ? submitResult
          : (submitResult?.id || submitResult?.investorId || submitResult?.investor_id)
      ) || submitInvestorId || investor?.id
      let resolvedInvestorId = savedInvestorId
      let savedSchema = activeTagFormSchema
      if (savedInvestorId) {
        try {
          const filled = await getInvestorFilledTagForm(savedInvestorId)
          if (filled?.investorId) resolvedInvestorId = filled.investorId
          if (filled?.sections?.length) savedSchema = filled
        } catch (e) {
          console.log('保存后表单回填刷新失败', e.message)
        }
      }
      const savedDrafts = flattenTagFormFields(savedSchema)
      pendingPreferredInvestorIdRef.current = String(resolvedInvestorId || listInvestorId || '').trim()
      setProfileDraftNeedsSave(false)
      setActiveTagFormSchema(savedSchema)
      if (savedSchema?.id) setSelectedTagFormId(savedSchema.id)
      setLabelDrafts(savedDrafts)
      // submit 返回的是投资机构主键 ID：保存后继续用它刷新本机构、邀请码、对接机会和关联机构。
      await loadData({
        tab: 'labels',
        preferredInvestorId: resolvedInvestorId || listInvestorId || undefined,
        requirePreferredInvestor: Boolean(resolvedInvestorId),
      })
      setActiveTagFormSchema(savedSchema)
      if (savedSchema?.id) setSelectedTagFormId(savedSchema.id)
      setLabelDrafts(savedDrafts)
      setLabelSaveNotice(investor?.id ? '机构标签已保存。' : '机构资料已创建。')
      showToast(investor?.id ? '机构标签已保存' : '机构资料已创建')
    } catch (e) {
      showToast(getFriendlyError(e, '标签保存失败，请稍后重试'), 'error')
    } finally {
      setIsSavingLabels(false)
    }
  }

  const handleInviteCodeChange = (value) => {
    setInviteCode(String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))
  }

  const handleCopyInvitationCode = async () => {
    if (!invitationCode) {
      showToast('当前机构暂无邀请码，请刷新后再试', 'error')
      return
    }
    try {
      await window.navigator.clipboard.writeText(invitationCode)
      showToast('邀请码已复制')
    } catch {
      showToast('复制失败，请手动复制邀请码', 'error')
    }
  }

  const handleAssociateInstitution = async () => {
    if (!currentInstitution?.id) {
      showToast('请先完成本机构资料配置', 'error')
      return
    }
    if (inviteCode.length !== 5) {
      showToast('请输入 5 位机构邀请码', 'error')
      return
    }
    try {
      setIsAssociating(true)
      const activeInstitutionId = currentInstitution.id
      await associateInvestorByInvitation(currentInstitution.id, inviteCode)
      setInviteCode('')
      await loadData({ preferredInvestorId: activeInstitutionId })
      showToast('关联机构已添加')
    } catch (e) {
      showToast(getFriendlyError(e, '关联失败，请稍后重试'), 'error')
    } finally {
      setIsAssociating(false)
    }
  }

  return (
    <div className="portal capital-portal">
      <Topbar role="资金方用户" theme={theme} setTheme={setTheme} onLogout={() => { dispatch({ type: 'LOGOUT' }); onLogout() }} />

      <main className="main-content">
        {/* ===== 对接机会 ===== */}
        {tab === 'requests' && (
          <OpportunitiesTab
            loading={state.loading}
            statistics={capitalStatistics}
            opportunityErrors={state.capitalOpportunityErrors}
            loadError={loadError}
            investor={investor}
            hasConfiguredProfile={hasConfiguredInvestorProfile}
            visibleRequests={visibleRequests}
            confirmingRequestId={confirmingRequestId}
            formatWan={formatWan}
            formatMaybePercent={formatMaybePercent}
            onRefresh={() => loadData()}
            onConfigureLabels={() => setTab('labels')}
            onOpenStat={(type) => { setStatType(type); setShowStat(true) }}
            onConfirmRequest={handleConfirmRequest}
            onRejectRequest={handleRejectRequest}
            expandedRequestIds={expandedRequestIds}
            onToggleExpandedRequest={(requestId) => setExpandedRequestIds(prev => (
              prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
            ))}
          />
        )}

        {/* ===== Tab 2: 标签维护 ===== */}
        {tab === 'labels' && (
          <LabelMaintenanceTab
            investor={investor}
            labelSaveNotice={labelSaveNotice}
            hasUnsavedLabelWork={hasUnsavedLabelWork}
            canSaveLabels={canSaveLabels}
            missingRequiredLabels={dynamicMissingRequiredLabels}
            isSavingLabels={isSavingLabels}
            loading={state.loading}
            requiredProgress={requiredProgress}
            saveLabelText={saveLabelText}
            visibleLabelDrafts={visibleLabelDrafts}
            formSchema={activeTagFormSchema}
            formOptions={tagFormOptions}
            selectedFormId={selectedTagFormId}
            isLoadingTagForms={isLoadingTagForms}
            onSaveLabels={handleSaveLabels}
            onUpdateLabelDraft={updateLabelDraft}
            onSelectForm={handleSelectTagForm}
          />
        )}

        {/* ===== 关联机构 ===== */}
        {tab === 'partners' && (
          <AssociatedInstitutionsTab
            currentInstitution={currentInstitution}
            hasConfiguredProfile={hasConfiguredInvestorProfile}
            invitationCode={invitationCode}
            institutionSummaryItems={institutionSummaryItems}
            associatedSourceText={associatedSourceText}
            associatedInstitutions={associatedInstitutions}
            inviteCode={inviteCode}
            isAssociating={isAssociating}
            loading={state.loading}
            expandedPartnerIds={expandedPartnerIds}
            hiddenFieldIds={HIDDEN_INVESTOR_FIELD_IDS}
            formatAmountRange={formatAmountRange}
            getPartnerFieldValue={getPartnerFieldValue}
            onRefresh={() => loadData()}
            onConfigureLabels={() => setTab('labels')}
            onCopyInvitationCode={handleCopyInvitationCode}
            onInviteCodeChange={handleInviteCodeChange}
            onAssociateInstitution={handleAssociateInstitution}
            onTogglePartner={(partnerId) => setExpandedPartnerIds(prev => (
              prev.includes(partnerId)
                ? prev.filter(id => id !== partnerId)
                : [...prev, partnerId]
            ))}
          />
        )}
      </main>

      {/* 底部导航 */}
      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>{Icons.briefcase}<span>对接机会</span></button>
        <button className={`nav-item ${tab === 'labels' ? 'active' : ''}`} onClick={() => setTab('labels')}>{Icons.tag}<span>标签维护</span></button>
        <button className={`nav-item ${tab === 'partners' ? 'active' : ''}`} onClick={() => setTab('partners')}>{Icons.building}<span>关联机构</span></button>
      </nav>

      {/* 统计明细弹层 */}
      {showStat && (
        <div className="modal-overlay-center" onClick={() => { setShowStat(false); setSelectedMatch(null) }}>
          <div className="modal-center-premium" onClick={e => e.stopPropagation()}>
            <div className="modal-center-premium-hd">
              <h4>{selectedMatch ? selectedMatch.company : (statType === 'matched' ? '对接需求' : '已确认对接')}</h4>
              <button className="modal-close-btn" onClick={() => { setShowStat(false); setSelectedMatch(null) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-center-premium-bd">
              {!selectedMatch ? (
                statType === 'matched' ? (
                  /* 匹配明细 - 完全脱敏 */
                  capitalStatistics.recentMatches.length === 0 ? (
                    <div className="empty-panel modal-empty"><strong>暂无对接需求</strong><p>可稍后刷新查看。</p></div>
                  ) : capitalStatistics.recentMatches.map((item, idx) => (
                    <div key={idx} className="modal-premium-item" style={{ cursor: 'default' }}>
                      <div className="modal-premium-item-info">
                        <span className="modal-premium-item-name" style={{ color: 'var(--text-ter)' }}>{item.industry}</span>
                        <span className="modal-premium-item-meta">{item.amount} · {item.date}</span>
                      </div>
                      <span className="modal-premium-item-score">{item.score}%</span>
                    </div>
                  ))
                ) : (
                  /* 对接明细 - 只显示已确认企业 */
                  capitalStatistics.recentMatches.filter(item => item.status === '已确认' || item.status === '已对接').length === 0 ? (
                    <div className="empty-panel modal-empty"><strong>暂无已确认记录</strong><p>可稍后刷新查看。</p></div>
                  ) : capitalStatistics.recentMatches.filter(item => item.status === '已确认' || item.status === '已对接').map((item, idx) => (
                    <div key={idx} className="modal-premium-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedMatch(item)}>
                      <div className="modal-premium-item-info">
                        <span className="modal-premium-item-name">{item.company}</span>
                        <span className="modal-premium-item-meta">{item.amount} · {item.date} · {item.product}</span>
                      </div>
                      <span className="modal-premium-item-score">{item.score}%</span>
                    </div>
                  ))
                )
              ) : (
                /* 详情视图 */
                <div style={{ padding: 20 }}>
                  <button className="btn-text" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setSelectedMatch(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    返回列表
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h6M9 18h4"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{selectedMatch.company}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-ter)', marginTop: 2 }}>{selectedMatch.industry}</div>
                    </div>
                    <span className="match-score" style={{ fontSize: 20 }}>{selectedMatch.score}%</span>
                  </div>
                  <div className="info-card" style={{ marginBottom: 12 }}>
                    <div className="info-row"><span className="info-label">融资金额</span><span className="info-value">{selectedMatch.amount}</span></div>
                    <div className="info-row"><span className="info-label">金融产品</span><span className="info-value">{selectedMatch.product}</span></div>
                    <div className="info-row"><span className="info-label">对接时间</span><span className="info-value">{selectedMatch.date}</span></div>
                    <div className="info-row"><span className="info-label">当前状态</span><span className="info-value" style={{ color: 'var(--success)' }}>{selectedMatch.status}</span></div>
                    <div className="info-row info-row-vertical"><span className="info-label">匹配原因</span><p className="info-text">{selectedMatch.reason}</p></div>
                  </div>
                  {(selectedMatch.status === '已确认' || selectedMatch.status === '已对接') ? (
                    <div className="info-card">
                      <div className="info-row info-row-vertical">
                        <span className="info-label">对接状态</span>
                        <p className="info-text">已确认对接，等待融资方联系。</p>
                      </div>
                    </div>
                  ) : (
                    <div className="info-card">
                      <div className="info-row"><span className="info-label">联系人</span><span className="info-value" style={{ color: 'var(--text-ter)' }}>确认对接后可见</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}
