import ProductCard from './ProductCard'

export default function ProductMatchList({
  products,
  expandedProduct,
  expandedInvestorReasons,
  contactSubmittingKey,
  resolutionMatchingKey,
  statusColors,
  canInitiateContact,
  getInvestorStatusText,
  getInitiateContactLabel,
  onToggleProduct,
  onToggleInvestorReason,
  onInitiateContact,
  onMatchInvestors,
}) {
  return (
    <div className="product-list">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          isExpanded={expandedProduct === product.id}
          expandedInvestorReasons={expandedInvestorReasons}
          contactSubmittingKey={contactSubmittingKey}
          isMatchingInvestors={resolutionMatchingKey === product.id}
          statusColors={statusColors}
          canInitiateContact={canInitiateContact}
          getInvestorStatusText={getInvestorStatusText}
          getInitiateContactLabel={getInitiateContactLabel}
          onToggleExpanded={() => onToggleProduct(expandedProduct === product.id ? null : product.id)}
          onToggleInvestorReason={onToggleInvestorReason}
          onInitiateContact={onInitiateContact}
          onMatchInvestors={() => onMatchInvestors(product)}
        />
      ))}
    </div>
  )
}
