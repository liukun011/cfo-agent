import { createContext, useContext, useReducer } from 'react'
import {
  mapAnalysisToProducts,
  mapEnterpriseVO,
  mapInvestorVO,
  mapOpportunitiesToStatistics,
  mapOpportunityToCapitalRequest,
  mapQuestionVO,
} from '../data/mappers'

const AppContext = createContext()

export const initialState = {
  enterprises: [],
  enterpriseProducts: {},
  capitalRequests: [],
  capitalPartners: [],
  questions: [],
  questionStatus: 'idle',
  questionError: '',
  currentInvestor: null,
  statistics: { matchedCount: 0, contactExchangedCount: 0, recentMatches: [] },
  currentRole: null,
  loading: false,
  useApi: false,
  apiEnterpriseMap: {}, // API loaded enterprise index
  enterpriseTaskHistory: {},
  capitalOpportunityErrors: [],
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.payload }
    case 'LOGOUT':
      return { ...initialState }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_QUESTIONS_LOADING':
      return { ...state, questionStatus: action.payload ? 'loading' : state.questionStatus === 'loading' ? 'idle' : state.questionStatus }
    case 'SET_QUESTIONS_ERROR':
      return { ...state, questionError: action.payload || '', questionStatus: action.payload ? 'error' : (state.questionStatus === 'error' ? 'idle' : state.questionStatus) }

    // === API 数据加载 ===
    case 'LOAD_ENTERPRISES_FROM_API': {
      const { data } = action.payload
      const apiEnterprises = data.map(mapEnterpriseVO)
      const apiMap = {}
      apiEnterprises.forEach(e => { apiMap[e.id] = e })
      return { ...state, enterprises: apiEnterprises, useApi: true, apiEnterpriseMap: apiMap }
    }

    case 'LOAD_PRODUCTS_FROM_API': {
      const { enterpriseId, data } = action.payload
      const products = mapAnalysisToProducts(data)
      const id = Number(enterpriseId) || enterpriseId
      return {
        ...state,
        enterpriseProducts: { ...state.enterpriseProducts, [id]: products },
      }
    }

    case 'CLEAR_ENTERPRISE_PRODUCTS': {
      const id = Number(action.payload) || action.payload
      const products = { ...state.enterpriseProducts }
      delete products[id]
      return { ...state, enterpriseProducts: products }
    }

    case 'LOAD_TASKS_FROM_API': {
      const { enterpriseId, data } = action.payload
      const id = Number(enterpriseId) || enterpriseId
      const records = Array.isArray(data?.records) ? data.records : []
      return {
        ...state,
        enterpriseTaskHistory: {
          ...state.enterpriseTaskHistory,
          [id]: records,
        },
      }
    }

    case 'UPSERT_ENTERPRISE_FROM_API': {
      const enterprise = mapEnterpriseVO(action.payload)
      const exists = state.enterprises.some(e => e.id === enterprise.id)
      const enterprises = exists
        ? state.enterprises.map(e => e.id === enterprise.id ? { ...e, ...enterprise } : e)
        : [enterprise, ...state.enterprises]
      return {
        ...state,
        enterprises,
        useApi: true,
        apiEnterpriseMap: { ...state.apiEnterpriseMap, [enterprise.id]: enterprise },
      }
    }

    case 'LOAD_INVESTORS_FROM_API': {
      const partners = (action.payload || []).map(mapInvestorVO)
      return {
        ...state,
        capitalPartners: partners,
        currentInvestor: partners.length === 0 ? null : state.currentInvestor,
      }
    }

    case 'LOAD_CURRENT_INVESTOR_FROM_API': {
      return { ...state, currentInvestor: action.payload ? mapInvestorVO(action.payload) : null }
    }

    case 'CLEAR_CAPITAL_PORTAL_DATA': {
      return {
        ...state,
        currentInvestor: null,
        capitalPartners: [],
        capitalRequests: [],
        statistics: initialState.statistics,
        capitalOpportunityErrors: [],
      }
    }

    case 'UPDATE_CURRENT_INVESTOR_FIELDS': {
      if (!state.currentInvestor) return state
      const currentInvestor = mapInvestorVO({ ...state.currentInvestor.raw, investmentField: action.payload })
      const capitalPartners = state.capitalPartners.map(partner => (
        partner.id === currentInvestor.id ? currentInvestor : partner
      ))
      return { ...state, currentInvestor, capitalPartners }
    }

    case 'LOAD_CAPITAL_OPPORTUNITIES_FROM_API': {
      const opportunities = action.payload || []
      return {
        ...state,
        capitalRequests: opportunities.map(mapOpportunityToCapitalRequest),
        statistics: mapOpportunitiesToStatistics(opportunities),
      }
    }

    case 'SET_CAPITAL_OPPORTUNITY_ERRORS': {
      return { ...state, capitalOpportunityErrors: action.payload || [] }
    }

    case 'LOAD_QUESTIONS_FROM_API': {
      const records = Array.isArray(action.payload?.records) ? action.payload.records : action.payload || []
      const questions = records
        .map(mapQuestionVO)
        .filter(q => q.id && q.questionName && q.text)
        .sort((a, b) => Number(a.rawSortOrder ?? a.sort ?? 0) - Number(b.rawSortOrder ?? b.sort ?? 0))
        .map((question, index) => ({
          ...question,
          sortOrder: index + 1,
          sort: index + 1,
        }))
      return { ...state, questions, questionStatus: 'success', questionError: '' }
    }

    // === 已成功提交后，同步当前页面状态 ===
    case 'INITIATE_CONTACT': {
      const { enterpriseId, productId, investorId } = action.payload
      const products = { ...state.enterpriseProducts }
      const ep = products[enterpriseId]
      if (!ep) return state
      const updated = ep.map(p =>
        p.id !== productId ? p : {
          ...p,
          matchedInvestors: p.matchedInvestors.map(i =>
            i.id === investorId ? { ...i, status: '待确认', contactViewStatus: 'PENDING_PLATFORM_REVIEW' } : i
          ),
        }
      )
      return { ...state, enterpriseProducts: { ...products, [enterpriseId]: updated } }
    }

    case 'REJECT_PUSH': {
      const { enterpriseId, productId, investorId } = action.payload
      const products = { ...state.enterpriseProducts }
      const ep = products[enterpriseId]
      if (!ep) return state
      const updated = ep.map(p =>
        p.id !== productId ? p : {
          ...p,
          matchedInvestors: p.matchedInvestors.map(i =>
            i.id === investorId ? { ...i, status: '暂不推送', contactViewStatus: 'PLATFORM_REJECTED' } : i
          ),
        }
      )
      return { ...state, enterpriseProducts: { ...products, [enterpriseId]: updated } }
    }

    case 'APPROVE_PUSH': {
      const { enterpriseId, productId, investorId } = action.payload
      const products = { ...state.enterpriseProducts }
      const ep = products[enterpriseId]
      if (!ep) return state
      const updated = ep.map(p => {
        if (p.id !== productId) return p
        return {
          ...p,
          matchedInvestors: p.matchedInvestors.map(i => {
            if (i.id === investorId) {
              return { ...i, status: '已确认', contactViewStatus: 'APPROVED' }
            }
            return i
          }),
        }
      })
      const enterprises = state.enterprises.map(e =>
        e.id === enterpriseId ? { ...e, status: '已完成' } : e
      )
      return { ...state, enterprises, enterpriseProducts: { ...products, [enterpriseId]: updated } }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
