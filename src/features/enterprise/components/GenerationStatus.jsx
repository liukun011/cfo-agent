export default function GenerationStatus({
  isPlanGenerating,
  generationPhase,
  generationMessage,
  hasGeneratedPlan,
}) {
  if (!isPlanGenerating && generationPhase !== 'failed') {
    return (
      <div className="generation-status idle">
        <div className="generation-status-title">{hasGeneratedPlan ? '正在加载融资方案' : '尚未生成融资方案'}</div>
        <p>{hasGeneratedPlan ? '正在获取方案明细。' : '当前资料可生成方案，补充更多信息可提升匹配准确度。'}</p>
      </div>
    )
  }

  const steps = [
    { key: 'submitting', label: '准备生成' },
    { key: 'polling', label: '分析资料' },
    { key: 'background', label: '匹配资金方' },
    { key: 'ready', label: '生成完成' },
  ]
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === generationPhase))

  return (
    <div className={`generation-status ${generationPhase}`}>
      <div className="generation-status-head">
        {generationPhase === 'failed' ? <span className="generation-status-mark failed">!</span> : <span className="spinner" />}
        <div>
          <div className="generation-status-title">{generationPhase === 'failed' ? '融资方案生成失败' : '融资方案生成中'}</div>
          <p>{generationMessage || '正在生成融资方案，请稍候。'}</p>
        </div>
      </div>
      {generationPhase !== 'failed' && (
        <div className="generation-steps">
          {steps.map((step, index) => (
            <div key={step.key} className={`generation-step ${index <= activeIndex ? 'active' : ''}`}>
              <span>{index + 1}</span>
              <p>{step.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
