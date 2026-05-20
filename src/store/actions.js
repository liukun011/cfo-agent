export const actions = {
  setRole: payload => ({ type: 'SET_ROLE', payload }),
  logout: () => ({ type: 'LOGOUT' }),
  setLoading: payload => ({ type: 'SET_LOADING', payload }),
  loadEnterprisesFromApi: data => ({ type: 'LOAD_ENTERPRISES_FROM_API', payload: { data } }),
  loadProductsFromApi: (enterpriseId, data) => ({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data } }),
  clearEnterpriseProducts: enterpriseId => ({ type: 'CLEAR_ENTERPRISE_PRODUCTS', payload: enterpriseId }),
  upsertEnterpriseFromApi: payload => ({ type: 'UPSERT_ENTERPRISE_FROM_API', payload }),
  loadInvestorsFromApi: payload => ({ type: 'LOAD_INVESTORS_FROM_API', payload }),
  loadCurrentInvestorFromApi: payload => ({ type: 'LOAD_CURRENT_INVESTOR_FROM_API', payload }),
  clearCapitalPortalData: () => ({ type: 'CLEAR_CAPITAL_PORTAL_DATA' }),
  loadCapitalOpportunitiesFromApi: payload => ({ type: 'LOAD_CAPITAL_OPPORTUNITIES_FROM_API', payload }),
  loadQuestionsFromApi: payload => ({ type: 'LOAD_QUESTIONS_FROM_API', payload }),
}

