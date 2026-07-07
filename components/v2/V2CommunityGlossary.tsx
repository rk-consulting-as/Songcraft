'use client'

import { communityGlossary } from '@/lib/v2/communityExplainer'

export default function V2CommunityGlossary() {
  return (
    <div className="v2-glossary">
      <h4 className="v2-glossary__title">What does this mean?</h4>
      <dl className="v2-glossary__list">
        {communityGlossary.map((item) => (
          <div key={item.term} className="v2-glossary__item">
            <dt>{item.term}</dt>
            <dd className="v2-meta">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
