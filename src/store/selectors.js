export function selectEnterpriseProducts(state, enterpriseId) {
  if (!enterpriseId) return []
  return state.enterpriseProducts[enterpriseId]
    || state.enterpriseProducts[Number(enterpriseId)]
    || state.enterpriseProducts[String(enterpriseId)]
    || []
}

export function selectCurrentInvestor(state) {
  return state.currentInvestor
}

export function selectVisibleCapitalRequests(state) {
  return (state.capitalRequests || []).filter(req => req.status === '待确认' || req.status === '已确认')
}

